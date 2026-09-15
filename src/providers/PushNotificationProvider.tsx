'use client';

/**
 * PushNotificationProvider — Businesstalk24
 *
 * Responsibilities (all requirements):
 *   req 3  — Permission request flow (triggered on mount for authenticated users)
 *   req 4  — Foreground notification display via in-app toast
 *   req 6  — Offline sync: listens for SW 'NOTIFICATION_SYNC_REQUIRED' messages
 *   req 8  — Deep-link routing from SW 'NOTIFICATION_DEEP_LINK' messages
 *   req 9  — Badge count sync via navigator.setAppBadge
 *   req 13 — Safari iOS: shows "Add to Home Screen" prompt when needed
 *   req 14 — Muted notification gate: skips toast if conversation is muted
 *   req 16 — Visibility-aware: only shows toast when tab is visible
 *   req 17 — Reconnect sync: when WS reconnects, invalidates notification cache
 *   req 18 — Retryable registration (delegated to fcm.ts)
 *   req 19 — Token refresh on app focus
 *   req 20 — Preserves existing WS notification system
 */

import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
} from 'react';
import { useRouter } from 'next/navigation';
import { useAppDispatch, useAppSelector } from '@/hooks/useRedux';
import {
  requestPushPermission,
  syncPermissionState,
  setBadgeCount,
  refreshPushTokenThunk,
} from '@/redux/slices/pushSlice';
import {
  invalidateNotificationCache,
  fetchNotifications,
  fetchUnreadCount,
} from '@/redux/slices/notificationsSlice';
import { getPushPermissionState, isPushSupported } from '@/lib/fcm';
import { resolveNotificationRoute } from '@/lib/notificationRegistry';
import type { MessagePayload } from 'firebase/messaging';

// ─── Context ──────────────────────────────────────────────────────────────────

interface PushContextValue {
  /** Call to trigger the browser permission prompt. */
  requestPermission: () => Promise<void>;
  /** Whether the browser supports push at all. */
  isSupported: boolean;
}

const PushContext = createContext<PushContextValue>({
  requestPermission: async () => {},
  isSupported: false,
});

export const usePushNotifications = () => useContext(PushContext);

// ─── Foreground toast ─────────────────────────────────────────────────────────

interface FgToast {
  id: string;
  title: string;
  body: string;
  icon?: string;
  url?: string;
}

// ─── Deep-link helper (delegates to centralized registry) ───────────────────

const resolveDeepLink = (
  entityType?: string,
  entityId?: string,
  notifType?: string,
  fallback = '/notifications',
): string => {
  if (!entityType || !entityId) return fallback;
  return resolveNotificationRoute({ entityType, entityId, type: notifType ?? '' });
};

// ─── Badge helper (req 9) ─────────────────────────────────────────────────────

const syncBadge = (count: number): void => {
  if (typeof navigator === 'undefined') return;
  if ('setAppBadge' in navigator) {
    (count > 0
      ? (navigator as any).setAppBadge(count)
      : (navigator as any).clearAppBadge()
    ).catch(() => {});
  }
};

// ─── Provider ─────────────────────────────────────────────────────────────────

