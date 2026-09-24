import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import WebSocketManager, { NOTIFICATIONS_NAMESPACE } from '@/lib/websocket';
import { store } from '@/redux/store';
import {
  wsMessageReceived,
  wsTypingReceived,
  clearTypingUser,
  wsUserOnline,
  wsUserOffline,
  setOnlineUsers,
  fetchPresence,
  fetchConversations,
} from '@/redux/slices/chatSlice';
import { registerWsManager } from '@/redux/middleware/websocketMiddleware';
import {
  insertMessageIntoCache,
  messagesQueryKey,
  replaceOptimisticInCache,
  updateMessageInCache,
  deleteMessageFromCache,
} from '@/hooks/useInfiniteMessages';
import { CHAT_EVENTS } from '@/lib/chat/events';
import { normalizeMessage } from '@/lib/chat/normalizeMessage';
import {
  parseWsMessagePayload,
  parseWsPresencePayload,
  parseWsPresenceSyncPayload,
  parseWsTypingPayload,
} from '@/lib/chat/websocketPayloads';
import {
  wsNotificationReceived,
  parseApiNotification,
  fetchNotifications,
  fetchUnreadCount,
  invalidateNotificationCache,
  // notificationAcknowledged,
} from '@/redux/slices/notificationsSlice';
import { useAppSelector } from '@/hooks/useRedux';

interface WebSocketContextValue {
  wsManager: WebSocketManager | null;
  notificationManager: WebSocketManager | null;
  isConnected: boolean;
  isChatConnected: boolean;
  isNotificationConnected: boolean;
  acknowledgeNotification?: (
    notificationId: string | number,
  ) => void;
}

const WebSocketContext = createContext<WebSocketContextValue>({
  wsManager: null,
  notificationManager: null,
  isConnected: false,
  isChatConnected: false,
  isNotificationConnected: false,
});

export const useWebSocket = () => useContext(WebSocketContext);

/**
 * Hook to manually acknowledge a notification on the /v1/notifications namespace.
 * Use this when you need to acknowledge notifications at a custom time (e.g., after user action).
 */
export const useNotificationAck = () => {
  const context = useContext(WebSocketContext);
  
  return {
    acknowledgeNotification: (notificationId: string | number) => {
      context.acknowledgeNotification?.(notificationId);
    },
  };
};

