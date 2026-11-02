// ─── Notification Registry — Businesstalk24 ─────────────────────────────────
//
// Single source of truth for:
//   • All backend notification type metadata (icon, category, priority, label)
//   • User-facing route resolution  → resolveNotificationRoute()
//   • Admin route resolution        → resolveAdminNotificationRoute()
//   • Push notification formatters  → entry.formatPushTitle / formatPushBody
//   • Grouped message formatters    → entry.formatGroupedMessage
//   • Category lookup               → getCategoryForType()
//
// ┌──────────────────────────────────────────────────────────────────────────┐
// │  To add a new notification type:                                         │
// │  1. Add one entry to REGISTRY_ENTRIES below.                             │
// │  2. Mirror the route in public/firebase-messaging-sw.js → buildDeepLink  │
// └──────────────────────────────────────────────────────────────────────────┘

import React from 'react';
import {
  Bell,
  ThumbsUp,
  MessageCircle,
  Users,
  UserPlus,
  UserCheck,
  AtSign,
  Heart,
  TrendingUp,
  MessageSquare,
  AlertTriangle,
  Shield,
  Megaphone,
  Info,
  Bot,
  Zap,
} from 'lucide-react';
import type { NotificationActor, NotificationEntity, NotificationCategory } from '@/types/notification';
import { profileHref } from '@/lib/profile-link'

// ─── Exported types ───────────────────────────────────────────────────────────

export type NotificationPriority = 'low' | 'normal' | 'high' | 'critical';

export interface NotificationRegistryEntry {
  /** Canonical type key (lowercase, underscored). */
  type: string;
  /** Human-readable label (shown in preference toggles, grouped headers). */
  label: string;
  /** Logical grouping bucket. */
  category: NotificationCategory;
  /** Display / delivery priority. */
  priority: NotificationPriority;
  /** Returns a sized React icon element. Default size = 20. */
  icon: (size?: number) => React.ReactElement;
  /** Fallback route when full entity context is unavailable. */
  defaultRoute: string;
  /** Push notification title (e.g. "Alice liked your post"). */
  formatPushTitle: (actorName: string) => string;
  /** Push notification body (pass-through or custom). */
  formatPushBody: (message: string) => string;
  /**
   * Grouped card message for multiple actors performing the same action
   * (e.g. "Alice and 3 others liked your post").
   */
  formatGroupedMessage: (actors: NotificationActor[], baseMessage: string) => string;
  /** OS-level push grouping tag — same-tag pushes collapse in the notification tray. */
  groupTag: string;
}

export interface CategoryMeta {
  category: NotificationCategory;
  label: string;
}

// ─── Category display metadata ────────────────────────────────────────────────

/** Ordered list of all categories with display labels. */
export const CATEGORY_META: CategoryMeta[] = [
  { category: 'social',     label: 'Social Activity' },
  { category: 'groups',     label: 'Groups'           },
  { category: 'chat',       label: 'Messages'         },
  { category: 'moderation', label: 'Moderation'       },
  { category: 'admin',      label: 'Admin'            },
  { category: 'system',     label: 'System'           },
];

// ─── User-facing entity route table ───────────────────────────────────────────
// Drives all user-facing notification click routing.
// SYNC: public/firebase-messaging-sw.js → buildDeepLink() must mirror this map.



const USER_ENTITY_ROUTES: Record<string, (entityId: string, notifType: string) => string> = {
  user:         (id)    => profileHref(id),
  post:         (id, t) => t.toUpperCase() === 'QUESTION' ? `/questions/${id}` : `/posts/${id}`,
  blog:         (id, t) => t.toUpperCase() === 'STORY'    ? `/stories/${id}`   : `/blogs/${id}`,
  comment:      (id)    => `/posts/${id}?highlight=comment`,
  conversation: (id)    => `/messages?conversationId=${id}`,
  group:        (id)    => `/groups/${id}/requests`,
};

