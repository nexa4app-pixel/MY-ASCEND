import { create } from 'zustand';
import { AppSettings, DEFAULT_SETTINGS, LayoutDirection, PersonaType } from '../types/settings';
import { settingsService } from '../services/settingsService';
import { useThemeStore } from './useThemeStore';
import { useLocaleStore } from './useLocaleStore';

interface SettingsState {
  settings: AppSettings;
  isLoading: boolean;
  loadSettings: () => Promise<void>;
  setDirection: (direction: LayoutDirection) => Promise<void>;
  setPersona: (persona: PersonaType) => Promise<void>;
  setTimezone: (timezone: string) => Promise<void>;
  setAppRootDir: (dir: string) => Promise<void>;
}

function applyDirection(direction: LayoutDirection) {
  if (typeof document !== 'undefined') {
    document.documentElement.setAttribute('dir', direction);
    document.documentElement.setAttribute('lang', direction === 'rtl' ? 'fa' : 'en');
    document.body.setAttribute('dir', direction);
  }
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  settings: DEFAULT_SETTINGS,
  isLoading: true,

  loadSettings: async () => {
    set({ isLoading: true });
    const loaded = await settingsService.loadSettings();

    // Sync theme store
    useThemeStore.getState().setTheme(loaded.theme);

    // Sync locale store & apply direction
    await useLocaleStore.getState().setLocale(loaded.direction === 'rtl' ? 'fa' : 'en');
    applyDirection(loaded.direction);

    set({ settings: loaded, isLoading: false });
  },

  setDirection: async (direction: LayoutDirection) => {
    applyDirection(direction);
    await useLocaleStore.getState().setLocale(direction === 'rtl' ? 'fa' : 'en');
    const updated = { ...get().settings, direction };
    set({ settings: updated });
    await settingsService.saveSetting('direction', direction);
  },

  setPersona: async (active_persona: PersonaType) => {
    const updated = { ...get().settings, active_persona };
    set({ settings: updated });
    await settingsService.saveSetting('active_persona', active_persona);
  },

  setTimezone: async (timezone: string) => {
    const updated = { ...get().settings, timezone };
    set({ settings: updated });
    await settingsService.saveSetting('timezone', timezone);
  },

  setAppRootDir: async (app_root_dir: string) => {
    const updated = { ...get().settings, app_root_dir };
    set({ settings: updated });
    await settingsService.saveSetting('app_root_dir', app_root_dir);
  },
}));
