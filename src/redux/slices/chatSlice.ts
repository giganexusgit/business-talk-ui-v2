import {
  createSlice,
  createAsyncThunk,
  type PayloadAction,
} from '@reduxjs/toolkit';
import apiClient from '@/lib/api-client';
import { isRawMessageContract, normalizeMessage } from '@/lib/chat/normalizeMessage';
import type {
  ChatState,
  ConversationEntity,
  ConversationMessagesState,
  MessageEntity,
} from '@/types/chat';
import { markConversationReadServer } from '@/redux/thunks/chatThunks';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const emptyConvMessages = (): ConversationMessagesState => ({
  ids: [],
  entities: {},
  hasMore: true,
  loading: false,
  unreadCount: 0,
});

/**
 * Inserts a message only if its ID is not already present.
 * Used for Redux-held optimistic/pending messages only.
 */
const upsertMessageInto = (
  convState: ConversationMessagesState,
  message: MessageEntity,
): void => {
  if (convState.entities[message.id]) {
    convState.entities[message.id] = { ...convState.entities[message.id], ...message };
  } else {
    convState.ids.push(message.id);
    convState.entities[message.id] = message;
  }
};

const getConversationPreviewText = (message: MessageEntity): string => {
  if (message.isDeleted) return 'This message was deleted';
  if (message.text.trim().length > 0) return message.text;
  if (message.messageType === 'blog') {
    return message.preview?.title || 'Shared a blog';
  }
  if (message.messageType === 'post') {
    return message.preview?.title || 'Shared a post';
  }
  return 'New message';
};

const normalizeId = (value: unknown): string => String(value ?? '').trim().toLowerCase();

// ─── Async Thunks ─────────────────────────────────────────────────────────────
// NOTE: fetchMessages has been removed — React Query (useInfiniteMessages) owns
// all historical + real-time message fetching and caching.

export const fetchConversations = createAsyncThunk(
  'chat/fetchConversations',
  async (_: void, { rejectWithValue, getState }) => {
    try {
      const res = await apiClient.getConversations();
      const rows: any[] = Array.isArray(res.data)
        ? res.data
        : (res.data?.data ?? []);

      const state = getState() as { auth?: { user?: { id?: string } } };
      const currentUserId = String(state.auth?.user?.id ?? '');

      const conversations: ConversationEntity[] = rows.map((c: any) => {
        const conv = c.conversation ?? c;
        const isGroup: boolean = conv.isGroup === true;

        const participants: any[] = Array.isArray(conv.participants)
          ? conv.participants
          : [];
        const displayUser =
          conv.displayUser ??
          (!isGroup
            ? participants.find((p) => String(p?.id ?? '') !== currentUserId) ?? participants[0] ?? null
            : null);
        const dmName: string =
          conv.displayName ||
          displayUser?.fullName ||
          displayUser?.username ||
          'Unknown';

        const name: string = isGroup
          ? (conv.displayName || conv.title || 'Group')
          : dmName;

        const avatar: string =
          conv.displayAvatar ||
          displayUser?.profilePhoto ||
          `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}`;

        const participantId: string | undefined = !isGroup
          ? String(displayUser?.id ?? '') || undefined
          : undefined;

        // Issue 3: Handle lastMessage as MessageResponseDto object
        let lastMessageText: string = '';
        if (typeof conv.lastMessage === 'string') {
          // Legacy string format (backward compatibility)
          lastMessageText = conv.lastMessage;
        } else if (conv.lastMessage && typeof conv.lastMessage === 'object') {
          // New MessageResponseDto format
          const lastMsg = conv.lastMessage as any;
          if (lastMsg.isDeleted) {
            lastMessageText = 'This message was deleted';
          } else if (lastMsg.content && lastMsg.content.trim()) {
            lastMessageText = lastMsg.content;
          } else if (lastMsg.messageType === 'blog' && lastMsg.preview?.title) {
            lastMessageText = lastMsg.preview.title;
          } else if (lastMsg.messageType === 'post' && lastMsg.preview?.title) {
            lastMessageText = lastMsg.preview.title;
          } else if (lastMsg.attachments && lastMsg.attachments.length > 0) {
            lastMessageText = '[Attachment]';
          } else {
            lastMessageText = 'New message';
          }
        }

        const lastMessageAtRaw = Number(conv.lastMessageAt ?? 0);
        const lastMessageAt: number = Number.isFinite(lastMessageAtRaw)
          ? lastMessageAtRaw
          : 0;

        const unreadRaw = Number(conv.unreadCount ?? 0);
        const unread: number = Number.isFinite(unreadRaw) ? unreadRaw : 0;

        const participantsCountRaw = Number(conv.participantsCount ?? 0);
        const participantsCount: number = Number.isFinite(participantsCountRaw)
          ? participantsCountRaw
          : 0;

        return {
          id: conv.id as string,
          name: name || 'Unknown',
          avatar,
          lastMessage: lastMessageText,
          lastMessageAt,
          unread,
          online: false,
          isGroup,
          members: participantsCount,
          participantId,
          muted: false,
          archived: false,
          pinned: false,
        };
      });

      return conversations;
    } catch (err: any) {
      return rejectWithValue(
        err.response?.data?.message ?? 'Failed to fetch conversations',
      );
    }
  },
);

