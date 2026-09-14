export type ThemeMode = 'light' | 'dark' | 'system';
export type LayoutDirection = 'rtl' | 'ltr';
export type PersonaType = 'personal' | 'academic' | 'professional';

export interface AppSettings {
  theme: ThemeMode;
  direction: LayoutDirection;
  active_persona: PersonaType;
  timezone: string;
  app_root_dir: string;
  device_id: string;
}

export const DEFAULT_SETTINGS: AppSettings = {
  theme: 'dark',
  direction: 'rtl',
  active_persona: 'personal',
  timezone: 'UTC',
  app_root_dir: 'default',
  device_id: 'device_primary',
};