// ─── Admin entity route table ─────────────────────────────────────────────────

const ADMIN_ENTITY_ROUTES: Record<string, (entityId: string, notifType: string) => string> = {
  user:         (id)    => `/admin/users/${id}`,
  post:         (id, t) => t.toLowerCase() === 'question' ? `/question/${id}` : `/post/${id}`,
  blog:         (id, t) => t.toLowerCase() === 'story'    ? `/story/${id}`    : `/blog/${id}`,
  comment:      (id)    => `/post/${id}?highlight=comment`,
  conversation: (id)    => `/messages/${id}`,
  group:        (id)    => `/admin/groups/${id}`,
};

// ─── Route resolvers ──────────────────────────────────────────────────────────

/**
 * Resolve the user-facing route for a notification.
 * Replaces all switch(entityType) routing in user-facing components.
 */
export function resolveNotificationRoute(
  n: Pick<NotificationEntity, 'entityId' | 'entityType' | 'type'>,
): string {
  const resolver = USER_ENTITY_ROUTES[n.entityType];
  return resolver ? resolver(n.entityId, n.type) : '/notifications';
}

/**
 * Resolve the admin-panel route for a notification.
 * Replaces the switch(entity_type) routing in the admin notifications page.
 * Special-case overrides (reported content, warnings) are handled by the caller
 * before delegating here.
 */
