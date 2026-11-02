import React, { useState, useEffect } from 'react';
import { getNotificationEntry, renderNotificationIcon } from '@/lib/notificationRegistry';
import type { NotificationActor } from '@/types/notification';
import { useRequireAuth } from '@/hooks/useRequireAuth';

// ─── Relative-time formatter ─────────────────────────────────────────────────
// Stored in UI layer only — raw createdAt ms is what lives in Redux.

const getTimeAgo = (ms: number): string => {
  const diff = Date.now() - ms;
  if (diff < 60_000) return 'just now';
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(diff / 3_600_000);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(diff / 86_400_000);
  if (days < 7) return `${days}d`;
  const weeks = Math.floor(diff / 604_800_000);
  if (weeks < 4) return `${weeks}w`;
  const months = Math.floor(diff / 2_629_800_000);
  if (months < 12) return `${months}mo`;
  return `${Math.floor(diff / 31_557_600_000)}y`;
};

export interface NotificationCardProps {
  id: string;
  type: string;
  user: {
    name: string;
    avatar: string;
  };
  message: string;
  /** Raw Unix ms — formatted in this component. Never pre-format before passing. */
  createdAt: number;
  isRead: boolean;
  requestId?: string;
  canAct?: boolean;
  onClick: (id: string) => void;
  onConnectionRequestAction?: (notificationId: string, requestId: string, action: 'accept' | 'delete') => Promise<void> | void;
  /**
   * Optional: additional actors for grouped rendering (req 9).
   * When provided with more than one entry, the card renders a grouped message
   * using the registry's formatGroupedMessage and shows stacked avatars.
   */
  actors?: NotificationActor[];
}

export const NotificationCard: React.FC<NotificationCardProps> = ({
  id,
  type,
  user,
  message,
  createdAt,
  isRead,
  requestId,
  canAct,
  onClick,
  actors,
  onConnectionRequestAction,
}) => {
  const requireAuth = useRequireAuth();
  // Live-updating relative timestamp — refreshes every minute
  const [relativeTime, setRelativeTime] = useState(() => getTimeAgo(createdAt));
  const [actionState, setActionState] = useState<'idle' | 'accepting' | 'deleting'>('idle');

  useEffect(() => {
    setRelativeTime(getTimeAgo(createdAt));
    const interval = setInterval(() => {
      setRelativeTime(getTimeAgo(createdAt));
    }, 60_000);
    return () => clearInterval(interval);
  }, [createdAt]);

  // ── Registry lookup ────────────────────────────────────────────────────────
  const entry = getNotificationEntry(type);

  // Use grouped message when multiple actors are provided
  const displayMessage =
    actors && actors.length > 1
      ? entry.formatGroupedMessage(actors, message)
      : message;

  // Show stacked avatars for grouped notifications
  const isGrouped = actors && actors.length > 1;
  const extraCount = isGrouped ? actors.length - 2 : 0;

  const handleAction = async (action: 'accept' | 'delete', event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation()
    if (!requireAuth()) return
    if (!requestId || !onConnectionRequestAction) return

    setActionState(action === 'accept' ? 'accepting' : 'deleting')
    await onConnectionRequestAction(id, requestId, action)
    setActionState('idle')
  }

  return (
    <div
      onClick={() => onClick(id)}
      className={`bg-white rounded-2xl shadow-sm border p-5 hover:shadow-md transition-all cursor-pointer notification-fade-in ${
        !isRead ? 'border-blue-600 border-2' : 'border-neutral-800 border'
      } flex items-start gap-4`}
      style={{ borderLeft: !isRead ? '4px solid #1976D2' : undefined }}
    >
      {/* Avatar + Icon */}
      <div className="relative flex-shrink-0">
        {isGrouped ? (
          // Stacked avatars for grouped notifications
          <div className="relative w-12 h-12">
            {actors.slice(0, 2).map((actor, i) => (
              <img
                key={actor.id}
                src={actor.avatar}
                alt={actor.name}
                className="w-9 h-9 rounded-full object-cover absolute border-2 border-white"
                style={{ left: i * 10, top: i * 6, zIndex: 2 - i }}
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src =
                    'https://ui-avatars.com/api/?name=' + encodeURIComponent(actor.name);
                }}
              />
            ))}
            {extraCount > 0 && (
              <span
                className="absolute -bottom-1 -right-2 bg-gray-200 text-gray-600 text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center border-2 border-white"
                style={{ zIndex: 3 }}
              >
                +{extraCount}
              </span>
            )}
          </div>
        ) : (
          <img
            src={user.avatar}
            alt={user.name}
            className="w-12 h-12 rounded-full object-cover"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).src =
                'https://ui-avatars.com/api/?name=' + encodeURIComponent(user.name);
            }}
          />
        )}
        <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-1 shadow-sm">
          {renderNotificationIcon(type)}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2 mb-1">
          <p className={`text-base ${!isRead ? 'font-bold' : ''} text-black`}>
            {isGrouped ? (
              <span>{displayMessage}</span>
            ) : (
              <>
                <span className="font-semibold">{user.name}</span>{' '}
                <span className="text-neutral-500">{displayMessage}</span>
              </>
            )}
          </p>

          {/* Unread dot */}
          {!isRead && (
            <div className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0 bg-blue-600" />
          )}
        </div>

        <p className="text-xs text-neutral-400">{relativeTime}</p>

        {canAct && requestId && (
          <div className="mt-3 flex flex-wrap gap-2" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={(e) => handleAction('accept', e)}
              disabled={actionState !== 'idle'}
              className="rounded-lg border border-green-600 px-3 py-1.5 text-sm font-medium text-green-700 transition hover:bg-green-50 disabled:opacity-60"
            >
              {actionState === 'accepting' ? 'Accepting...' : 'Accept'}
            </button>
            <button
              type="button"
              onClick={(e) => handleAction('delete', e)}
              disabled={actionState !== 'idle'}
              className="rounded-lg border border-red-600 px-3 py-1.5 text-sm font-medium text-red-700 transition hover:bg-red-50 disabled:opacity-60"
            >
              {actionState === 'deleting' ? 'Deleting...' : 'Delete'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};