import { create } from 'zustand';
import { AutoLockTimeoutOption } from '../services/securityService';

export interface AuthState {
  isPinEnabled: boolean;
  isLocked: boolean;
  pinLength: 4 | 6;
  autoLockTimeout: AutoLockTimeoutOption;
  failedAttempts: number;
  lockoutUntil: number | null;
  lastActivityTimestamp: number;

  setPinEnabled: (enabled: boolean) => void;
  setPinLength: (length: 4 | 6) => void;
  lockApp: () => void;
  unlockApp: () => void;
  recordFailedAttempt: () => void;
  resetFailedAttempts: () => void;
  updateActivityTimestamp: () => void;
  setAutoLockTimeout: (timeout: AutoLockTimeoutOption) => void;
  isLockedOut: () => boolean;
  getLockoutRemainingSeconds: () => number;
  checkAutoLock: () => boolean;
  resetAll: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  isPinEnabled: false,
  isLocked: false,
  pinLength: 4,
  autoLockTimeout: '5min',
  failedAttempts: 0,
  lockoutUntil: null,
  lastActivityTimestamp: Date.now(),

  setPinEnabled: (enabled) => set({ isPinEnabled: enabled }),
  setPinLength: (length) => set({ pinLength: length }),

  lockApp: () => {
    const { isPinEnabled } = get();
    if (isPinEnabled) {
      set({ isLocked: true });
    }
  },

  unlockApp: () => {
    set({ isLocked: false, failedAttempts: 0, lockoutUntil: null, lastActivityTimestamp: Date.now() });
  },

  recordFailedAttempt: () => {
    const current = get().failedAttempts + 1;
    let lockoutTime: number | null = null;
    if (current >= 5) {
      lockoutTime = Date.now() + 5 * 60 * 1000; // 5 minutes in ms
    }
    set({ failedAttempts: current, lockoutUntil: lockoutTime });
  },

  resetFailedAttempts: () => {
    set({ failedAttempts: 0, lockoutUntil: null });
  },

  updateActivityTimestamp: () => {
    set({ lastActivityTimestamp: Date.now() });
  },

  setAutoLockTimeout: (timeout) => set({ autoLockTimeout: timeout }),

  isLockedOut: () => {
    const { lockoutUntil } = get();
    if (!lockoutUntil) return false;
    if (Date.now() >= lockoutUntil) {
      set({ lockoutUntil: null, failedAttempts: 0 });
      return false;
    }
    return true;
  },

  getLockoutRemainingSeconds: () => {
    const { lockoutUntil } = get();
    if (!lockoutUntil) return 0;
    const diff = Math.max(0, Math.ceil((lockoutUntil - Date.now()) / 1000));
    return diff;
  },

  checkAutoLock: () => {
    const { isPinEnabled, isLocked, autoLockTimeout, lastActivityTimestamp } = get();
    if (!isPinEnabled || isLocked || autoLockTimeout === 'never') {
      return false;
    }

    const elapsedMs = Date.now() - lastActivityTimestamp;

    let maxIdleMs = 300 * 1000; // default 5min
    if (autoLockTimeout === 'immediate') {
      maxIdleMs = 0;
    } else if (autoLockTimeout === '1min') {
      maxIdleMs = 60 * 1000;
    } else if (autoLockTimeout === '5min') {
      maxIdleMs = 5 * 60 * 1000;
    } else if (autoLockTimeout === '15min') {
      maxIdleMs = 15 * 60 * 1000;
    }

    if (elapsedMs >= maxIdleMs) {
      set({ isLocked: true });
      return true;
    }

    return false;
  },

  resetAll: () => {
    set({
      isPinEnabled: false,
      isLocked: false,
      pinLength: 4,
      autoLockTimeout: '5min',
      failedAttempts: 0,
      lockoutUntil: null,
      lastActivityTimestamp: Date.now(),
    });
  },
}));