/**
 * Mark a conversation as read on the server. This thunk does not revert
 * the optimistic local unread clear; it reports failures for diagnostics
 * and can trigger a refresh to reconcile state if desired.
 */
// thunk moved to src/redux/thunks/chatThunks.ts

export const sendMessage = createAsyncThunk(
  'chat/sendMessage',
  async (
    {
      conversationId,
      content,
      tempId,
      file,
      onUploadProgress,
    }: {
      conversationId: string;
      content: string;
      tempId: string;
      file?: File;
      onUploadProgress?: (progress: number) => void;
    },
    { rejectWithValue },
  ) => {
    try {
      let res: any;
      if (file) {
        res = await apiClient.sendMessageWithAttachment(
          conversationId,
          content,
          file,
          {
            onUploadProgress: (event: any) => {
              if (event.total && onUploadProgress) {
                const percent = Math.round((event.loaded * 100) / event.total);
                onUploadProgress(percent);
              }
            },
          },
        );
      } else {
        res = await apiClient.sendMessage(conversationId, content);
      }

      if (!isRawMessageContract(res.data)) {
        return rejectWithValue({
          tempId,
          error: 'Invalid sendMessage payload contract',
        });
      }

      const message: MessageEntity = {
        ...normalizeMessage(res.data),
        tempId,
      };

      return { tempId, message };
    } catch (err: any) {
      return rejectWithValue({
        tempId,
        error: err.response?.data?.message ?? 'Failed to send message',
      });
    }
  },
);

// ─── Initial state ─────────────────────────────────────────────────────────────

const initialState: ChatState = {
  conversations: {
    byId: {},
    allIds: [],
    loading: false,
    error: null,
  },
  messages: {
    byConversation: {},
  },
  activeConversationId: null,
  typingUsers: {},
  onlineUsers: [],
};

// ─── Slice ─────────────────────────────────────────────────────────────────────

