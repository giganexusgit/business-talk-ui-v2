/**
 * FCM Token Manager — Businesstalk24
 *
 * Handles:
 *   - Permission request flow (req 3)
 *   - Service worker registration + Firebase config injection (req 2)
 *   - Token retrieval + registration with backend (req 7)
 *   - Token refresh via onTokenRefresh (req 19)
 *   - Retryable registration with exponential back-off (req 18)
 *   - Safari / iOS PWA compatibility guards (req 13)
 *   - Android Chrome (standard FCM Web push) (req 12)
 */

import {
  getToken,
  onMessage,
  deleteToken,
  type MessagePayload,
} from 'firebase/messaging';
import { getFirebaseMessaging, firebaseConfig, VAPID_KEY } from './firebase';
import apiClient from './api-client';

// ─── Types ────────────────────────────────────────────────────────────────────

export type PushPermissionState = 'default' | 'granted' | 'denied' | 'unsupported';

export interface FcmRegistrationResult {
  token: string | null;
  permission: PushPermissionState;
  error?: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const TOKEN_STORAGE_KEY = 'bt24_fcm_token';
const TOKEN_EXPIRY_KEY = 'bt24_fcm_token_expiry';
/** Token is valid for 30 days; we refresh proactively. */
const TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const MAX_RETRIES = 3;
const BASE_RETRY_DELAY_MS = 2000;

// ─── Permission helpers ───────────────────────────────────────────────────────

export const getPushPermissionState = (): PushPermissionState => {
  if (typeof window === 'undefined') return 'unsupported';
  if (!('Notification' in window)) return 'unsupported';
  if (!('serviceWorker' in navigator)) return 'unsupported';
  return (Notification.permission as PushPermissionState) ?? 'default';
};

export const isPushSupported = (): boolean => {
  if (typeof window === 'undefined') return false;
  return (
    'Notification' in window &&
    'serviceWorker' in navigator &&
    'PushManager' in window
  );
};

/** iOS Safari 16.4+ supports web push when installed as PWA. */
export const isSafariPwaContext = (): boolean => {
  if (typeof window === 'undefined') return false;
  // @ts-ignore – iOS-specific property
  return !!window.navigator.standalone;
};

// ─── Service Worker ───────────────────────────────────────────────────────────

let swRegistration: ServiceWorkerRegistration | null = null;

/**
 * Registers the Firebase messaging service worker and injects the
 * Firebase config via `postMessage` so the SW can initialise FCM.
 */
export const registerServiceWorker =
  async (): Promise<ServiceWorkerRegistration | null> => {
    if (!('serviceWorker' in navigator)) return null;
    if (swRegistration) return swRegistration;

    try {
      const reg = await navigator.serviceWorker.register(
        '/firebase-messaging-sw.js',
        { scope: '/' },
      );

      await navigator.serviceWorker.ready;

      // Inject Firebase config into the service worker (req 2)
      const sw = reg.installing ?? reg.waiting ?? reg.active;
      if (sw) {
        sw.postMessage({ type: 'FIREBASE_CONFIG', config: firebaseConfig });
      }

      swRegistration = reg;
      return reg;
    } catch (err) {
      console.error('[FCM] SW registration failed:', err);
      return null;
    }
  };

// ─── Token management ─────────────────────────────────────────────────────────

const getStoredToken = (): string | null => {
  try {
    const token = localStorage.getItem(TOKEN_STORAGE_KEY);
    const expiry = Number(localStorage.getItem(TOKEN_EXPIRY_KEY) ?? 0);
    if (!token || Date.now() > expiry) return null;
    return token;
  } catch {
    return null;
  }
};

const storeToken = (token: string): void => {
  try {
    localStorage.setItem(TOKEN_STORAGE_KEY, token);
    localStorage.setItem(TOKEN_EXPIRY_KEY, String(Date.now() + TOKEN_TTL_MS));
  } catch {}
};

const clearStoredToken = (): void => {
  try {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    localStorage.removeItem(TOKEN_EXPIRY_KEY);
  } catch {}
};

// ─── Backend registration ─────────────────────────────────────────────────────

/**
 * Register push token with the backend (req 7).
 * Retries up to MAX_RETRIES times with exponential back-off (req 18).
 */
const registerTokenWithBackend = async (
  token: string,
  attempt = 0,
): Promise<void> => {
  try {
    await apiClient.registerPushToken(token);
  } catch (err: any) {
    const status = err?.response?.status ?? err?.status;
    if (status === 401 || status === 403) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('[FCM] Skipped registering push token: user is unauthenticated (401/403)');
      }
      return;
    }
    if (attempt < MAX_RETRIES - 1) {
      const delay = BASE_RETRY_DELAY_MS * 2 ** attempt;
      await new Promise((r) => setTimeout(r, delay));
      return registerTokenWithBackend(token, attempt + 1);
    }
    console.warn('[FCM] Backend token registration failed after retries:', err?.message ?? err);
  }
};

