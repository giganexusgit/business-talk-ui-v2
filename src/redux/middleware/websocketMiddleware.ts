/**
 * WebSocket middleware for Redux.
 *
 * Responsibilities:
 *  - Intercepts `ws/emitTyping` and `ws/emitMessage` virtual actions and
 *    forwards them to the WebSocket layer.
 *  - All *incoming* socket events are handled in WebSocketProvider, which
 *    dispatches the real slice actions (wsMessageReceived, wsTypingReceived …).
 *
 * The wsManager reference is injected via `registerWsManager`, called from
 * WebSocketProvider once the socket connects.  This avoids putting a
 * non-serializable value inside Redux state.
 */

import type { Middleware, MiddlewareAPI, Dispatch, AnyAction } from '@reduxjs/toolkit';
import type WebSocketManager from '@/lib/websocket';
import { CHAT_EVENTS } from '@/lib/chat/events';

// ─── Module-level manager reference ───────────────────────────────────────────

let _wsManager: WebSocketManager | null = null;

/** Called by WebSocketProvider when the socket connects / disconnects. */
export const registerWsManager = (manager: WebSocketManager | null): void => {
  _wsManager = manager;
};

export const getRegisteredWsManager = (): WebSocketManager | null => _wsManager;

// ─── Virtual action types (never reach reducers) ───────────────────────────────

export const WS_EMIT_TYPING = 'ws/emitTyping' as const;
export const WS_EMIT_MESSAGE = 'ws/emitMessage' as const;
export const WS_EMIT_MARK_SEEN = 'ws/emitMarkSeen' as const;

// ─── Action creators for outgoing events ──────────────────────────────────────

export interface EmitTypingPayload {
  conversationId: string;
}

export interface EmitMarkSeenPayload {
  conversationId: string;
}

// broad payload shape — no index signature needed on callers
export type EmitMessagePayload = Record<string, any>; // eslint-disable-line

export const emitTypingAction = (
  payload: EmitTypingPayload,
): { type: typeof WS_EMIT_TYPING; payload: EmitTypingPayload } => ({
  type: WS_EMIT_TYPING,
  payload,
});

export const emitMarkSeenAction = (
  payload: EmitMarkSeenPayload,
): { type: typeof WS_EMIT_MARK_SEEN; payload: EmitMarkSeenPayload } => ({
  type: WS_EMIT_MARK_SEEN,
  payload,
});

export const emitMessageAction = (
  payload: EmitMessagePayload,
): { type: typeof WS_EMIT_MESSAGE; payload: EmitMessagePayload } => ({
  type: WS_EMIT_MESSAGE,
  payload,
});

// ─── Middleware ────────────────────────────────────────────────────────────────

export const websocketMiddleware = ((
  (_store: MiddlewareAPI) =>
  (next: Dispatch) =>
  (action: unknown) => {
    const a = action as AnyAction;
    // Outgoing typing indicator — fire-and-forget, stop here
    if (a.type === WS_EMIT_TYPING) {
      _wsManager?.emit(CHAT_EVENTS.TYPING_START, a.payload);
      return;
    }

    // Outgoing mark seen — fire-and-forget, stop here
    if (a.type === WS_EMIT_MARK_SEEN) {
      _wsManager?.emit('markSeen', a.payload);
      return;
    }

    // Outgoing message emit — fire-and-forget, stop here
    if (a.type === WS_EMIT_MESSAGE) {
      _wsManager?.emit(CHAT_EVENTS.MESSAGE_SEND, a.payload);
      return;
    }

    // All other actions pass through to reducers normally
    return next(a);
  }
) as unknown as Middleware);