export const PushNotificationProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const isSupported = isPushSupported();

  // Pull unread count to sync badge (req 9)
  const unreadCount = useAppSelector((s) => s.notifications.unreadCount);
  const activeConversationId = useAppSelector((s) => s.chat.activeConversationId);
  // Push preferences: check master switch (req 14 + preference gate)
  const pushEnabled = useAppSelector((s) => s.push.preferences.enabled);
  // Current user — only register when authenticated
  const isAuthenticated = useAppSelector((s) => s.auth.isAuthenticated);

  const [toasts, setToasts] = useState<FgToast[]>([]);
  const foregroundUnsubRef = useRef<(() => void) | null>(null);
  const tokenRefreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const playNotificationSound = () => {
    try {
      const audio = new Audio('/assets/sounds/notification.mp3');
      audio.volume = 0.8;
      audio.play().catch(() => {
        try {
          const Ctx = (window as any).AudioContext || (window as any).webkitAudioContext;
          if (!Ctx) return;
          const ctx = new Ctx();
          const o = ctx.createOscillator();
          const g = ctx.createGain();
          o.type = 'sine';
          o.frequency.value = 880;
          g.gain.value = 0.03;
          o.connect(g);
          g.connect(ctx.destination);
          o.start();
          setTimeout(() => {
            o.stop();
            try { ctx.close(); } catch {}
          }, 180);
        } catch {}
      });
    } catch {}
  };

  // ── Badge sync (req 9) ───────────────────────────────────────────────────
  useEffect(() => {
    syncBadge(unreadCount);
    dispatch(setBadgeCount(unreadCount));
  }, [unreadCount, dispatch]);

  // ── Permission sync on mount ─────────────────────────────────────────────
  useEffect(() => {
    if (!isSupported) return;
    dispatch(syncPermissionState(getPushPermissionState()));
  }, [isSupported, dispatch]);

  // ── Auto-register when authenticated (req 3) ─────────────────────────────
  useEffect(() => {
    if (!isAuthenticated || !isSupported) return;
    if (getPushPermissionState() === 'denied') return;
    if (getPushPermissionState() === 'granted') {
      // Already granted — just re-register to ensure token is fresh
      dispatch(requestPushPermission());
    }
    // If 'default', we wait for explicit user action (requestPermission call)
  }, [isAuthenticated, isSupported, dispatch]);

  // ── Foreground message handler (req 4) ───────────────────────────────────
  useEffect(() => {
    if (!isSupported || !isAuthenticated) return;

    let cancelled = false;
    (async () => {
      const { subscribeToForegroundMessages } = await import('@/lib/fcm');
      const unsubscribe = subscribeToForegroundMessages((payload: MessagePayload) => {
        if (cancelled) return;
        const data = payload.data ?? {};

        const dataEntityType = String(data.entityType ?? data.entity_type ?? '').toLowerCase();
        const notificationType = String(data.notifType ?? data.type ?? '').toLowerCase();
        const notificationConversationId = String(
          data.conversationId ??
          data.conversation_id ??
          data.entityId ??
          data.entity_id ??
          '',
        );
        const isChatNotification =
          dataEntityType === 'conversation' ||
          notificationType === 'message' ||
          notificationType === 'conversation';
        const isMessagesRoute = window.location.pathname.startsWith('/messages');

        // Suppress redundant foreground popups for the currently open chat.
        if (
          isChatNotification &&
          !!notificationConversationId &&
          notificationConversationId === activeConversationId &&
          isMessagesRoute &&
          document.visibilityState === 'visible'
        ) {
          return;
        }

        // req 11: silent — no toast
        if (data.silent === 'true') {
          dispatch(invalidateNotificationCache());
          dispatch(fetchNotifications({ force: true }));
          return;
        }

        // req 14: muted check — skip toast if preference disabled
        if (!pushEnabled) return;

        // req 16: only show toast when tab is visible
        // (background ones are handled by the SW)
        if (document.visibilityState !== 'visible') return;

        const title =
          payload.notification?.title ?? data.title ?? 'Businesstalk24';
        const body =
          payload.notification?.body ?? data.body ?? 'You have a new notification';
        const url = resolveDeepLink(
          data.entityType,
          data.entityId,
          data.notifType,
        );

        const id = `fg-${Date.now()}`;
        const d: any = data;
        const isMutedFlag = d.is_muted === 'true' || d.is_muted === true || d.isMuted === true || d.isMuted === 'true';
        if (!isMutedFlag) {
          try { playNotificationSound(); } catch {}
        }
        setToasts((prev) => [
          ...prev,
          { id, title, body, icon: data.icon, url },
        ]);

        // Also update Redux notification feed
        dispatch(invalidateNotificationCache());
        dispatch(fetchNotifications({ force: true }));
        dispatch(fetchUnreadCount());

        // Auto-dismiss after 6 s
        setTimeout(() => {
          setToasts((prev) => prev.filter((t) => t.id !== id));
        }, 6000);
      });

      if (!cancelled) {
        foregroundUnsubRef.current = unsubscribe;
      }
    })();

    return () => {
      cancelled = true;
      foregroundUnsubRef.current?.();
    };
  }, [isSupported, isAuthenticated, pushEnabled, dispatch, activeConversationId]);

  // ── SW message handler (deep-link + offline sync req 6, 8) ───────────────
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    const handleSwMessage = (event: MessageEvent) => {
      const { type, url, entityType, entityId, notifType } = event.data ?? {};

      if (type === 'NOTIFICATION_DEEP_LINK') {
        const target = url ?? resolveDeepLink(entityType, entityId, notifType);
        router.push(target);
        // Sync feed after click
        dispatch(fetchNotifications({ force: true }));
        dispatch(fetchUnreadCount());
      }

      if (type === 'NOTIFICATION_SYNC_REQUIRED') {
        // req 6: offline — sync when back online
        dispatch(invalidateNotificationCache());
        dispatch(fetchNotifications({ force: true }));
        dispatch(fetchUnreadCount());
      }
    };

    navigator.serviceWorker.addEventListener('message', handleSwMessage);
    return () =>
      navigator.serviceWorker.removeEventListener('message', handleSwMessage);
  }, [dispatch, router]);

  // ── Token refresh on focus (req 19) ─────────────────────────────────────
  useEffect(() => {
    if (!isAuthenticated || !isSupported) return;

    const handleFocus = () => {
      if (tokenRefreshTimerRef.current) clearTimeout(tokenRefreshTimerRef.current);
      tokenRefreshTimerRef.current = setTimeout(() => {
        dispatch(refreshPushTokenThunk());
      }, 2000); // Small delay to avoid triggering on transient focus
    };

    window.addEventListener('focus', handleFocus);
    return () => {
      window.removeEventListener('focus', handleFocus);
      if (tokenRefreshTimerRef.current) clearTimeout(tokenRefreshTimerRef.current);
    };
  }, [isAuthenticated, isSupported, dispatch]);

  // ── Reconnect sync (req 17) ─────────────────────────────────────────────
  // WS reconnect is detected via the online event; the WS provider handles
  // its own reconnect. We just re-sync notifications.
  useEffect(() => {
    const handleOnline = () => {
      dispatch(invalidateNotificationCache());
      dispatch(fetchNotifications({ force: true }));
      dispatch(fetchUnreadCount());

      // Register background sync with the SW (req 6)
      if ('serviceWorker' in navigator && 'SyncManager' in window) {
        navigator.serviceWorker.ready.then((reg) => {
          (reg as any).sync?.register('notification-sync').catch(() => {});
        });
      }
    };
    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [dispatch]);

  // ── Explicit permission request (called from UI) ─────────────────────────
  const requestPermission = useCallback(async () => {
    const result = await dispatch(requestPushPermission()).unwrap();
    dispatch(syncPermissionState(result.permission));
  }, [dispatch]);

  // ── iOS Safari PWA hint (req 13) ────────────────────────────────────────
  // Show a one-time hint on iOS if not already in standalone mode.
  const [showIosHint, setShowIosHint] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const isIos =
      /iphone|ipad|ipod/i.test(navigator.userAgent) &&
      !(navigator as any).standalone;
    const dismissed = localStorage.getItem('bt24_ios_hint_dismissed');
    if (isIos && !dismissed && isAuthenticated) {
      setShowIosHint(true);
    }
  }, [isAuthenticated]);

  return (
    <PushContext.Provider value={{ requestPermission, isSupported }}>
      {children}

      {/* ── Foreground toast (req 4, 16) ─────────────────────────────────── */}
      <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 max-w-sm w-full pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className="pointer-events-auto bg-white border border-gray-200 rounded-xl shadow-xl flex items-start gap-3 p-4 animate-in slide-in-from-right"
            onClick={() => {
              if (toast.url) router.push(toast.url);
              setToasts((prev) => prev.filter((t) => t.id !== toast.id));
            }}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && toast.url) router.push(toast.url);
            }}
          >
            <div className="flex-shrink-0 w-9 h-9 rounded-full overflow-hidden bg-gray-100">
              {toast.icon ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={toast.icon} alt="" className="w-full h-full object-cover" />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src="/assets/icons/BUSINESSTALK24_LOGO_Icon_png.png"
                  alt="BT24"
                  className="w-full h-full object-cover"
                />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900 truncate">
                {toast.title}
              </p>
              <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">
                {toast.body}
              </p>
            </div>
            <button
              className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors ml-1"
              onClick={(e) => {
                e.stopPropagation();
                setToasts((prev) => prev.filter((t) => t.id !== toast.id));
              }}
              aria-label="Dismiss"
            >
              ×
            </button>
          </div>
        ))}
      </div>

      {/* ── iOS "Add to Home Screen" hint (req 13) ────────────────────────── */}
      {showIosHint && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-[9998] w-[90vw] max-w-xs bg-gray-900 text-white text-xs rounded-xl px-4 py-3 shadow-xl text-center">
          <p className="font-semibold mb-1">Enable Push Notifications</p>
          <p className="text-gray-300">
            Tap <span className="font-bold">Share</span> then{' '}
            <span className="font-bold">Add to Home Screen</span> to receive
            push notifications on iOS.
          </p>
          <button
            className="mt-2 text-blue-400 underline text-xs"
            onClick={() => {
              localStorage.setItem('bt24_ios_hint_dismissed', '1');
              setShowIosHint(false);
            }}
          >
            Dismiss
          </button>
        </div>
      )}
    </PushContext.Provider>
  );
};