export const WebSocketProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const MESSAGE_DEDUPE_TTL_MS = 45_000;

  const wsManagerRef = useRef<WebSocketManager | null>(null);
  const notificationWsRef = useRef<WebSocketManager | null>(null);
  const disconnectStartedAtRef = useRef<number | null>(null);
  const hasConnectedRef = useRef(false);
  const recentMessageKeysRef = useRef<Set<string>>(new Set());
  const recentMessageKeyTsRef = useRef<Map<string, number>>(new Map());
  const [chatConnected, setChatConnected] = useState(false);
  const [notificationConnected, setNotificationConnected] =
    useState(false);
    const isConnected =
  chatConnected && notificationConnected;
  // React Query client — available because WebSocketProvider is inside QueryClientProvider
  const queryClient = useQueryClient();
  const authUser = useAppSelector((state) => state.auth.user as any);
  const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated);
  const isRestricted = useAppSelector((state) => state.auth.isRestricted);
  const authLoading = useAppSelector((state) => state.auth.isLoading);

  const userId = String(
    authUser?.id ?? authUser?.user_id ?? authUser?.userId ?? '',
  );
  const authReady = !authLoading;
  const canConnect = authReady && isAuthenticated && !isRestricted && !!userId;

  const purgeExpiredMessageKeys = () => {
    const now = Date.now();
    for (const [key, ts] of recentMessageKeyTsRef.current.entries()) {
      if (now - ts > MESSAGE_DEDUPE_TTL_MS) {
        recentMessageKeyTsRef.current.delete(key);
        recentMessageKeysRef.current.delete(key);
      }
    }
  };

  const markMessageKeySeen = (key: string) => {
    recentMessageKeysRef.current.add(key);
    recentMessageKeyTsRef.current.set(key, Date.now());
  };

  const hasRecentlySeenMessageKey = (key: string): boolean => {
    purgeExpiredMessageKeys();
    return recentMessageKeysRef.current.has(key);
  };

  const hasRecentMessageInConversation = (conversationId: string): boolean => {
    if (!conversationId) return false;
    purgeExpiredMessageKeys();
    const prefix = `${conversationId}:`;
    for (const key of recentMessageKeysRef.current.values()) {
      if (key.startsWith(prefix)) return true;
    }
    return false;
  };

  const isMessageAlreadyCached = (
    conversationId: string,
    messageId: string,
  ): boolean => {
    if (!conversationId || !messageId) return false;
    const cached = queryClient.getQueryData<any>(messagesQueryKey(conversationId));
    if (!cached || !Array.isArray(cached.pages)) return false;
    return cached.pages.some((page: any) =>
      Array.isArray(page?.messages) &&
      page.messages.some((m: any) => String(m?.id ?? '') === messageId),
    );
  };

  const hasTempMessageInCache = (conversationId: string, tempId: string): boolean => {
    if (!conversationId || !tempId) return false;
    const cached = queryClient.getQueryData<any>(messagesQueryKey(conversationId));
    if (!cached || !Array.isArray(cached.pages)) return false;
    return cached.pages.some((page: any) =>
      Array.isArray(page?.messages) &&
      page.messages.some((m: any) => String(m?.id ?? '') === tempId),
    );
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (!canConnect) {
      if (process.env.NODE_ENV === 'development') {
        console.log('[chat-realtime] socket waiting for auth', {
          authReady,
          isAuthenticated,
          isRestricted,
          hasUserId: Boolean(userId),
          note: 'Waiting for auth state to be ready before sending credentials',
        });
      }
      return;
    }

    if (process.env.NODE_ENV === 'development') {
      console.log('[chat-realtime] auth ready, connecting socket with credentials', {
        authReady: true,
        isAuthenticated: true,
        userId: userId ? userId.substring(0, 8) : 'unknown',
        credentialsReady: true, // ✅ withCredentials: true will be sent
      });
    }

    const ws = new WebSocketManager();
    const notificationWs = new WebSocketManager(NOTIFICATIONS_NAMESPACE);
    const unsubscribers: Array<() => void> = [];

    // ── Connection state ─────────────────────────────────────────────────────
    unsubscribers.push(ws.on('connect', () => {
      setChatConnected(true);
      registerWsManager(ws);

      const wasConnectedBefore = hasConnectedRef.current;
      hasConnectedRef.current = true;

      const disconnectedForMs = disconnectStartedAtRef.current
        ? Date.now() - disconnectStartedAtRef.current
        : 0;
      disconnectStartedAtRef.current = null;

      // Bonus stabilization: avoid aggressive refetch/invalidation storms.
      // Refresh conversations on first connect, or after significant downtime.
      const shouldRefreshConversations =
        !wasConnectedBefore || disconnectedForMs >= 30_000;

      if (shouldRefreshConversations) {
        store.dispatch(fetchConversations());
      }
      // Always fetch latest presence on connect / reconnect
      store.dispatch(fetchPresence());

      if (process.env.NODE_ENV === 'development') {
        console.log('[chat-realtime] socket connected', {
          wasConnectedBefore,
          disconnectedForMs,
          shouldRefreshConversations,
        });
      }
    }));

    unsubscribers.push(ws.on('disconnect', () => {
      setChatConnected(false);
      registerWsManager(null);
      disconnectStartedAtRef.current = Date.now();

      if (process.env.NODE_ENV === 'development') {
        console.log('[chat-realtime] socket disconnected');
      }
    }));

    unsubscribers.push(ws.on('reconnect_attempt', (data: any) => {
      if (process.env.NODE_ENV === 'development') {
        console.log('[chat-realtime] reconnect_attempt', {
          attempt: data?.attempt,
          namespace: data?.namespace,
          canConnect,
        });
      }
    }));

    unsubscribers.push(ws.on('reconnect', (data: any) => {
      if (process.env.NODE_ENV === 'development') {
        console.log('[chat-realtime] reconnect success', {
          attempt: data?.attempt,
          namespace: data?.namespace,
        });
      }
    }));

    unsubscribers.push(ws.on('connect_error', (data: any) => {
      if (process.env.NODE_ENV === 'development') {
        console.log('[chat-realtime] connect_error', {
          message: data?.message,
          canConnect,
        });
      }
    }));

    unsubscribers.push(notificationWs.on('connect', () => {
      setNotificationConnected(true);
      if (process.env.NODE_ENV === 'development') {
        console.log('[notification-realtime] socket connected', {
          namespace: NOTIFICATIONS_NAMESPACE,
          userId: userId.substring(0, 8),
        });
      }
    }));

    unsubscribers.push(notificationWs.on('disconnect', (reason: any) => {
      setNotificationConnected(false);
      if (process.env.NODE_ENV === 'development') {
        if (reason === 'io server disconnect') {
          console.error('[notification-realtime] ❌ SERVER REJECTED CONNECTION (During Handshake)', {
            reason,
            namespace: NOTIFICATIONS_NAMESPACE,
            hint: 'Backend middleware likely rejected during JWT validation. Check: 1) access_token cookie valid? 2) Backend auth middleware logs? 3) CORS origins allowed?',
          });
        } else {
          console.log('[notification-realtime] socket disconnected', {
            reason,
            namespace: NOTIFICATIONS_NAMESPACE,
          });
        }
      }
    }));

    unsubscribers.push(notificationWs.on('connect_error', (data: any) => {
      if (process.env.NODE_ENV === 'development') {
        const errorData = {
          message: data?.message,
          namespace: NOTIFICATIONS_NAMESPACE,
        };
        
        if (data?.message?.includes('UNAUTHORIZED')) {
          console.error('[notification-realtime] AUTH FAILED: UNAUTHORIZED', errorData);
        } else if (data?.message?.includes('TOKEN_EXPIRED')) {
          console.error('[notification-realtime] AUTH FAILED: TOKEN_EXPIRED', errorData);
        } else if (data?.message?.includes('BANNED')) {
          console.error('[notification-realtime] AUTH FAILED: BANNED', errorData);
        } else if (data?.message?.includes('CORS') || data?.message?.includes('403')) {
          console.error('[notification-realtime] CORS or HANDSHAKE FAILURE', errorData);
        } else {
          console.log('[notification-realtime] connect_error', errorData);
        }
      }
    }));


    unsubscribers.push(
        notificationWs.on('reconnect', () => {
          if (process.env.NODE_ENV === 'development') {
            console.log(
              '[notification-realtime] reconnect sync',
            );
          }

          store.dispatch(invalidateNotificationCache());

          store.dispatch(
            fetchNotifications({
              force: true,
            }),
          );

          store.dispatch(fetchUnreadCount());
        }),
      );

    unsubscribers.push(notificationWs.on('notification', (data: any) => {
      const notification = parseApiNotification(data);
      store.dispatch(
        wsNotificationReceived(notification),
      );

      store.dispatch(fetchUnreadCount());
      
      // Send acknowledgment back to server (backend expects notificationAck with notification ID)
      if (notification.id) {
        notificationWs.emit('notificationAck', { notificationId: notification.id });
      }
    }));

    unsubscribers.push(notificationWs.on('pendingNotifications', (data: any) => {
      const items: any[] = Array.isArray(data) ? data : data?.notifications ?? [];
      if (!Array.isArray(items)) return;
      for (const item of items) {
        const notification = parseApiNotification(item);
        store.dispatch(wsNotificationReceived(notification));
        
        // Acknowledge each pending notification
        if (notification.id) {
          notificationWs.emit('notificationAck', { notificationId: notification.id });
        }
      }

      store.dispatch(invalidateNotificationCache());

      store.dispatch(
        fetchNotifications({
          force: true,
        }),
      );

      store.dispatch(fetchUnreadCount());
    }));

    // ── Incoming message → React Query cache + Redux metadata ───────────────
    unsubscribers.push(ws.on(CHAT_EVENTS.MESSAGE_NEW, (data: unknown) => {
      const payload = parseWsMessagePayload(data);
      if (!payload) return;
      const message = normalizeMessage(payload);
      const conversationId = message.conversationId;
      const messageId = String(message.id ?? '');
      const dedupeKey = `${conversationId}:${messageId}`;

      if (!conversationId || !messageId) return;

      // Guard 1: short-lived replay guard for dual-path emits and reconnect replays.
      if (hasRecentlySeenMessageKey(dedupeKey)) {
        return;
      }

      // Guard 2: drop duplicates that are already present in the cache.
      if (isMessageAlreadyCached(conversationId, messageId)) {
        markMessageKeySeen(dedupeKey);
        return;
      }

      const incomingTempId = String(
        (payload as any)?.tempId ??
        (payload as any)?.clientTempId ??
        '',
      );
      const shouldReplaceOptimistic =
        !!incomingTempId && hasTempMessageInCache(conversationId, incomingTempId);

      markMessageKeySeen(dedupeKey);

      // 1. Insert into React Query cache (handles display / deduplication)
      //    Only inserts when a cache entry already exists (conversation was opened).
      if (shouldReplaceOptimistic) {
        replaceOptimisticInCache(queryClient, conversationId, incomingTempId, message);
      } else {
        insertMessageIntoCache(queryClient, conversationId, message);
      }

      // 2. Invalidate stale conversations that DON'T have an open cache yet
      //    so new unread messages trigger a refetch when the conversation is opened.
      if (!queryClient.getQueryData(messagesQueryKey(conversationId))) {
        // No cache entry — mark it as needing a fresh fetch next open
        queryClient.invalidateQueries({ queryKey: messagesQueryKey(conversationId) });
      }

      // 3. Update Redux: conversation preview + unread count (sidebar only)
      store.dispatch(
        wsMessageReceived({ conversationId, message, currentUserId: userId }),
      );
    }));

    // ── Message update → React Query cache (delivery/seen/edited) ────────────
    // Part 4: Handle message:update for delivery ticks, seen ticks, edited content
    unsubscribers.push(ws.on(CHAT_EVENTS.MESSAGE_UPDATE, (data: unknown) => {
      if (!data || typeof data !== 'object') return;
      const update = data as any;
      const conversationId = update.conversationId;
      const messageId = update.id;

      if (!conversationId || !messageId) {
        if (process.env.NODE_ENV === 'development') {
          console.warn('[chat-cache] Invalid message:update payload:', data);
        }
        return;
      }

      // Update message in React Query cache without refetch
      // Part 5: Stale-event guards in updateMessageInCache prevent duplicates
      updateMessageInCache(queryClient, conversationId, {
        id: messageId,
        status: update.status,
        text: update.content,
        isDeleted: update.isDeleted,
        updatedAt: update.updatedAt,
      });

      // Part 6: Invalidate conversations for sidebar preview recalculation
      if (update.status || update.isDeleted) {
        queryClient.invalidateQueries({
          queryKey: ['conversations'],
        });
      }

      if (process.env.NODE_ENV === 'development') {
        console.log('[chat-realtime] message:update received:', {
          messageId,
          conversationId,
          status: update.status,
          isDeleted: update.isDeleted,
        });
      }
    }));

    // ── Message delete → React Query cache (soft delete) ───────────────────
    // Part 4: Handle message:delete for deleted messages
    unsubscribers.push(ws.on(CHAT_EVENTS.MESSAGE_DELETE, (data: unknown) => {
      if (!data || typeof data !== 'object') return;
      const deletion = data as any;
      const conversationId = deletion.conversationId;
      const messageId = deletion.id;

      if (!conversationId || !messageId) {
        if (process.env.NODE_ENV === 'development') {
          console.warn('[chat-cache] Invalid message:delete payload:', data);
        }
        return;
      }

      // Soft delete in React Query cache (isDeleted=true, preserve pagination)
      // Part 5: Soft deletion prevents pagination corruption and message loss
      deleteMessageFromCache(queryClient, conversationId, messageId);

      // Part 6: Invalidate conversations for sidebar preview recalculation
      queryClient.invalidateQueries({
        queryKey: ['conversations'],
      });

      if (process.env.NODE_ENV === 'development') {
        console.log('[chat-realtime] message:delete received:', {
          messageId,
          conversationId,
        });
      }
    }));

    // ── Typing indicator → Redux ─────────────────────────────────────────────
    unsubscribers.push(ws.on(CHAT_EVENTS.TYPING_START, (data: unknown) => {
      const payload = parseWsTypingPayload(data);
      if (!payload) return;

      store.dispatch(wsTypingReceived(payload));

      // Auto-clear after 2 s
      setTimeout(() => {
        store.dispatch(clearTypingUser(payload.conversationId));
      }, 2000);
    }));

    unsubscribers.push(ws.on(CHAT_EVENTS.TYPING_STOP, (data: unknown) => {
      const payload = parseWsTypingPayload(data);
      if (!payload) return;
      store.dispatch(clearTypingUser(payload.conversationId));
    }));

    // ── Online/offline presence → Redux ──────────────────────────────────────
    unsubscribers.push(ws.on(CHAT_EVENTS.USER_ONLINE, (data: unknown) => {
      const payload = parseWsPresencePayload(data);
      if (!payload) return;
      store.dispatch(wsUserOnline(payload.userId));
    }));

    unsubscribers.push(ws.on(CHAT_EVENTS.USER_OFFLINE, (data: unknown) => {
      const payload = parseWsPresencePayload(data);
      if (!payload) return;
      store.dispatch(wsUserOffline(payload.userId));
    }));

    unsubscribers.push(ws.on(CHAT_EVENTS.PRESENCE_SYNC, (data: unknown) => {
      const payload = parseWsPresenceSyncPayload(data);
      if (!payload) return;
      store.dispatch(setOnlineUsers(payload.onlineUserIds));
    }));

    // ── Incoming notification → Redux (req 7: no component-level WS listeners) ─
    // parseApiNotification handles both embedded-actor and actor_id-only payloads.
    // NO getUserById calls — actor data must come from the WS payload.
    unsubscribers.push(ws.on('notification', (data: any) => {
      const notification = parseApiNotification(data);

      // Prevent redundant chat notifications when the user is already viewing
      // the active conversation and the message event has already been handled.
      const activeConversationId = store.getState().chat.activeConversationId;
      const notificationType = String(notification.type ?? '').toLowerCase();
      const notificationEntityType = String(notification.entityType ?? '').toLowerCase();
      const notificationConversationId =
        notificationEntityType === 'conversation'
          ? String(notification.entityId ?? '')
          : '';
      const isChatNotification =
        notificationType === 'message' ||
        notificationType === 'conversation' ||
        notificationEntityType === 'conversation';
      const isMessagesRoute =
        typeof window !== 'undefined' &&
        window.location.pathname.startsWith('/messages');
      const isVisible =
        typeof document !== 'undefined' &&
        document.visibilityState === 'visible';
      const hasCacheForConversation =
        !!notificationConversationId &&
        !!queryClient.getQueryData(messagesQueryKey(notificationConversationId));
      const hasRecentMessageForConversation =
        !!notificationConversationId &&
        hasRecentMessageInConversation(notificationConversationId);

      const shouldSuppressNotification =
        isChatNotification &&
        !!notificationConversationId &&
        activeConversationId === notificationConversationId &&
        isMessagesRoute &&
        isVisible &&
        (hasCacheForConversation || hasRecentMessageForConversation);

      if (shouldSuppressNotification) return;

      store.dispatch(
        wsNotificationReceived(notification),
      );

    }));

    // ── Connect with full auth context ─────────────────────────────────────
    if (process.env.NODE_ENV === 'development') {
      // Diagnostic: check for access_token cookie
      const cookies = document.cookie.split(';').map(c => c.trim());
      const hasAccessToken = cookies.some(c => c.startsWith('access_token='));
      const accessTokenCookie = cookies.find(c => c.startsWith('access_token='));
      const tokenLength = accessTokenCookie?.split('=')[1]?.length ?? 0;

      console.log('[WS Provider] Pre-connection diagnostics', {
        userId: userId.substring(0, 8),
        authReady,
        isAuthenticated,
        hasAccessTokenCookie: hasAccessToken,
        accessTokenLength: tokenLength,
        cookieCount: cookies.length,
        cookies: cookies.map(c => {
          const [key] = c.split('=');
          return key;
        }),
        NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL,
      });

      if (!hasAccessToken) {
        console.warn(
          '[WS Provider] Cookie not visible to JavaScript. This is expected for HttpOnly cookies. ' +
          'Backend will not be able to authenticate WebSocket connection. ' +
          'Check: 1) Login completed successfully? 2) Cookies enabled in browser? 3) CORS credentials mode correct?',
        );
      }
    }

    console.log('[WS Provider] Connecting WebSocket', {
      userId: userId.substring(0, 8),
      authMethod: 'withCredentials (cookie-based)',
      NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL,
      canConnect,
    });

    let accessToken: string | undefined;

    try {
      accessToken =
        localStorage.getItem('access_token') ??
        localStorage.getItem('accessToken') ??
        undefined;
    } catch {
      accessToken = undefined;
    }

    ws.connect(accessToken);
    notificationWs.connect(accessToken);

    wsManagerRef.current = ws;
    notificationWsRef.current = notificationWs;

    return () => {
      unsubscribers.forEach((unsubscribe) => unsubscribe());
      ws.disconnect();
      notificationWs.disconnect();
      registerWsManager(null);
      setChatConnected(false);
      setNotificationConnected(false);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryClient, canConnect, authReady, isAuthenticated, isRestricted, userId]);

  return (
    <WebSocketContext.Provider
      value={{
        wsManager: wsManagerRef.current,
        notificationManager:
          notificationWsRef.current,
        isConnected,
        isChatConnected: chatConnected,
        isNotificationConnected:
          notificationConnected,
        acknowledgeNotification: (notificationId: string | number) => {
          if (notificationWsRef.current) {
            notificationWsRef.current.emit('notificationAck', { notificationId });
            if (process.env.NODE_ENV === 'development') {
              console.log('[notification-realtime] sent acknowledgment', { notificationId });
            }
          }
        },
      }}
    >
      {children}
    </WebSocketContext.Provider>
  );
};
