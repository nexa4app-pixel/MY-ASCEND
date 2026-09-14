import { create } from 'zustand';
import { ThemeMode } from '../types/settings';
import { settingsService } from '../services/settingsService';

interface ThemeState {
  theme: ThemeMode;
  resolvedTheme: 'light' | 'dark';
  setTheme: (theme: ThemeMode) => void;
  initTheme: () => void;
}

function getSystemTheme(): 'light' | 'dark' {
  if (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    return 'dark';
  }
  return 'light';
}

function applyThemeClass(resolved: 'light' | 'dark') {
  if (typeof document !== 'undefined') {
    const root = document.documentElement;
    if (resolved === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  theme: 'dark',
  resolvedTheme: 'dark',

  setTheme: (theme: ThemeMode) => {
    const resolved = theme === 'system' ? getSystemTheme() : theme;
    applyThemeClass(resolved);
    set({ theme, resolvedTheme: resolved });
    settingsService.saveSetting('theme', theme);
  },

  initTheme: () => {
    const currentTheme = get().theme;
    const resolved = currentTheme === 'system' ? getSystemTheme() : currentTheme;
    applyThemeClass(resolved);
    set({ resolvedTheme: resolved });

    if (typeof window !== 'undefined' && window.matchMedia) {
      window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
        if (get().theme === 'system') {
          const newResolved = getSystemTheme();
          applyThemeClass(newResolved);
          set({ resolvedTheme: newResolved });
        }
      });
    }
  },
}));
