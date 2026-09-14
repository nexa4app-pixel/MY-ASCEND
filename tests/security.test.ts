import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../src/db/client';
import { securityService } from '../src/services/securityService';
import { useAuthStore } from '../src/stores/authStore';
import { encryptionManager } from '../src/db/encryptionManager';
import { taskService } from '../src/services/taskService';

describe('Phase 10: Passcode Authentication, Security & Auto-Lock Engine', () => {
  beforeEach(async () => {
    // Clear settings and auth store state before each test
    await db.execute('DELETE FROM settings');
    await db.execute('DELETE FROM tasks');
    useAuthStore.getState().resetAll();
  });

  describe('PIN Hashing & Verification', () => {
    it('1. should generate consistent SHA-256 hashes for raw PINs', async () => {
      const hash1 = await securityService.hashPin('1234');
      const hash2 = await securityService.hashPin('1234');
      const hashDiff = await securityService.hashPin('4321');

      expect(hash1).toBe(hash2);
      expect(hash1).not.toBe(hashDiff);
      expect(typeof hash1).toBe('string');
    });

    it('2. should set up 4-digit PIN code successfully', async () => {
      await securityService.setupPin('1234', 4);

      const store = useAuthStore.getState();
      expect(store.isPinEnabled).toBe(true);
      expect(store.pinLength).toBe(4);
      expect(store.isLocked).toBe(false);

      const storedHash = await db.getSetting('security_pin_hash');
      expect(storedHash).not.toBeNull();
    });

    it('3. should set up 6-digit PIN code successfully', async () => {
      await securityService.setupPin('123456', 6);

      const store = useAuthStore.getState();
      expect(store.isPinEnabled).toBe(true);
      expect(store.pinLength).toBe(6);
    });

    it('4. should reject non-numeric or invalid length PIN strings during setup', async () => {
      await expect(securityService.setupPin('12a4', 4)).rejects.toThrow();
      await expect(securityService.setupPin('123', 4)).rejects.toThrow();
      await expect(securityService.setupPin('12345', 4)).rejects.toThrow();
    });

    it('5. should verify correct PIN code and unlock app', async () => {
      await securityService.setupPin('1234', 4);
      useAuthStore.getState().lockApp();

      expect(useAuthStore.getState().isLocked).toBe(true);

      const verified = await securityService.verifyPin('1234');
      expect(verified).toBe(true);
      expect(useAuthStore.getState().isLocked).toBe(false);
    });

    it('6. should track failed attempts on wrong PIN entry', async () => {
      await securityService.setupPin('1234', 4);

      try {
        await securityService.verifyPin('9999');
      } catch {
        // Expected incorrect PIN error
      }

      expect(useAuthStore.getState().failedAttempts).toBe(1);
    });

    it('7. should trigger 5-minute lockout after 5 consecutive failed attempts', async () => {
      await securityService.setupPin('1234', 4);

      for (let i = 0; i < 4; i++) {
        try {
          await securityService.verifyPin('0000');
        } catch {
          // Expected
        }
      }
      expect(useAuthStore.getState().failedAttempts).toBe(4);
      expect(useAuthStore.getState().isLockedOut()).toBe(false);

      // 5th attempt
      await expect(securityService.verifyPin('0000')).rejects.toThrow('به مدت ۵ دقیقه قفل شد');
      expect(useAuthStore.getState().failedAttempts).toBe(5);
      expect(useAuthStore.getState().isLockedOut()).toBe(true);
    });

    it('8. should calculate remaining lockout seconds correctly when locked out', async () => {
      await securityService.setupPin('1234', 4);
      for (let i = 0; i < 5; i++) {
        try {
          await securityService.verifyPin('0000');
        } catch {
          // Ignore
        }
      }

      const remaining = useAuthStore.getState().getLockoutRemainingSeconds();
      expect(remaining).toBeGreaterThan(200);
      expect(remaining).toBeLessThanOrEqual(300);
    });

    it('9. should change PIN code successfully when given valid current PIN', async () => {
      await securityService.setupPin('1234', 4);
      await securityService.changePin('1234', '5678', 4);

      const verifyOld = await securityService.verifyPin('5678');
      expect(verifyOld).toBe(true);
    });

    it('10. should reject PIN change attempt when current PIN is incorrect', async () => {
      await securityService.setupPin('1234', 4);
      await expect(securityService.changePin('0000', '5678', 4)).rejects.toThrow();
    });

    it('11. should disable PIN lock when given correct current PIN', async () => {
      await securityService.setupPin('1234', 4);
      await securityService.disablePin('1234');

      expect(useAuthStore.getState().isPinEnabled).toBe(false);
    });
  });

  describe('Auto-Lock & Idle Detection Logic', () => {
    it('12. should auto-lock when idle duration exceeds autoLockTimeout', () => {
      useAuthStore.getState().setPinEnabled(true);
      useAuthStore.getState().setAutoLockTimeout('1min');
      useAuthStore.getState().unlockApp();

      // Simulate 61 seconds of inactivity
      const past = Date.now() - 61 * 1000;
      useAuthStore.setState({ lastActivityTimestamp: past });

      const autoLocked = useAuthStore.getState().checkAutoLock();
      expect(autoLocked).toBe(true);
      expect(useAuthStore.getState().isLocked).toBe(true);
    });

    it('13. should not auto-lock when autoLockTimeout is set to "never"', () => {
      useAuthStore.getState().setPinEnabled(true);
      useAuthStore.getState().setAutoLockTimeout('never');
      useAuthStore.getState().unlockApp();

      const past = Date.now() - 9999 * 1000;
      useAuthStore.setState({ lastActivityTimestamp: past });

      const autoLocked = useAuthStore.getState().checkAutoLock();
      expect(autoLocked).toBe(false);
      expect(useAuthStore.getState().isLocked).toBe(false);
    });

    it('14. should auto-lock immediately when timeout is "immediate"', () => {
      useAuthStore.getState().setPinEnabled(true);
      useAuthStore.getState().setAutoLockTimeout('immediate');
      useAuthStore.getState().unlockApp();

      const autoLocked = useAuthStore.getState().checkAutoLock();
      expect(autoLocked).toBe(true);
      expect(useAuthStore.getState().isLocked).toBe(true);
    });

    it('15. should transition auth store states accurately (locked/unlocked)', () => {
      useAuthStore.getState().setPinEnabled(true);
      useAuthStore.getState().lockApp();
      expect(useAuthStore.getState().isLocked).toBe(true);

      useAuthStore.getState().unlockApp();
      expect(useAuthStore.getState().isLocked).toBe(false);
      expect(useAuthStore.getState().failedAttempts).toBe(0);
    });
  });

  describe('Encryption & Emergency Data Reset', () => {
    it('16. should derive AES-256 encryption key from passcode', async () => {
      const key = await encryptionManager.deriveEncryptionKey('1234');
      expect(typeof key).toBe('string');
      expect(key.length).toBeGreaterThan(16);

      await encryptionManager.setEncryptionContext(key);
      expect(encryptionManager.isContextEncrypted()).toBe(true);
    });

    it('17. should perform emergency reset wiping database and security credentials', async () => {
      await taskService.createTask({ title: 'تسک قبل از پاک‌سازی اضطراری' });
      await securityService.setupPin('1234', 4);

      await securityService.emergencyReset();

      const tasks = await db.query('SELECT * FROM tasks');
      expect(tasks.length).toBe(0);

      const store = useAuthStore.getState();
      expect(store.isPinEnabled).toBe(false);
      expect(store.isLocked).toBe(false);
    });
  });
});
