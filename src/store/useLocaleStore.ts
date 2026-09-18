import { create } from 'zustand';
import { Locale, Direction, getTranslation } from '../i18n/translations';
import { settingsService } from '../services/settingsService';

interface LocaleState {
  locale: Locale;
  dir: Direction;
  setLocale: (locale: Locale) => Promise<void>;
  toggleLocale: () => Promise<void>;
  t: (key: string, fallback?: string) => string;
}

function applyDomLocale(locale: Locale, dir: Direction) {
  if (typeof document !== 'undefined') {
    document.documentElement.setAttribute('dir', dir);
    document.documentElement.setAttribute('lang', locale);
    document.body.setAttribute('dir', dir);
  }
}

export const useLocaleStore = create<LocaleState>((set, get) => ({
  locale: 'fa',
  dir: 'rtl',

  setLocale: async (locale: Locale) => {
    const dir: Direction = locale === 'fa' ? 'rtl' : 'ltr';
    applyDomLocale(locale, dir);
    set({ locale, dir });

    try {
      await settingsService.saveSetting('direction', dir);
    } catch {
      // Non-critical during test/in-memory environments
    }
  },

  toggleLocale: async () => {
    const current = get().locale;
    const nextLocale: Locale = current === 'fa' ? 'en' : 'fa';
    await get().setLocale(nextLocale);
  },

  t: (key: string, fallback?: string) => {
    return getTranslation(get().locale, key, fallback);
  },
}));

/**
 * Hook for consuming translations reactively
 */
export function useTranslation() {
  const locale = useLocaleStore((state) => state.locale);
  const dir = useLocaleStore((state) => state.dir);
  const setLocale = useLocaleStore((state) => state.setLocale);
  const toggleLocale = useLocaleStore((state) => state.toggleLocale);

  const t = (key: string, fallback?: string) => {
    return getTranslation(locale, key, fallback);
  };

  return {
    locale,
    dir,
    isRtl: dir === 'rtl',
    setLocale,
    toggleLocale,
    t,
  };
}