export function resolveAdminNotificationRoute(
  entityId: string,
  entityType: string,
  notifType: string,
): string {
  const resolver = ADMIN_ENTITY_ROUTES[entityType.toLowerCase()];
  return resolver ? resolver(entityId, notifType) : '/admin/notifications';
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

/** Normalize type to lowercase + underscores for map lookup. */
const normalizeType = (type: unknown): string =>
  String(type ?? '').toLowerCase().replace(/-/g, '_').trim();

/** Build a grouped actor message ("Alice and 3 others liked your post"). */
function grouped(actors: NotificationActor[], action: string): string {
  if (actors.length <= 1) {
    return actors[0]?.name ? `${actors[0].name} ${action}` : action;
  }
  const extra = actors.length - 1;
  return `${actors[0].name} and ${extra} other${extra > 1 ? 's' : ''} ${action}`;
}

// ─── Registry entries ─────────────────────────────────────────────────────────

const REGISTRY_ENTRIES: NotificationRegistryEntry[] = [
  // ── Social: likes ───────────────────────────────────────────────────────────
  {
    type: 'like',
    label: 'Like',
    category: 'social',
    priority: 'low',
    icon: (s = 20) => <ThumbsUp size={s} style={{ color: '#1976D2' }} />,
    defaultRoute: '/posts',
    formatPushTitle: (name) => `${name} liked your post`,
    formatPushBody: (msg) => msg,
    formatGroupedMessage: (actors, msg) => actors.length <= 1 ? msg : grouped(actors, 'liked your post'),
    groupTag: 'likes',
  },
  {
    type: 'like_post',
    label: 'Post Like',
    category: 'social',
    priority: 'low',
    icon: (s = 20) => <ThumbsUp size={s} style={{ color: '#1976D2' }} />,
    defaultRoute: '/posts',
    formatPushTitle: (name) => `${name} liked your post`,
    formatPushBody: (msg) => msg,
    formatGroupedMessage: (actors, msg) => actors.length <= 1 ? msg : grouped(actors, 'liked your post'),
    groupTag: 'likes',
  },
  {
    type: 'like_blog',
    label: 'Blog Like',
    category: 'social',
    priority: 'low',
    icon: (s = 20) => <ThumbsUp size={s} style={{ color: '#1976D2' }} />,
    defaultRoute: '/blogs',
    formatPushTitle: (name) => `${name} liked your blog`,
    formatPushBody: (msg) => msg,
    formatGroupedMessage: (actors, msg) => actors.length <= 1 ? msg : grouped(actors, 'liked your blog'),
    groupTag: 'likes',
  },
  {
    type: 'like_story',
    label: 'Story Like',
    category: 'social',
    priority: 'low',
    icon: (s = 20) => <ThumbsUp size={s} style={{ color: '#1976D2' }} />,
    defaultRoute: '/stories',
    formatPushTitle: (name) => `${name} liked your story`,
    formatPushBody: (msg) => msg,
    formatGroupedMessage: (actors, msg) => actors.length <= 1 ? msg : grouped(actors, 'liked your story'),
    groupTag: 'likes',
  },
  {
    type: 'like_comment',
    label: 'Comment Like',
    category: 'social',
    priority: 'low',
    icon: (s = 20) => <ThumbsUp size={s} style={{ color: '#1976D2' }} />,
    defaultRoute: '/posts',
    formatPushTitle: (name) => `${name} liked your comment`,
    formatPushBody: (msg) => msg,
    formatGroupedMessage: (actors, msg) => actors.length <= 1 ? msg : grouped(actors, 'liked your comment'),
    groupTag: 'likes',
  },

  // ── Social: reactions ────────────────────────────────────────────────────────
  {
    type: 'reaction',
    label: 'Reaction',
    category: 'social',
    priority: 'low',
    icon: (s = 20) => <Heart size={s} style={{ color: '#E91E63' }} />,
    defaultRoute: '/posts',
    formatPushTitle: (name) => `${name} reacted to your post`,
    formatPushBody: (msg) => msg,
    formatGroupedMessage: (actors, msg) => actors.length <= 1 ? msg : grouped(actors, 'reacted to your post'),
    groupTag: 'reactions',
  },

  // ── Social: comments ─────────────────────────────────────────────────────────
  {
    type: 'comment',
    label: 'Comment',
    category: 'social',
    priority: 'normal',
    icon: (s = 20) => <MessageCircle size={s} style={{ color: '#388E3C' }} />,
    defaultRoute: '/posts',
    formatPushTitle: (name) => `${name} commented on your post`,
    formatPushBody: (msg) => msg,
    formatGroupedMessage: (actors, msg) => actors.length <= 1 ? msg : grouped(actors, 'commented on your post'),
    groupTag: 'comments',
  },
  {
    type: 'comment_post',
    label: 'Post Comment',
    category: 'social',
    priority: 'normal',
    icon: (s = 20) => <MessageCircle size={s} style={{ color: '#388E3C' }} />,
    defaultRoute: '/posts',
    formatPushTitle: (name) => `${name} commented on your post`,
    formatPushBody: (msg) => msg,
    formatGroupedMessage: (actors, msg) => actors.length <= 1 ? msg : grouped(actors, 'commented on your post'),
    groupTag: 'comments',
  },
  {
    type: 'comment_blog',
    label: 'Blog Comment',
    category: 'social',
    priority: 'normal',
    icon: (s = 20) => <MessageCircle size={s} style={{ color: '#388E3C' }} />,
    defaultRoute: '/blogs',
    formatPushTitle: (name) => `${name} commented on your blog`,
    formatPushBody: (msg) => msg,
    formatGroupedMessage: (actors, msg) => actors.length <= 1 ? msg : grouped(actors, 'commented on your blog'),
    groupTag: 'comments',
  },

  // ── Social: follows ──────────────────────────────────────────────────────────
  {
    type: 'follow',
    label: 'Follow',
    category: 'social',
    priority: 'normal',
    icon: (s = 20) => <Users size={s} style={{ color: '#7B1FA2' }} />,
    defaultRoute: '/people',
    formatPushTitle: (name) => `${name} followed you`,
    formatPushBody: (msg) => msg,
    formatGroupedMessage: (actors, msg) => actors.length <= 1 ? msg : grouped(actors, 'followed you'),
    groupTag: 'social',
  },
  {
    type: 'follow_user',
    label: 'Follow',
    category: 'social',
    priority: 'normal',
    icon: (s = 20) => <Users size={s} style={{ color: '#7B1FA2' }} />,
    defaultRoute: '/people',
    formatPushTitle: (name) => `${name} followed you`,
    formatPushBody: (msg) => msg,
    formatGroupedMessage: (actors, msg) => actors.length <= 1 ? msg : grouped(actors, 'followed you'),
    groupTag: 'social',
  },

  // ── Social: mentions ─────────────────────────────────────────────────────────
  {
    type: 'mention',
    label: 'Mention',
    category: 'social',
    priority: 'high',
    icon: (s = 20) => <AtSign size={s} style={{ color: '#F57C00' }} />,
    defaultRoute: '/posts',
    formatPushTitle: (name) => `${name} mentioned you`,
    formatPushBody: (msg) => msg,
    formatGroupedMessage: (actors, msg) => actors.length <= 1 ? msg : grouped(actors, 'mentioned you'),
    groupTag: 'mentions',
  },
  {
    type: 'mention_post',
    label: 'Post Mention',
    category: 'social',
    priority: 'high',
    icon: (s = 20) => <AtSign size={s} style={{ color: '#F57C00' }} />,
    defaultRoute: '/posts',
    formatPushTitle: (name) => `${name} mentioned you in a post`,
    formatPushBody: (msg) => msg,
    formatGroupedMessage: (_actors, msg) => msg,
    groupTag: 'mentions',
  },
  {
    type: 'mention_comment',
    label: 'Comment Mention',
    category: 'social',
    priority: 'high',
    icon: (s = 20) => <AtSign size={s} style={{ color: '#F57C00' }} />,
    defaultRoute: '/posts',
    formatPushTitle: (name) => `${name} mentioned you in a comment`,
    formatPushBody: (msg) => msg,
    formatGroupedMessage: (_actors, msg) => msg,
    groupTag: 'mentions',
  },

  // ── Groups ───────────────────────────────────────────────────────────────────
  {
    type: 'group',
    label: 'Group Activity',
    category: 'groups',
    priority: 'normal',
    icon: (s = 20) => <TrendingUp size={s} style={{ color: '#4527A0' }} />,
    defaultRoute: '/groups',
    formatPushTitle: (_name) => 'Group activity',
    formatPushBody: (msg) => msg,
    formatGroupedMessage: (_actors, msg) => msg,
    groupTag: 'groups',
  },
  {
    type: 'group_join_request',
    label: 'Group Join Request',
    category: 'groups',
    priority: 'high',
    icon: (s = 20) => <UserPlus size={s} style={{ color: '#0277BD' }} />,
    defaultRoute: '/groups',
    formatPushTitle: (name) => `${name} requested to join your group`,
    formatPushBody: (msg) => msg,
    formatGroupedMessage: (actors, msg) => actors.length <= 1 ? msg : grouped(actors, 'requested to join your group'),
    groupTag: 'groups',
  },
  {
    type: 'group_invite',
    label: 'Group Invite',
    category: 'groups',
    priority: 'high',
    icon: (s = 20) => <UserCheck size={s} style={{ color: '#0277BD' }} />,
    defaultRoute: '/groups',
    formatPushTitle: (name) => `${name} invited you to a group`,
    formatPushBody: (msg) => msg,
    formatGroupedMessage: (_actors, msg) => msg,
    groupTag: 'groups',
  },
  {
    type: 'group_accepted',
    label: 'Group Request Accepted',
    category: 'groups',
    priority: 'normal',
    icon: (s = 20) => <UserCheck size={s} style={{ color: '#388E3C' }} />,
    defaultRoute: '/groups',
    formatPushTitle: (_name) => 'Your group request was accepted',
    formatPushBody: (msg) => msg,
    formatGroupedMessage: (_actors, msg) => msg,
    groupTag: 'groups',
  },
  {
    type: 'group_removed',
    label: 'Removed from Group',
    category: 'groups',
    priority: 'high',
    icon: (s = 20) => <AlertTriangle size={s} style={{ color: '#F57C00' }} />,
    defaultRoute: '/groups',
    formatPushTitle: (_name) => 'You were removed from a group',
    formatPushBody: (msg) => msg,
    formatGroupedMessage: (_actors, msg) => msg,
    groupTag: 'groups',
  },

  // ── Chat ─────────────────────────────────────────────────────────────────────
  {
    type: 'message',
    label: 'Message',
    category: 'chat',
    priority: 'high',
    icon: (s = 20) => <MessageSquare size={s} style={{ color: '#0277BD' }} />,
    defaultRoute: '/messages',
    formatPushTitle: (name) => `New message from ${name}`,
    formatPushBody: (msg) => msg,
    formatGroupedMessage: (actors, msg) => actors.length <= 1 ? msg : grouped(actors, 'sent you messages'),
    groupTag: 'messages',
  },
  {
    type: 'conversation',
    label: 'Conversation',
    category: 'chat',
    priority: 'high',
    icon: (s = 20) => <MessageSquare size={s} style={{ color: '#0277BD' }} />,
    defaultRoute: '/messages',
    formatPushTitle: (name) => `New message from ${name}`,
    formatPushBody: (msg) => msg,
    formatGroupedMessage: (_actors, msg) => msg,
    groupTag: 'messages',
  },

  // ── Moderation ───────────────────────────────────────────────────────────────
  {
    type: 'moderation_alert',
    label: 'Moderation Alert',
    category: 'moderation',
    priority: 'critical',
    icon: (s = 20) => <Shield size={s} style={{ color: '#D32F2F' }} />,
    defaultRoute: '/',
    formatPushTitle: (_name) => 'Moderation alert',
    formatPushBody: (msg) => msg,
    formatGroupedMessage: (_actors, msg) => msg,
    groupTag: 'moderation',
  },
  {
    type: 'content_removed',
    label: 'Content Removed',
    category: 'moderation',
    priority: 'high',
    icon: (s = 20) => <AlertTriangle size={s} style={{ color: '#D32F2F' }} />,
    defaultRoute: '/',
    formatPushTitle: (_name) => 'Your content was removed',
    formatPushBody: (msg) => msg,
    formatGroupedMessage: (_actors, msg) => msg,
    groupTag: 'moderation',
  },
  {
    type: 'account_warning',
    label: 'Account Warning',
    category: 'moderation',
    priority: 'critical',
    icon: (s = 20) => <AlertTriangle size={s} style={{ color: '#F57C00' }} />,
    defaultRoute: '/settings',
    formatPushTitle: (_name) => 'Account warning issued',
    formatPushBody: (msg) => msg,
    formatGroupedMessage: (_actors, msg) => msg,
    groupTag: 'moderation',
  },

  // ── Admin ────────────────────────────────────────────────────────────────────
  {
    type: 'admin_notice',
    label: 'Admin Notice',
    category: 'admin',
    priority: 'high',
    icon: (s = 20) => <Megaphone size={s} style={{ color: '#7B1FA2' }} />,
    defaultRoute: '/',
    formatPushTitle: (_name) => 'Admin notice',
    formatPushBody: (msg) => msg,
    formatGroupedMessage: (_actors, msg) => msg,
    groupTag: 'admin',
  },

  // ── System ───────────────────────────────────────────────────────────────────
  {
    type: 'system',
    label: 'System',
    category: 'system',
    priority: 'normal',
    icon: (s = 20) => <Info size={s} style={{ color: '#5F6368' }} />,
    defaultRoute: '/',
    formatPushTitle: (_name) => 'System notification',
    formatPushBody: (msg) => msg,
    formatGroupedMessage: (_actors, msg) => msg,
    groupTag: 'system',
  },
  {
    type: 'system_alert',
    label: 'System Alert',
    category: 'system',
    priority: 'critical',
    icon: (s = 20) => <AlertTriangle size={s} style={{ color: '#F57C00' }} />,
    defaultRoute: '/',
    formatPushTitle: (_name) => 'System alert',
    formatPushBody: (msg) => msg,
    formatGroupedMessage: (_actors, msg) => msg,
    groupTag: 'system',
  },

  // ── AI (future-ready, req 10) ─────────────────────────────────────────────
  {
    type: 'ai_suggestion',
    label: 'AI Suggestion',
    category: 'system',
    priority: 'low',
    icon: (s = 20) => <Bot size={s} style={{ color: '#00897B' }} />,
    defaultRoute: '/',
    formatPushTitle: (_name) => 'AI has a suggestion for you',
    formatPushBody: (msg) => msg,
    formatGroupedMessage: (_actors, msg) => msg,
    groupTag: 'ai',
  },
  {
    type: 'ai_summary',
    label: 'AI Summary',
    category: 'system',
    priority: 'low',
    icon: (s = 20) => <Bot size={s} style={{ color: '#00897B' }} />,
    defaultRoute: '/',
    formatPushTitle: (_name) => 'Your AI summary is ready',
    formatPushBody: (msg) => msg,
    formatGroupedMessage: (_actors, msg) => msg,
    groupTag: 'ai',
  },

  // ── Push formatting (future-ready, req 10) ────────────────────────────────
  {
    type: 'push_campaign',
    label: 'Announcement',
    category: 'admin',
    priority: 'normal',
    icon: (s = 20) => <Zap size={s} style={{ color: '#F57C00' }} />,
    defaultRoute: '/',
    formatPushTitle: (_name) => 'New announcement',
    formatPushBody: (msg) => msg,
    formatGroupedMessage: (_actors, msg) => msg,
    groupTag: 'admin',
  },
];

// ─── Registry map ─────────────────────────────────────────────────────────────
// Built once on module load. Keys: normalized lowercase + uppercase variants.

const REGISTRY_MAP = new Map<string, NotificationRegistryEntry>(
  REGISTRY_ENTRIES.flatMap((entry) => {
    const lower = normalizeType(entry.type);
    const upper = lower.toUpperCase();
    return [
      [lower, entry],
      [upper, entry],
    ] as Array<[string, NotificationRegistryEntry]>;
  }),
);

// ─── Fallback entry (req 8) ───────────────────────────────────────────────────

const FALLBACK_ENTRY: NotificationRegistryEntry = {
  type: 'unknown',
  label: 'Notification',
  category: 'system',
  priority: 'normal',
  icon: (s = 20) => <Bell size={s} style={{ color: '#5F6368' }} />,
  defaultRoute: '/notifications',
  formatPushTitle: (_name) => 'New notification',
  formatPushBody: (msg) => msg,
  formatGroupedMessage: (_actors, msg) => msg,
  groupTag: 'general',
};

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Look up a registry entry by notification type string.
 * Handles uppercase, lowercase, and hyphenated variants automatically.
 * Returns a generic fallback entry for completely unknown types (req 8).
 *
 * @example
 *   getNotificationEntry('like')           // exact match
 *   getNotificationEntry('LIKE')           // uppercase alias
 *   getNotificationEntry('group_join_request') // underscore form
 *   getNotificationEntry('completely_new') // → FALLBACK_ENTRY
 */
export function getNotificationEntry(type: string): NotificationRegistryEntry {
  return REGISTRY_MAP.get(normalizeType(type)) ?? FALLBACK_ENTRY;
}

/**
 * Render the icon for a notification type.
 * Falls back to a generic Bell icon for unknown types.
 */
export function renderNotificationIcon(type: string, size?: number): React.ReactElement {
  return getNotificationEntry(type).icon(size);
}

/**
 * Get the NotificationCategory for a type string.
 * Replaces all local getCategoryForType() helper functions in the codebase.
 */
export function getCategoryForType(type: string): NotificationCategory {
  return getNotificationEntry(type).category;
}
