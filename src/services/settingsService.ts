/**
 * Settings Service
 * Reads and writes user and application settings to the SQLite settings table.
 */
import { db } from '../db/client';
import { AppSettings, DEFAULT_SETTINGS, ThemeMode, LayoutDirection, PersonaType } from '../types/settings';
import { getOrCreateDeviceId, getStoredItem, setStoredItem } from '../lib/storage';
import { logger } from './logger';

export class SettingsService {
  private deviceId: string;

  constructor() {
    this.deviceId = getOrCreateDeviceId();
  }

  public getDeviceId(): string {
    return this.deviceId;
  }

  public async loadSettings(): Promise<AppSettings> {
    try {
      const themeVal = await db.getSetting('theme');
      const dirVal = await db.getSetting('direction');
      const personaVal = await db.getSetting('active_persona');
      const timezoneVal = await db.getSetting('timezone');
      const rootDirVal = await db.getSetting('app_root_dir');

      const settings: AppSettings = {
        theme: (themeVal as ThemeMode) || getStoredItem<ThemeMode>('ascend_theme', DEFAULT_SETTINGS.theme),
        direction: (dirVal as LayoutDirection) || getStoredItem<LayoutDirection>('ascend_direction', DEFAULT_SETTINGS.direction),
        active_persona: (personaVal as PersonaType) || getStoredItem<PersonaType>('ascend_persona', DEFAULT_SETTINGS.active_persona),
        timezone: timezoneVal || DEFAULT_SETTINGS.timezone,
        app_root_dir: rootDirVal || DEFAULT_SETTINGS.app_root_dir,
        device_id: this.deviceId,
      };

      logger.info('Settings successfully loaded from database/storage', 'SettingsService');
      return settings;
    } catch (err) {
      logger.warn('Failed to load settings from DB, falling back to defaults', 'SettingsService', err);
      return {
        ...DEFAULT_SETTINGS,
        device_id: this.deviceId,
      };
    }
  }

  public async saveSetting<K extends keyof AppSettings>(key: K, value: AppSettings[K]): Promise<void> {
    try {
      const id = `setting_${String(key)}`;
      await db.setSetting(id, String(key), String(value), this.deviceId);
      setStoredItem(`ascend_${String(key)}`, value);
      logger.info(`Saved setting: ${String(key)} = ${value}`, 'SettingsService');
    } catch (err) {
      logger.error(`Failed to save setting ${String(key)}`, 'SettingsService', err);
      setStoredItem(`ascend_${String(key)}`, value);
    }
  }
}

export const settingsService = new SettingsService();
