import {
  isRawMessageContract,
  type RawMessageContract,
  warnInvalidMessageContract,
} from '@/lib/chat/normalizeMessage';

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

export function parseWsMessagePayload(payload: unknown): RawMessageContract | null {
  if (!isRawMessageContract(payload)) {
    warnInvalidMessageContract(payload, 'websocket');
    return null;
  }
  return payload;
}

export function parseWsTypingPayload(payload: unknown): { conversationId: string; userName: string } | null {
  if (!isObject(payload)) return null;
  if (typeof payload.conversationId !== 'string' || payload.conversationId.length === 0) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('[chat-contract] Invalid typing payload: missing conversationId', payload);
    }
    return null;
  }
  
  // Issue 4: Support both backend formats
  // Prefer userName if available, fallback to userId (backend may send userId only)
  let userName = '';
  if (typeof payload.userName === 'string' && payload.userName.length > 0) {
    userName = payload.userName;
  } else if (typeof payload.userId === 'string' && payload.userId.length > 0) {
    // Fallback: userId without userName is valid but less informative
    if (process.env.NODE_ENV === 'development') {
      console.warn('[chat-contract] Typing payload has userId but missing userName, falling back to "Someone"', payload);
    }
    userName = 'Someone';
  } else {
    userName = 'Someone';
  }
  
  return { conversationId: payload.conversationId, userName };
}

export function parseWsPresencePayload(payload: unknown): { userId: string } | null {
  if (!isObject(payload)) return null;
  if (typeof payload.userId !== 'string' || payload.userId.length === 0) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('[chat-contract] Invalid presence payload: missing userId', payload);
    }
    return null;
  }
  return { userId: payload.userId };
}

export function parseWsPresenceSyncPayload(payload: unknown): { onlineUserIds: string[] } | null {
  if (!isObject(payload)) return null;
  const list = (payload as any).onlineUserIds ?? (payload as any).users ?? payload;
  if (Array.isArray(list)) {
    return { onlineUserIds: list.map(String) };
  }
  return null;
}