const chatSlice = createSlice({
  name: 'chat',
  initialState,
  reducers: {
    // ── Navigation ────────────────────────────────────────────────────────────
    setActiveConversation(state, action: PayloadAction<string | null>) {
      state.activeConversationId = action.payload;
      if (action.payload && state.conversations.byId[action.payload]) {
        state.conversations.byId[action.payload].unread = 0;
      }
      // Retain only pending/failed optimistic messages when switching conversations
      if (action.payload && state.messages.byConversation[action.payload]) {
        const stale = state.messages.byConversation[action.payload];
        const pendingIds = stale.ids.filter(
          (id) =>
            stale.entities[id]?.status === 'pending' ||
            stale.entities[id]?.status === 'failed',
        );
        stale.ids = pendingIds;
        const pendingEntities: Record<string, MessageEntity> = {};
        for (const id of pendingIds) {
          if (stale.entities[id]) pendingEntities[id] = stale.entities[id];
        }
        stale.entities = pendingEntities;
      }
    },

    // ── Incoming WebSocket events ─────────────────────────────────────────────
    // Real-time display is handled by React Query cache (WebSocketProvider injects there).
    // This reducer ONLY updates conversation sidebar metadata: preview + unread count.
    wsMessageReceived(
      state,
      action: PayloadAction<{
        conversationId: string;
        message: MessageEntity;
        currentUserId: string;
      }>,
    ) {
      const { conversationId, message, currentUserId } = action.payload;

      const conv = state.conversations.byId[conversationId];
      if (conv) {
        conv.lastMessage = getConversationPreviewText(message);
        conv.lastMessageAt = message.createdAt;
        // Only increment unread if:
        //   • the conversation is not currently active, AND
        //   • it is not muted, AND
        //   • the message was sent by someone else (not the current user)
        const normalizedCurrentUserId = normalizeId(currentUserId);
        const isMine =
          !!normalizedCurrentUserId &&
          normalizeId(message.senderId) === normalizedCurrentUserId;
        if (state.activeConversationId !== conversationId && !conv.muted && !isMine) {
          conv.unread += 1;
          if (!state.messages.byConversation[conversationId]) {
            state.messages.byConversation[conversationId] = emptyConvMessages();
          }
          state.messages.byConversation[conversationId].unreadCount += 1;
        }
      }
    },

    wsTypingReceived(
      state,
      action: PayloadAction<{ conversationId: string; userName: string }>,
    ) {
      state.typingUsers[action.payload.conversationId] = action.payload.userName;
    },

    clearTypingUser(state, action: PayloadAction<string>) {
      delete state.typingUsers[action.payload];
    },

    wsUserOnline(state, action: PayloadAction<string>) {
      if (!state.onlineUsers.includes(action.payload)) {
        state.onlineUsers.push(action.payload);
      }
    },

    wsUserOffline(state, action: PayloadAction<string>) {
      state.onlineUsers = state.onlineUsers.filter((id) => id !== action.payload);
    },

    markConversationRead(state, action: PayloadAction<string>) {
      const conv = state.conversations.byId[action.payload];
      if (conv) conv.unread = 0;
      const convMsg = state.messages.byConversation[action.payload];
      if (convMsg) convMsg.unreadCount = 0;
    },

    // ── Optimistic sending ─────────────────────────────────────────────────────
    // Redux only holds pending/failed messages; confirmed messages live in RQ cache.
    addPendingMessage(state, action: PayloadAction<MessageEntity>) {
      const { conversationId } = action.payload;
      if (!state.messages.byConversation[conversationId]) {
        state.messages.byConversation[conversationId] = emptyConvMessages();
      }
      upsertMessageInto(state.messages.byConversation[conversationId], action.payload);
    },

    /** Remove a specific optimistic message from Redux after it is confirmed. */
    removeOptimisticMessage(
      state,
      action: PayloadAction<{ conversationId: string; tempId: string }>,
    ) {
      const { conversationId, tempId } = action.payload;
      const convMessages = state.messages.byConversation[conversationId];
      if (!convMessages) return;
      convMessages.ids = convMessages.ids.filter((id) => id !== tempId);
      delete convMessages.entities[tempId];
    },

    // ── Conversation-level controls ───────────────────────────────────────────
    muteConversation(state, action: PayloadAction<string>) {
      const conv = state.conversations.byId[action.payload];
      if (conv) conv.muted = true;
    },
    unmuteConversation(state, action: PayloadAction<string>) {
      const conv = state.conversations.byId[action.payload];
      if (conv) conv.muted = false;
    },
    archiveConversation(state, action: PayloadAction<string>) {
      const conv = state.conversations.byId[action.payload];
      if (conv) {
        conv.archived = true;
        // Archiving resets unread so badge doesn't reappear on unarchive
        conv.unread = 0;
      }
    },
    unarchiveConversation(state, action: PayloadAction<string>) {
      const conv = state.conversations.byId[action.payload];
      if (conv) conv.archived = false;
    },
    pinConversation(state, action: PayloadAction<string>) {
      const conv = state.conversations.byId[action.payload];
      if (conv) conv.pinned = true;
    },
    unpinConversation(state, action: PayloadAction<string>) {
      const conv = state.conversations.byId[action.payload];
      if (conv) conv.pinned = false;
    },
    /**
     * Insert or update a conversation entity directly.
     * Used for optimistic conversation creation and WS-delivered new conversations.
     */
    upsertConversation(state, action: PayloadAction<ConversationEntity>) {
      const conv = action.payload;
      state.conversations.byId[conv.id] = conv;
      if (!state.conversations.allIds.includes(conv.id)) {
        state.conversations.allIds.unshift(conv.id);
      }
    },
  },

  extraReducers: (builder) => {
    // ── fetchConversations ─────────────────────────────────────────────────────
    builder
      .addCase(fetchConversations.pending, (state) => {
        state.conversations.loading = true;
        state.conversations.error = null;
      })
      .addCase(fetchConversations.fulfilled, (state, action) => {
        state.conversations.loading = false;
        const newById: typeof state.conversations.byId = {};
        const newAllIds: string[] = [];
        for (const conv of action.payload) {
          const existing = state.conversations.byId[conv.id];
          // Preserve local-only flags that are not stored server-side
          newById[conv.id] = {
            ...conv,
            muted: existing?.muted ?? false,
            archived: existing?.archived ?? false,
            pinned: existing?.pinned ?? false,
          };
          newAllIds.push(conv.id);
        }
        state.conversations.byId = newById;
        state.conversations.allIds = newAllIds;
      })
      .addCase(fetchConversations.rejected, (state, action) => {
        state.conversations.loading = false;
        state.conversations.error = action.payload as string;
      });

    // ── sendMessage ────────────────────────────────────────────────────────────
    builder
      .addCase(sendMessage.fulfilled, (state, action) => {
        const { tempId, message } = action.payload;
        const { conversationId } = message;

        // Update conversation preview
        const conv = state.conversations.byId[conversationId];
        if (conv) {
          conv.lastMessage = getConversationPreviewText(message);
          conv.lastMessageAt = message.createdAt;
        }

        // Remove the temp entry from Redux — RQ cache holds the confirmed message
        const convMessages = state.messages.byConversation[conversationId];
        if (convMessages) {
          convMessages.ids = convMessages.ids.filter((id) => id !== tempId);
          delete convMessages.entities[tempId];
        }
      })
      .addCase(sendMessage.rejected, (state, action) => {
        const payload = action.payload as
          | { tempId: string; error: string }
          | undefined;
        if (!payload) return;

        for (const convId of Object.keys(state.messages.byConversation)) {
          const entry =
            state.messages.byConversation[convId].entities[payload.tempId];
          if (entry) {
            entry.status = 'failed';
            break;
          }
        }
      });

    // ── markConversationReadServer ───────────────────────────────────────────
    builder.addCase(markConversationReadServer.fulfilled, (state, action) => {
      const payload = action.payload as
        | { conversationId: string; messageId: string | null; updatedAt?: number }
        | undefined;
      const convId = payload?.conversationId ?? action.meta.arg;
      const conv = state.conversations.byId[convId];
      if (conv) conv.unread = 0;
      const convMsg = state.messages.byConversation[convId];
      if (convMsg) convMsg.unreadCount = 0;
      // Optionally update lastMessageAt if server provided an updatedAt timestamp
      if (payload?.updatedAt && conv) {
        conv.lastMessageAt = payload.updatedAt;
      }
    });

    builder.addCase(markConversationReadServer.rejected, (_state, action) => {
      if (process.env.NODE_ENV === 'development') {
        console.warn('[chat] markConversationReadServer failed', action.error || action.payload);
      }
    });
  },
});

