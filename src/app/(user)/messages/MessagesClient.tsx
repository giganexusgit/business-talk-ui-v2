'use client';

import React, {
  useState,
  useMemo,
  useEffect,
  useRef,
  useCallback,
} from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import EmojiPicker from 'emoji-picker-react';
import { useQueryClient } from '@tanstack/react-query';
import {
  Search,
  Send,
  Smile,
  Users,
  MessageCircle,
  ArrowLeft,
  ChevronDown,
  MoreVertical,
  Pin,
  BellOff,
  Bell,
  Archive,
  Paperclip,
  X,
  FileText,
} from 'lucide-react';
import { formatFileSize, validateAttachmentFile } from '@/lib/chat/attachmentUtils';

import { useAppDispatch, useAppSelector } from '@/hooks/useRedux';
import {
  fetchConversations,
  sendMessage,
  setActiveConversation,
  addPendingMessage,
  createConversation,
  muteConversation,
  unmuteConversation,
  archiveConversation,
  unarchiveConversation,
  pinConversation,
  unpinConversation,
  markConversationRead,
} from '@/redux/slices/chatSlice';
import {
  emitTypingAction,
} from '@/redux/middleware/websocketMiddleware';
import {
  selectNonArchivedConversations,
  selectArchivedConversations,
  selectConversationsLoading,
  selectActiveConversation,
  selectActiveConversationId,
  selectConversationMessages,
  selectTypingUsers,
  selectOnlineUsers,
} from '@/redux/selectors/chatSelectors';
import {
  useInfiniteMessages,
  insertOptimisticIntoCache,
  replaceOptimisticInCache,
  markMessageFailedInCache,
  messagesQueryKey,
} from '@/hooks/useInfiniteMessages';
import { markConversationReadServer } from '@/redux/thunks/chatThunks';
import MessageBubble from '@/components/user/chat/MessageBubble';
import { formatChatTimestamp } from '@/lib/chat/time';
import { mergeUniqueMessages } from '@/lib/chat/messages';
import { buildOptimisticMessage } from '@/lib/chat/optimistic';
import type { ConversationEntity, MessageEntity } from '@/types/chat';
import { profileHref } from '@/lib/profile-link'

// ─── Helpers ───────────────────────────────────────────────────────────────────

