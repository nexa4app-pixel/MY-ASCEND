import { db } from '../db/client';
import { useAuthStore } from '../stores/authStore';
import { logger } from './logger';

export type AutoLockTimeoutOption = 'immediate' | '1min' | '5min' | '15min' | 'never';

class SecurityService {
  /**
   * Generates a SHA-256 hash string for a raw numeric PIN code using Web Crypto API.
   */
  public async hashPin(pin: string): Promise<string> {
    if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
      const encoder = new TextEncoder();
      const data = encoder.encode(`MY_ASCEND_SALT_${pin}`);
      const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
    }
    // Fallback for simple environment hash
    let hash = 0;
    const str = `MY_ASCEND_SALT_${pin}`;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash |= 0;
    }
    return `fallback_hash_${Math.abs(hash)}`;
  }

  /**
   * Set up a new 4 or 6 digit PIN.
   */
  public async setupPin(newPin: string, length: 4 | 6 = 4): Promise<void> {
    const trimmed = newPin.trim();
    if (!/^\d+$/.test(trimmed) || trimmed.length !== length) {
      throw new Error(`رمز عبور باید دقیقاً ${length} رقم عددی باشد.`);
    }

    const hashed = await this.hashPin(trimmed);
    const deviceId = 'default_device';

    await db.setSetting('setting_pin_hash', 'security_pin_hash', hashed, deviceId);
    await db.setSetting('setting_pin_enabled', 'security_pin_enabled', 'true', deviceId);
    await db.setSetting('setting_pin_length', 'security_pin_length', String(length), deviceId);

    const store = useAuthStore.getState();
    store.setPinEnabled(true);
    store.setPinLength(length);
    store.resetFailedAttempts();
    store.unlockApp();

    logger.info(`PIN setup successful (${length} digits)`, 'SecurityService');
  }

  /**
   * Verify an entered PIN against stored hash.
   * Tracks failed attempts and triggers 5-minute lockout after 5 consecutive failures.
   */
  public async verifyPin(enteredPin: string): Promise<boolean> {
    const store = useAuthStore.getState();

    // Check if user is currently locked out
    if (store.isLockedOut()) {
      const remaining = store.getLockoutRemainingSeconds();
      throw new Error(`حساب کاربری موقتاً قفل شده است. لطفاً ${remaining} ثانیه دیگر دوباره تلاش کنید.`);
    }

    const storedHash = await db.getSetting('security_pin_hash');
    if (!storedHash) {
      // If no PIN set, unlock
      store.unlockApp();
      return true;
    }

    const hashedInput = await this.hashPin(enteredPin.trim());

    if (hashedInput === storedHash) {
      store.resetFailedAttempts();
      store.unlockApp();
      logger.info('PIN verification succeeded', 'SecurityService');
      return true;
    } else {
      store.recordFailedAttempt();
      const currentAttempts = useAuthStore.getState().failedAttempts;

      if (currentAttempts >= 5) {
        logger.warn('Max PIN failed attempts reached (5). Triggering 5-minute lockout.', 'SecurityService');
        throw new Error('به دلیل ۵ بار ورود اشتباه، برنامه به مدت ۵ دقیقه قفل شد.');
      } else {
        const remainingAttempts = 5 - currentAttempts;
        throw new Error(`رمز عبور اشتباه است. (${remainingAttempts} تلاش باقی‌مانده)`);
      }
    }
  }

  /**
   * Change current PIN.
   */
  public async changePin(currentPin: string, newPin: string, length: 4 | 6 = 4): Promise<void> {
    const isValidCurrent = await this.verifyPin(currentPin);
    if (!isValidCurrent) {
      throw new Error('رمز عبور فعلی اشتباه است.');
    }
    await this.setupPin(newPin, length);
  }

  /**
   * Disable PIN lock (requires current PIN).
   */
  public async disablePin(currentPin: string): Promise<void> {
    const isValidCurrent = await this.verifyPin(currentPin);
    if (!isValidCurrent) {
      throw new Error('رمز عبور فعلی اشتباه است.');
    }

    const deviceId = 'default_device';
    await db.setSetting('setting_pin_enabled', 'security_pin_enabled', 'false', deviceId);

    const store = useAuthStore.getState();
    store.setPinEnabled(false);
    store.unlockApp();

    logger.info('PIN lock disabled successfully', 'SecurityService');
  }

  /**
   * Set Auto-Lock Timeout option.
   */
  public async setAutoLockTimeout(timeout: AutoLockTimeoutOption): Promise<void> {
    const deviceId = 'default_device';
    await db.setSetting('setting_auto_lock', 'security_auto_lock_timeout', timeout, deviceId);
    useAuthStore.getState().setAutoLockTimeout(timeout);
  }

  /**
   * Emergency Reset: Perform complete data wipe and reset security credentials.
   */
  public async emergencyReset(): Promise<void> {
    logger.warn('EMERGENCY RESET TRIGGERED: Wiping database and security state!', 'SecurityService');

    const tables = [
      'profiles',
      'areas',
      'devices',
      'settings',
      'inbox_captures',
      'notes',
      'visions',
      'goals',
      'projects',
      'tasks',
      'habits',
      'habit_logs',
      'institutions',
      'subjects',
      'books',
      'chapters',
      'sections',
      'topics',
      'schedules',
      'learning_sessions',
      'learning_evidence',
      'mastery_records',
      'focus_sessions',
      'events',
      'journals',
      'memories',
      'files',
      'attachments',
      'reminders',
      'activity_history',
      'change_logs',
      'trash',
      'global_search_fts',
    ];

    await db.execute('BEGIN');
    try {
      for (const t of tables) {
        try {
          await db.execute(`DELETE FROM ${t}`);
        } catch {
          // Table might not exist in all environments
        }
      }
      await db.execute('COMMIT');
    } catch (err) {
      await db.execute('ROLLBACK');
      throw err;
    }

    const store = useAuthStore.getState();
    store.resetAll();
    logger.info('Emergency reset completed successfully.', 'SecurityService');
  }
}

export const securityService = new SecurityService();
