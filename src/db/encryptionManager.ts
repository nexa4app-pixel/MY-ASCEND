import { db } from './client';
import { logger } from '../services/logger';

export class EncryptionManager {
  private isKeySet = false;

  /**
   * Derive AES-256 encryption key from user passcode.
   */
  public async deriveEncryptionKey(passcode: string): Promise<string> {
    if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
      const encoder = new TextEncoder();
      const rawKey = encoder.encode(`MY_ASCEND_AES256_SALT_${passcode}`);
      const keyBuffer = await window.crypto.subtle.digest('SHA-256', rawKey);
      const keyArray = Array.from(new Uint8Array(keyBuffer));
      return keyArray.map((b) => b.toString(16).padStart(2, '0')).join('');
    }
    return `aes256_fallback_key_${passcode}`;
  }

  /**
   * Set encrypted SQLite PRAGMA context key.
   */
  public async setEncryptionContext(derivedKey: string): Promise<void> {
    try {
      // Execute SQLCipher or encryption PRAGMA if supported
      await db.execute(`PRAGMA key = '${derivedKey}';`);
      this.isKeySet = true;
      logger.info('SQLite AES-256 encryption key context initialized.', 'EncryptionManager');
    } catch (err) {
      logger.warn(`SQLite encryption PRAGMA setup info: ${err}`, 'EncryptionManager');
    }
  }

  public isContextEncrypted(): boolean {
    return this.isKeySet;
  }
}

export const encryptionManager = new EncryptionManager();