const formatTime = (ms: number): string => {
  if (!ms) return '';
  const diff = Date.now() - ms;
  if (diff < 60_000) return 'now';
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h`;
  const d = new Date(ms);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

// ─── Skeleton loaders ─────────────────────────────────────────────────────────

const MessageSkeleton: React.FC<{ align: 'left' | 'right' }> = ({ align }) => (
  <div className={`flex ${align === 'right' ? 'justify-end' : 'justify-start'} animate-pulse`}>
    <div
      className={`h-9 rounded-2xl bg-gray-200 ${align === 'right' ? 'rounded-br-sm' : 'rounded-bl-sm'}`}
      style={{ width: `${110 + Math.floor(Math.random() * 80)}px` }}
    />
  </div>
);

const OlderMessagesSkeletons: React.FC = () => (
  <div className="space-y-1 pb-2">
    <MessageSkeleton align="left" />
    <MessageSkeleton align="right" />
    <MessageSkeleton align="left" />
  </div>
);

// ─── ConversationItem ─────────────────────────────────────────────────────────

interface ConversationItemProps {
  conv: ConversationEntity;
  isActive: boolean;
  isOnline: boolean;
  typingUser: string | null;
  onSelect: () => void;
}

const ConversationItem = React.memo<ConversationItemProps>(({
  conv,
  isActive,
  isOnline,
  typingUser,
  onSelect,
}) => {
  const dispatch = useAppDispatch();
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPos, setMenuPos] = useState({ top: 0, right: 0 });
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const close = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [menuOpen]);

  const handleMenuToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!menuOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setMenuPos({
        top: rect.bottom + 4,
        right: window.innerWidth - rect.right,
      });
    }
    setMenuOpen((prev) => !prev);
  };

  const handlePin = (e: React.MouseEvent) => {
    e.stopPropagation();
    dispatch(conv.pinned ? unpinConversation(conv.id) : pinConversation(conv.id));
    setMenuOpen(false);
  };

  const handleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    dispatch(conv.muted ? unmuteConversation(conv.id) : muteConversation(conv.id));
    setMenuOpen(false);
  };

  const handleArchive = (e: React.MouseEvent) => {
    e.stopPropagation();
    dispatch(conv.archived ? unarchiveConversation(conv.id) : archiveConversation(conv.id));
    setMenuOpen(false);
  };

  const previewText = typingUser
    ? `${typingUser} is typing\u2026`
    : conv.lastMessage || 'No messages yet';
  const isTyping = !!typingUser;

  return (
    <div
      role="button"
      tabIndex={0}
      className={`group relative w-full p-3 flex gap-3 border-b cursor-pointer transition-colors select-none ${
        isActive ? 'bg-blue-50' : 'hover:bg-gray-50'
      } ${conv.isOptimistic ? 'opacity-60 pointer-events-none' : ''}`}
      onClick={onSelect}
      onKeyDown={(e) => e.key === 'Enter' && onSelect()}
    >
      {/* Avatar + presence/group indicator */}
      <div className="relative shrink-0">
        {conv.avatar ? (
          <img
            src={conv.avatar}
            alt={conv.name}
            className="w-10 h-10 rounded-full object-cover"
          />
        ) : (
          <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center text-sm font-medium text-gray-600">
            {conv.name?.charAt(0).toUpperCase() ?? '?'}
          </div>
        )}
        {conv.isGroup ? (
          <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-blue-600 rounded-full flex items-center justify-center border-2 border-white">
            <Users className="w-2 h-2 text-white" />
          </div>
        ) : isOnline ? (
          <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-white" />
        ) : null}
      </div>

      {/* Text content */}
      <div className="flex-1 min-w-0 pr-6">
        <div className="flex items-center gap-1 mb-0.5">
          {conv.pinned && (
            <Pin className="w-3 h-3 text-gray-400 shrink-0" />
          )}
          <span className="text-sm font-semibold truncate flex-1">{conv.name}</span>
          {conv.muted && (
            <BellOff className="w-3 h-3 text-gray-400 shrink-0" />
          )}
          <span className="text-[10px] text-gray-400 shrink-0 ml-1">
            {formatTime(conv.lastMessageAt)}
          </span>
        </div>
        <p
          className={`text-xs truncate leading-4 ${
            isTyping ? 'text-green-600 italic' : 'text-gray-500'
          }`}
        >
          {previewText}
        </p>
      </div>

      {/* Unread badge */}
      {conv.unread > 0 ? (
        conv.muted ? (
          // Muted: silent dot indicator instead of bold badge
          <div className="absolute right-3 top-3 w-2 h-2 rounded-full bg-gray-400" />
        ) : (
          <span className="absolute right-3 top-3 text-[10px] font-bold text-white bg-blue-600 rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
            {conv.unread > 99 ? '99+' : conv.unread}
          </span>
        )
      ) : null}

      {/* 3-dot context menu (visible on hover) */}
      <div
        className={`absolute right-2 bottom-2 transition-opacity ${
          menuOpen ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 focus-within:opacity-100'
        }`}
      >
        <button
          ref={buttonRef}
          className="p-1 rounded-md hover:bg-gray-200 transition-colors"
          onClick={handleMenuToggle}
          aria-label="Conversation options"
        >
          <MoreVertical className="w-3.5 h-3.5 text-gray-500" />
        </button>

        {menuOpen && (
          <div
            ref={menuRef}
            style={{ position: 'fixed', top: menuPos.top, right: menuPos.right }}
            className="z-[9999] bg-white border border-gray-100 rounded-xl shadow-lg min-w-[160px] py-1 overflow-hidden"
          >
            <button
              className="w-full text-left px-3 py-2 text-xs hover:bg-gray-50 flex items-center gap-2.5 transition-colors"
              onClick={handlePin}
            >
              <Pin className="w-3.5 h-3.5 text-gray-500" />
              {conv.pinned ? 'Unpin conversation' : 'Pin conversation'}
            </button>
            <button
              className="w-full text-left px-3 py-2 text-xs hover:bg-gray-50 flex items-center gap-2.5 transition-colors"
              onClick={handleMute}
            >
              {conv.muted ? (
                <Bell className="w-3.5 h-3.5 text-gray-500" />
              ) : (
                <BellOff className="w-3.5 h-3.5 text-gray-500" />
              )}
              {conv.muted ? 'Unmute notifications' : 'Mute notifications'}
            </button>
            <div className="my-1 border-t border-gray-100" />
            <button
              className="w-full text-left px-3 py-2 text-xs hover:bg-gray-50 flex items-center gap-2.5 transition-colors"
              onClick={handleArchive}
            >
              <Archive className="w-3.5 h-3.5 text-gray-500" />
              {conv.archived ? 'Unarchive' : 'Archive'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
});
ConversationItem.displayName = 'ConversationItem';

// ─── MessagesClient ───────────────────────────────────────────────────────────

/** Distance from the bottom (px) within which we auto-scroll on new messages. */
const NEAR_BOTTOM_THRESHOLD = 120;

// Stable selector defined outside the component to avoid creating a new
// function reference on every render.
const selectTypingUsersMap = (s: { chat: { typingUsers: Record<string, string> } }) =>
  s.chat.typingUsers;

const normalizeId = (value: unknown): string => String(value ?? '').trim().toLowerCase();

const MessagesClient = () => {
  const dispatch = useAppDispatch();
  const queryClient = useQueryClient();
  const router = useRouter();
  const authUser = useAppSelector((state: any) => state.auth?.user as any);
  const currentUserId = useAppSelector((state: any) => {
    const user = state.auth?.user as any;
    return String(user?.id ?? user?.user_id ?? user?.userId ?? '');
  });
  const normalizedCurrentUserId = useMemo(
    () => normalizeId(currentUserId),
    [currentUserId],
  );

  const searchParams = useSearchParams();
  const conversationIdFromURL = searchParams.get('conversationId');
  const userIdFromURL = searchParams.get('userId');

  // ── Local UI state ─────────────────────────────────────────────────────────
  const [messageInput, setMessageInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'unread' | 'groups' | 'archived'>('all');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showMobileList, setShowMobileList] = useState(true);
  const [showScrollButton, setShowScrollButton] = useState(false);

  // ── Attachment state ───────────────────────────────────────────────────────
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [attachmentError, setAttachmentError] = useState<string | null>(null);

  // ── Refs ───────────────────────────────────────────────────────────────────
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const topSentinelRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const emojiToggleRef = useRef<HTMLButtonElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const scrollAnchorRef = useRef<number | null>(null);
  const isNearBottomRef = useRef(true);
  const isFetchingOlderRef = useRef(false);

  // ── Redux state ────────────────────────────────────────────────────────────
  const conversationsLoading = useAppSelector(selectConversationsLoading);
  const conversations = useAppSelector(selectNonArchivedConversations);
  const archivedConversations = useAppSelector(selectArchivedConversations);
  const onlineUsers = useAppSelector(selectOnlineUsers);
  const allTypingUsers = useAppSelector(selectTypingUsersMap);
  const selectedConversation = useAppSelector(selectActiveConversation);
  const activeConversationId = useAppSelector(selectActiveConversationId);
  const conversationsReady = !conversationsLoading && conversations.length > 0;

  const optimisticSelector = useMemo(
    () => selectConversationMessages(activeConversationId ?? ''),
    [activeConversationId],
  );
  const typingSelector = useMemo(
    () => selectTypingUsers(activeConversationId ?? ''),
    [activeConversationId],
  );
  const optimisticMessages = useAppSelector(optimisticSelector);
  const typingUser = useAppSelector(typingSelector);

  // ── React Query — cursor-paginated messages ────────────────────────────────
  const {
    data: rqData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading: isInitialLoading,
    isError: isMessagesError,
    error: messagesError,
  } = useInfiniteMessages(activeConversationId);

  // ── Merge: RQ historical + Redux optimistic (deduplicated) ────────────────
  const allMessages = useMemo(() => {
    const rqMessages =
      rqData?.pages
        .slice()
        .reverse()
        .flatMap((p) => p.messages) ?? [];
    return mergeUniqueMessages([...rqMessages, ...optimisticMessages]);
  }, [rqData, optimisticMessages]);

  // ── Bootstrap ──────────────────────────────────────────────────────────────
  useEffect(() => {
    dispatch(fetchConversations());
  }, [dispatch]);

  // Auto-select from URL param or first conversation after hydration.
  // Guard against races where URL target exists but conversations are not yet ready.
  useEffect(() => {
    if (!conversationsReady) return;

    if (conversationIdFromURL) {
      const found = conversations.find((c) => c.id === conversationIdFromURL);
      // Do not fallback to first conversation while routing from notifications.
      if (!found) return;
      if (activeConversationId !== found.id) {
        dispatch(setActiveConversation(found.id));
      }
    } else if (!activeConversationId) {
      dispatch(setActiveConversation(conversations[0].id));
    }
  }, [
    conversationsReady,
    conversations,
    conversationIdFromURL,
    activeConversationId,
    dispatch,
  ]);

  // Handle ?userId= — open existing DM or create new one (DM reuse)
  useEffect(() => {
  if (!userIdFromURL) return;

  dispatch(createConversation({ participantId: userIdFromURL })).then(
    (result) => {
      if (createConversation.fulfilled.match(result)) {
        const { conversationId, isNew } = result.payload;

        dispatch(setActiveConversation(conversationId));

        if (isNew) {
          dispatch(fetchConversations());
        }

        setShowMobileList(false);
      }
    }
  );
}, [userIdFromURL, dispatch]);

  // Reset near-bottom anchor when switching conversations
  useEffect(() => {
    if (!activeConversationId) return;
    isNearBottomRef.current = true;
    setShowScrollButton(false);
    // Optimistically clear unread badge in frontend and notify backend via thunk
    dispatch(markConversationRead(activeConversationId));
    dispatch(markConversationReadServer(activeConversationId));
  }, [activeConversationId, dispatch]);

  // Auto-scroll when new messages arrive — only when near the bottom
  const prevMessageCountRef = useRef(0);
  useEffect(() => {
    const count = allMessages.length;
    if (count === prevMessageCountRef.current) return;
    const wasNew = count > prevMessageCountRef.current;
    prevMessageCountRef.current = count;
    if (wasNew && isNearBottomRef.current) {
      requestAnimationFrame(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      });
    }
  }, [allMessages.length]);

  // Restore scroll position after prepending older pages
  useEffect(() => {
    if (!isFetchingNextPage && scrollAnchorRef.current !== null) {
      const container = scrollContainerRef.current;
      if (container) {
        container.scrollTop = container.scrollHeight - scrollAnchorRef.current;
      }
      scrollAnchorRef.current = null;
      isFetchingOlderRef.current = false;
    }
  }, [isFetchingNextPage]);

  // Scroll to bottom on initial load of each conversation
  const didScrollInitialRef = useRef<string | null>(null);
  useEffect(() => {
    if (
      !isInitialLoading &&
      rqData &&
      activeConversationId &&
      didScrollInitialRef.current !== activeConversationId
    ) {
      didScrollInitialRef.current = activeConversationId;
      requestAnimationFrame(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
      });
    }
  }, [isInitialLoading, rqData, activeConversationId]);

  // IntersectionObserver: top sentinel triggers loading older pages
  useEffect(() => {
    const container = scrollContainerRef.current;
    const sentinel = topSentinelRef.current;
    if (!container || !sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (
          entries[0].isIntersecting &&
          hasNextPage &&
          !isFetchingNextPage &&
          !isFetchingOlderRef.current
        ) {
          isFetchingOlderRef.current = true;
          scrollAnchorRef.current =
            container.scrollHeight - container.scrollTop;
          fetchNextPage();
        }
      },
      { root: container, threshold: 0.1 },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage, activeConversationId]);

  // Close emoji picker on outside click
  useEffect(() => {
    if (!showEmojiPicker) return;
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (emojiPickerRef.current?.contains(target)) return;
      if (emojiToggleRef.current?.contains(target)) return;
      setShowEmojiPicker(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showEmojiPicker]);

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleScrollEvent = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    const distFromBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight;
    isNearBottomRef.current = distFromBottom < NEAR_BOTTOM_THRESHOLD;
    setShowScrollButton(distFromBottom > NEAR_BOTTOM_THRESHOLD + 100);
  }, []);

  const handleSelectConversation = useCallback(
    (id: string) => {
      dispatch(setActiveConversation(id));
      setShowMobileList(false);
    },
    [dispatch],
  );

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  const handleHeaderAvatarClick = useCallback(() => {
    if (selectedConversation?.isGroup || !selectedConversation?.participantId) return;
    router.push(profileHref(selectedConversation.participantId, selectedConversation.name));
  }, [router, selectedConversation]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validation = validateAttachmentFile(file);
    if (!validation.valid) {
      setAttachmentError(validation.error || 'Invalid file');
      e.target.value = '';
      return;
    }

    setAttachmentError(null);
    setSelectedFile(file);

    if (file.type.startsWith('image/')) {
      const url = URL.createObjectURL(file);
      setFilePreviewUrl(url);
    } else {
      setFilePreviewUrl(null);
    }

    e.target.value = '';
  };

  const handleRemoveAttachment = () => {
    if (filePreviewUrl) {
      URL.revokeObjectURL(filePreviewUrl);
    }
    setSelectedFile(null);
    setFilePreviewUrl(null);
    setAttachmentError(null);
  };

  const handleSendMessage = async () => {
    if ((!messageInput.trim() && !selectedFile) || !activeConversationId || isUploading) return;

    const fileToSend = selectedFile;
    const content = messageInput.trim();

    if (filePreviewUrl) {
      URL.revokeObjectURL(filePreviewUrl);
    }

    setMessageInput('');
    setSelectedFile(null);
    setFilePreviewUrl(null);
    setAttachmentError(null);

    const pendingMessage: MessageEntity = buildOptimisticMessage({
      conversationId: activeConversationId,
      text: content,
      file: fileToSend,
      currentUser: {
        id: String(
          authUser?.id ??
          authUser?.user_id ??
          authUser?.userId ??
          '',
        ),
        full_name:
          authUser?.full_name ||
          authUser?.fullName ||
          authUser?.name ||
          authUser?.username,
        profile_photo:
          authUser?.profile_photo ||
          authUser?.profilePhoto ||
          authUser?.avatar,
      },
    });
    const tempId = pendingMessage.id;

    const hasRqCache = !!queryClient.getQueryData(
      messagesQueryKey(activeConversationId),
    );
    if (hasRqCache) {
      insertOptimisticIntoCache(queryClient, activeConversationId, pendingMessage);
    } else {
      dispatch(addPendingMessage(pendingMessage));
    }

    try {
      setIsUploading(true);
      setUploadProgress(0);

      const result = await dispatch(
        sendMessage({
          conversationId: activeConversationId,
          content,
          tempId,
          file: fileToSend || undefined,
          onUploadProgress: (percent) => setUploadProgress(percent),
        }),
      );

      if (sendMessage.fulfilled.match(result)) {
        const { message } = result.payload;
        if (hasRqCache) {
          replaceOptimisticInCache(
            queryClient,
            activeConversationId,
            tempId,
            message,
          );
        }
      } else if (hasRqCache) {
        markMessageFailedInCache(queryClient, activeConversationId, tempId);
        setAttachmentError('Failed to send message/attachment. Please try again.');
      }
    } catch (err) {
      if (hasRqCache) {
        markMessageFailedInCache(queryClient, activeConversationId, tempId);
      }
      setAttachmentError('Network error while sending attachment.');
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleEmojiClick = (emojiData: any) => {
    setMessageInput((prev) => prev + emojiData.emoji);
    setShowEmojiPicker(false);
    // Return focus to textarea so Enter key works immediately
    setTimeout(() => textareaRef.current?.focus(), 0);
  };

  // ── Filtered conversation list ─────────────────────────────────────────────
  const filteredConversations = useMemo(() => {
    if (activeTab === 'archived') {
      if (!searchQuery.trim()) return archivedConversations;
      const q = searchQuery.toLowerCase();
      return archivedConversations.filter((c) =>
        c.name.toLowerCase().includes(q),
      );
    }
    let base = conversations;
    if (activeTab === 'unread') base = base.filter((c) => c.unread > 0);
    if (activeTab === 'groups') base = base.filter((c) => c.isGroup);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      base = base.filter((c) => c.name.toLowerCase().includes(q));
    }
    return base;
  }, [conversations, archivedConversations, activeTab, searchQuery]);

  // ── Loading / empty screens ────────────────────────────────────────────────
  if (conversationsLoading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-[#F8F9FA]">
        <div className="flex flex-col items-center gap-3 text-gray-400">
          <div className="w-8 h-8 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
          <p className="text-sm">Loading conversations...</p>
        </div>
      </div>
    );
  }

  if (
    !conversationsLoading &&
    conversations.length === 0 &&
    archivedConversations.length === 0
  ) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-[#F8F9FA]">
        <div className="flex flex-col items-center gap-4 text-center max-w-sm px-6">
          <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center">
            <MessageCircle className="w-9 h-9 text-gray-400" />
          </div>
          <h2 className="text-xl font-semibold text-gray-800">
            No conversations yet
          </h2>
          <p className="text-sm text-gray-500 leading-relaxed">
            Message people from their profiles to start a conversation. Your
            chats will appear here.
          </p>
          <a
            href="/people"
            className="mt-2 px-6 py-2.5 bg-black text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors"
          >
            Find People
          </a>
        </div>
      </div>
    );
  }

  if (!selectedConversation) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-[#F8F9FA]">
        <div className="flex flex-col items-center gap-3 text-gray-500">
          <div className="w-8 h-8 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
          <p className="text-sm">Loading conversation...</p>
        </div>
      </div>
    );
  }

  const activeConvIsOnline =
    !selectedConversation.isGroup &&
    !!selectedConversation.participantId &&
    onlineUsers.includes(selectedConversation.participantId);

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div
      className="
      flex
      h-screen
      w-full
      overflow-hidden
      bg-[#F8F9FA]
    "
    >

      {/* ── Sidebar ────────────────────────────────────────────────────────── */}
      <div
        className={`
          h-full flex flex-col bg-white border-r overflow-hidden
          w-full md:w-80 lg:w-96 shrink-0
          ${showMobileList ? 'flex' : 'hidden'} md:flex
        `}
      >
        {/* Search */}
        <div className="p-4 border-b">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg border bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-black/10"
            />
          </div>
        </div>

        {/* Tabs: All | Unread | Groups | Archived */}
        <div className="px-3 py-2 flex gap-1.5 border-b overflow-x-auto">
          {(['all', 'unread', 'groups', 'archived'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-1.5 text-xs rounded-lg capitalize whitespace-nowrap shrink-0 font-medium transition-colors ${
                activeTab === tab
                  ? 'bg-black text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Conversation list */}
        <div className="flex-1 min-h-0 overflow-y-auto">
          {filteredConversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-gray-400">
              <p className="text-sm">
                {activeTab === 'archived'
                  ? 'No archived conversations'
                  : activeTab === 'unread'
                  ? 'No unread conversations'
                  : activeTab === 'groups'
                  ? 'No group conversations'
                  : 'No conversations found'}
              </p>
            </div>
          ) : (
            filteredConversations.map((conv) => (
              <ConversationItem
                key={conv.id}
                conv={conv}
                isActive={selectedConversation?.id === conv.id}
                isOnline={
                  !conv.isGroup &&
                  !!conv.participantId &&
                  onlineUsers.includes(conv.participantId)
                }
                typingUser={allTypingUsers[conv.id] ?? null}
                onSelect={() => handleSelectConversation(conv.id)}
              />
            ))
          )}
        </div>
      </div>

      {/* Divider — desktop only */}
      <div className="hidden md:block w-px bg-gray-200 shrink-0" />

      {/* ── Chat pane ──────────────────────────────────────────────────────── */}
      <div
        className={`
          flex flex-col flex-1 min-h-0 overflow-hidden relative h-full
          ${!showMobileList ? 'flex' : 'hidden'} md:flex
        `}
      >
        {/* Header */}
        <div className="p-3 md:p-4 flex items-center gap-2 md:gap-3 bg-white border-b">
          <button
            className="md:hidden p-1.5 rounded-lg hover:bg-gray-100 shrink-0"
            onClick={() => setShowMobileList(true)}
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>

          {selectedConversation.isGroup || !selectedConversation.participantId ? (
            <div className="relative shrink-0">
              <img
                src={selectedConversation.avatar}
                alt={selectedConversation.name}
                className="w-9 h-9 md:w-10 md:h-10 rounded-full object-cover"
              />
              {activeConvIsOnline && (
                <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-white" />
              )}
            </div>
          ) : (
            <button
              type="button"
              onClick={handleHeaderAvatarClick}
              className="relative shrink-0 rounded-full focus:outline-none focus:ring-2 focus:ring-black/20"
              aria-label={`Open ${selectedConversation.name} profile`}
              title={`Open ${selectedConversation.name} profile`}
            >
              <img
                src={selectedConversation.avatar}
                alt={selectedConversation.name}
                className="w-9 h-9 md:w-10 md:h-10 rounded-full object-cover cursor-pointer"
              />
              {activeConvIsOnline && (
                <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-white" />
              )}
            </button>
          )}

          <div className="min-w-0 flex-1">
            <h2 className="font-semibold text-sm md:text-base truncate">
              {selectedConversation.name}
            </h2>
            {typingUser ? (
              <p className="text-xs text-green-600 italic">
                {typingUser} is typing&hellip;
              </p>
            ) : activeConvIsOnline ? (
              <p className="text-xs text-green-600">Online</p>
            ) : null}
          </div>
        </div>

        {/* Messages area */}
        <div
          ref={scrollContainerRef}
          onScroll={handleScrollEvent}
          className="
            flex-1
            overflow-y-auto
            overflow-x-hidden
            min-h-0
            bg-white
            h-full
          "
        >
          <div className="p-3 md:p-4 space-y-1">
            {/* Invisible sentinel — IntersectionObserver triggers here */}
            <div ref={topSentinelRef} className="h-px" />

            {isFetchingNextPage && <OlderMessagesSkeletons />}

            {!hasNextPage && allMessages.length > 0 && (
              <div className="flex items-center justify-center py-3">
                <span className="text-xs text-gray-400 bg-gray-100 px-3 py-1 rounded-full">
                  Beginning of conversation
                </span>
              </div>
            )}

            {isInitialLoading && (
              <div className="space-y-1 py-4">
                {[...Array(6)].map((_, i) => (
                  <MessageSkeleton
                    key={i}
                    align={i % 2 === 0 ? 'left' : 'right'}
                  />
                ))}
              </div>
            )}

            {isMessagesError && (
              <div className="py-3">
                <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  {messagesError?.message || 'Failed to load messages. Please retry.'}
                </p>
              </div>
            )}

            {!isInitialLoading && !isMessagesError && allMessages.length === 0 && (
              <div className="py-6 text-center text-sm text-gray-500">
                No messages yet. Start the conversation.
              </div>
            )}

            {allMessages.map((msg) => (
              
              <MessageBubble
                key={`${msg.id}-${msg.updatedAt || msg.createdAt}`}
                message={msg}
                isMine={
                  !!normalizedCurrentUserId &&
                  normalizeId(msg.senderId) === normalizedCurrentUserId
                }
                isGroup={selectedConversation.isGroup}
                displayTime={formatChatTimestamp(msg.createdAt)}
              />
              
            ))}

            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Scroll-to-bottom button */}
        {showScrollButton && (
          <button
            onClick={scrollToBottom}
            className="absolute bottom-20 right-4 z-10 w-9 h-9 bg-white border border-gray-200 shadow-md rounded-full flex items-center justify-center hover:bg-gray-50 transition-colors"
            aria-label="Scroll to latest messages"
          >
            <ChevronDown className="w-4 h-4 text-gray-600" />
          </button>
        )}

        {/* Staging, progress, error & input container */}
        <div className="bg-white border-t relative">
          {/* Staged file card */}
          {selectedFile && (
            <div className="px-3 pt-2.5">
              <div className="flex items-center gap-3 p-2.5 rounded-xl border border-gray-200 bg-gray-50 max-w-sm relative">
                {filePreviewUrl ? (
                  <img
                    src={filePreviewUrl}
                    alt="Staged attachment preview"
                    className="w-12 h-12 rounded-lg object-cover border border-gray-200 shrink-0"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shrink-0">
                    <FileText className="w-6 h-6" />
                  </div>
                )}

                <div className="flex-1 min-w-0 pr-6">
                  <p className="text-xs font-semibold text-gray-800 truncate" title={selectedFile.name}>
                    {selectedFile.name}
                  </p>
                  <p className="text-[11px] text-gray-500 mt-0.5">
                    {formatFileSize(selectedFile.size)}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleRemoveAttachment}
                  disabled={isUploading}
                  className="absolute top-2 right-2 p-1 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-200 transition-colors disabled:opacity-40"
                  aria-label="Remove attachment"
                  title="Remove attachment"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Upload Progress Bar */}
          {isUploading && (
            <div className="px-3 pt-2">
              <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-blue-600 h-1.5 transition-all duration-200"
                  style={{ width: `${Math.max(5, uploadProgress)}%` }}
                />
              </div>
              <p className="text-[11px] text-gray-500 mt-1 text-right">
                Sending attachment... {uploadProgress}%
              </p>
            </div>
          )}

          {/* Error Banner */}
          {attachmentError && (
            <div className="px-3 pt-2">
              <div className="flex items-center justify-between text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-1.5">
                <span>{attachmentError}</span>
                <button onClick={() => setAttachmentError(null)} className="text-red-500 hover:text-red-700">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* Controls + Textarea */}
          <div className="p-2 md:p-3 flex items-end gap-2 relative">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              accept="image/*,video/*,audio/*,application/pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip,.rar"
              className="hidden"
            />

            {/* Paperclip attachment button */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="p-2 shrink-0 hover:bg-gray-100 rounded-lg transition-colors text-gray-500 hover:text-gray-700 disabled:opacity-40"
              aria-label="Attach file or photo"
              title="Attach file or photo"
            >
              <Paperclip className="w-5 h-5" />
            </button>

            {/* Emoji toggle button */}
            <button
              ref={emojiToggleRef}
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              disabled={isUploading}
              className="p-2 shrink-0 hover:bg-gray-100 rounded-lg transition-colors text-gray-500 hover:text-gray-700 disabled:opacity-40"
              aria-label="Insert emoji"
              title="Insert emoji"
            >
              <Smile className="w-5 h-5" />
            </button>

            {showEmojiPicker && (
              <div
                ref={emojiPickerRef}
                className="absolute bottom-14 left-2 md:left-10 z-50"
              >
                <EmojiPicker onEmojiClick={handleEmojiClick} />
              </div>
            )}

            <textarea
              ref={textareaRef}
              value={messageInput}
              disabled={isUploading}
              onChange={(e) => {
                setMessageInput(e.target.value);
                if (activeConversationId) {
                  dispatch(
                    emitTypingAction({ conversationId: activeConversationId }),
                  );
                }
              }}
              onKeyDown={handleKeyDown}
              rows={1}
              placeholder={selectedFile ? 'Add a caption (optional)...' : 'Type a message'}
              className="flex-1 px-3 md:px-4 py-2 border rounded-xl resize-none max-h-28 overflow-y-auto text-sm focus:outline-none focus:ring-2 focus:ring-black/10 disabled:bg-gray-50"
            />

            <button
              onClick={handleSendMessage}
              disabled={(!messageInput.trim() && !selectedFile) || isUploading}
              className="bg-black text-white px-3 py-2 rounded-xl shrink-0 disabled:opacity-40 transition-opacity flex items-center justify-center min-w-[40px] h-[38px]"
              aria-label="Send message"
              title="Send message"
            >
              {isUploading ? (
                <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MessagesClient;