export const {
  setActiveConversation,
  wsMessageReceived,
  wsTypingReceived,
  clearTypingUser,
  wsUserOnline,
  wsUserOffline,
  markConversationRead,
  addPendingMessage,
  removeOptimisticMessage,
  muteConversation,
  unmuteConversation,
  archiveConversation,
  unarchiveConversation,
  pinConversation,
  unpinConversation,
  upsertConversation,
} = chatSlice.actions;

export default chatSlice.reducer;

// ─── Thunks defined after slice to access action creators without circular deps ─

/**
 * Open a 1-on-1 conversation with a user.
 * Automatically reuses an existing DM instead of creating a duplicate.
 * Returns { conversationId, isNew } — the caller should dispatch
 * setActiveConversation(conversationId) and optionally fetchConversations() if isNew.
 */
export const createConversation = createAsyncThunk(
  'chat/createConversation',
  async (
    { participantId }: { participantId: string },
    { getState, rejectWithValue },
  ) => {
    const state = getState() as { chat: ChatState };

    // DM reuse: return existing conversation without hitting the API
    const existingId = state.chat.conversations.allIds.find((id) => {
      const conv = state.chat.conversations.byId[id];
      return !conv.isGroup && conv.participantId === participantId;
    });
    if (existingId) {
      return { conversationId: existingId, isNew: false };
    }

    try {
      const { id } = await apiClient.getOrCreateConversation(participantId);
      return { conversationId: id, isNew: true };
    } catch (err: any) {
      return rejectWithValue(
        err.response?.data?.message ?? err.message ?? 'Failed to open conversation',
      );
    }
  },
);