const unregisterTokenFromBackend = async (token: string): Promise<void> => {
  try {
    await apiClient.unregisterPushToken(token);
  } catch {}
};

// ─── Main registration flow ───────────────────────────────────────────────────

/**
 * Full push registration flow:
 * 1. Check support + permission
 * 2. Register service worker
 * 3. Get / refresh FCM token
 * 4. Register token with backend
 *
 * Returns the result regardless of success/failure.
 */
export const registerForPushNotifications =
  async (): Promise<FcmRegistrationResult> => {
    if (!isPushSupported()) {
      return { token: null, permission: 'unsupported', error: 'Push not supported' };
    }

    // Request permission if needed (req 3)
    let permission = Notification.permission as PushPermissionState;
    if (permission === 'default') {
      const result = await Notification.requestPermission();
      permission = result as PushPermissionState;
    }

    if (permission !== 'granted') {
      return { token: null, permission, error: 'Permission not granted' };
    }

    // Register / retrieve SW
    const swReg = await registerServiceWorker();
    if (!swReg) {
      return {
        token: null,
        permission: 'granted',
        error: 'Service worker registration failed',
      };
    }

    // Check cached token first
    const cached = getStoredToken();
    if (cached) {
      return { token: cached, permission: 'granted' };
    }

    const messaging = getFirebaseMessaging();
    if (!messaging) {
      return {
        token: null,
        permission: 'granted',
        error: 'Firebase messaging unavailable',
      };
    }

    try {
      const token = await getToken(messaging, {
        vapidKey: VAPID_KEY,
        serviceWorkerRegistration: swReg,
      });

      if (token) {
        storeToken(token);
        await registerTokenWithBackend(token);
        return { token, permission: 'granted' };
      }

      return {
        token: null,
        permission: 'granted',
        error: 'Failed to retrieve FCM token',
      };
    } catch (err: any) {
      return {
        token: null,
        permission: 'granted',
        error: err?.message ?? 'Unknown error',
      };
    }
  };

/**
 * Revoke push registration — unregisters token from backend and FCM.
 */
export const unregisterFromPushNotifications = async (): Promise<void> => {
  const messaging = getFirebaseMessaging();
  const stored = getStoredToken();

  if (stored) {
    await unregisterTokenFromBackend(stored);
  }

  if (messaging) {
    try {
      await deleteToken(messaging);
    } catch {}
  }

  clearStoredToken();
};

/**
 * Subscribe to foreground FCM messages (req 4).
 * Returns an unsubscribe function.
 *
 * The app is in the foreground — the SW will NOT show a notification,
 * so the caller is responsible for displaying an in-app toast.
 */
export const subscribeToForegroundMessages = (
  handler: (payload: MessagePayload) => void,
): (() => void) => {
  const messaging = getFirebaseMessaging();
  if (!messaging) return () => {};
  return onMessage(messaging, handler);
};

/**
 * Force-refresh the FCM token (req 19).
 * Should be called periodically or when the token is known to be stale.
 */
export const refreshPushToken = async (): Promise<string | null> => {
  clearStoredToken();
  const result = await registerForPushNotifications();
  return result.token;
};
