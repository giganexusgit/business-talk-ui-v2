/**
 * Push notification Redux slice — Businesstalk24
 *
 * Tracks permission state, FCM token, user preferences, and
 * registration status. Does NOT call FCM APIs directly —
 * that lives in src/lib/fcm.ts.
 */

import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit';
import type { PushPermissionState } from '@/lib/fcm';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PushPreferences {
  /** Master switch — if false, no push notifications are shown. */
  enabled: boolean;
  /** Individual category toggles */
  likes: boolean;
  comments: boolean;
  follows: boolean;
  messages: boolean;
  mentions: boolean;
  groups: boolean;
  systemAlerts: boolean;
}

export interface PushState {
  permission: PushPermissionState;
  token: string | null;
  isRegistering: boolean;
  registrationError: string | null;
  /** True once the token has been sent to the backend successfully. */
  isRegisteredWithBackend: boolean;
  preferences: PushPreferences;
  /** Number of pending push notifications (synced from server unread count). */
  badgeCount: number;
}

// ─── Default preferences ─────────────────────────────────────────────────────

const DEFAULT_PREFS: PushPreferences = {
  enabled: true,
  likes: true,
  comments: true,
  follows: true,
  messages: true,
  mentions: true,
  groups: true,
  systemAlerts: true,
};

const PREFS_STORAGE_KEY = 'bt24_push_prefs';

const loadStoredPrefs = (): PushPreferences => {
  try {
    const raw = typeof localStorage !== 'undefined'
      ? localStorage.getItem(PREFS_STORAGE_KEY)
      : null;
    if (!raw) return DEFAULT_PREFS;
    return { ...DEFAULT_PREFS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_PREFS;
  }
};

const savePrefs = (prefs: PushPreferences): void => {
  try {
    localStorage.setItem(PREFS_STORAGE_KEY, JSON.stringify(prefs));
  } catch {}
};

// ─── Async thunks ─────────────────────────────────────────────────────────────

/**
 * Request push permission + register FCM token.
 * Dynamic import keeps firebase out of the SSR bundle.
 */
export const requestPushPermission = createAsyncThunk<
  { token: string | null; permission: PushPermissionState },
  void,
  { rejectValue: string }
>('push/requestPermission', async (_, { getState, rejectWithValue }) => {
  const authState = (getState() as { auth?: { isAuthenticated?: boolean } })?.auth;
  if (!authState?.isAuthenticated) {
    return rejectWithValue('User is not authenticated');
  }
  try {
    const { registerForPushNotifications } = await import('@/lib/fcm');
    const result = await registerForPushNotifications();
    if (result.error && !result.token) {
      return rejectWithValue(result.error);
    }
    return { token: result.token, permission: result.permission };
  } catch (err: any) {
    return rejectWithValue(err?.message ?? 'Failed to request permission');
  }
});

/** Revoke push — unregister from FCM and backend. */
export const revokePushPermission = createAsyncThunk<void, void>(
  'push/revoke',
  async () => {
    const { unregisterFromPushNotifications } = await import('@/lib/fcm');
    await unregisterFromPushNotifications();
  },
);

/** Force-refresh the FCM token (req 19). */
export const refreshPushTokenThunk = createAsyncThunk<
  string | null,
  void,
  { rejectValue: string }
>('push/refreshToken', async (_, { getState, rejectWithValue }) => {
  const authState = (getState() as { auth?: { isAuthenticated?: boolean } })?.auth;
  if (!authState?.isAuthenticated) {
    return null;
  }
  try {
    const { refreshPushToken } = await import('@/lib/fcm');
    return await refreshPushToken();
  } catch (err: any) {
    return rejectWithValue(err?.message ?? 'Failed to refresh push token');
  }
});

/** Persist preference update to localStorage + (optionally) backend. */
export const savePushPreferences = createAsyncThunk<
  PushPreferences,
  Partial<PushPreferences>
>('push/savePreferences', async (partial, { getState }) => {
  const state = (getState() as { push: PushState }).push;
  const updated = { ...state.preferences, ...partial } as PushPreferences;
  savePrefs(updated);

  // Best-effort: sync to backend (non-critical)
  try {
    const apiClient = (await import('@/lib/api-client')).default;
    await apiClient.updatePushPreferences(updated as unknown as Record<string, boolean>);
  } catch {}

  return updated;
});

// ─── Slice ────────────────────────────────────────────────────────────────────

const pushSlice = createSlice({
  name: 'push',
  initialState: (): PushState => ({
    permission: 'default',
    token: null,
    isRegistering: false,
    registrationError: null,
    isRegisteredWithBackend: false,
    preferences: loadStoredPrefs(),
    badgeCount: 0,
  }),
  reducers: {
    /** Sync permission state from Notification.permission on mount. */
    syncPermissionState(state, action: PayloadAction<PushPermissionState>) {
      state.permission = action.payload;
    },
    /** Update badge count from server unread count (req 9). */
    setBadgeCount(state, action: PayloadAction<number>) {
      state.badgeCount = action.payload;
    },
    /** Called when FCM reports a token refresh (req 19). */
    tokenRefreshed(state, action: PayloadAction<string>) {
      state.token = action.payload;
    },
    clearRegistrationError(state) {
      state.registrationError = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // requestPushPermission
      .addCase(requestPushPermission.pending, (state) => {
        state.isRegistering = true;
        state.registrationError = null;
      })
      .addCase(requestPushPermission.fulfilled, (state, action) => {
        state.isRegistering = false;
        state.token = action.payload.token;
        state.permission = action.payload.permission;
        state.isRegisteredWithBackend = !!action.payload.token;
      })
      .addCase(requestPushPermission.rejected, (state, action) => {
        state.isRegistering = false;
        state.registrationError = action.payload ?? 'Unknown error';
      })

      // revokePushPermission
      .addCase(revokePushPermission.fulfilled, (state) => {
        state.token = null;
        state.isRegisteredWithBackend = false;
        state.permission = 'denied';
      })

      // refreshPushTokenThunk
      .addCase(refreshPushTokenThunk.fulfilled, (state, action) => {
        if (action.payload) {
          state.token = action.payload;
          state.isRegisteredWithBackend = true;
        }
      })
      .addCase(refreshPushTokenThunk.rejected, (state, action) => {
        if (action.payload) {
          state.registrationError = action.payload;
        }
      })

      // savePushPreferences
      .addCase(savePushPreferences.fulfilled, (state, action) => {
        state.preferences = action.payload;
      });
  },
});

export const {
  syncPermissionState,
  setBadgeCount,
  tokenRefreshed,
  clearRegistrationError,
} = pushSlice.actions;

export default pushSlice.reducer;
