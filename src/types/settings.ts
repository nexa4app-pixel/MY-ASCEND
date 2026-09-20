export type ThemeMode = 'light' | 'dark' | 'system';
export type LayoutDirection = 'rtl' | 'ltr';
export type PersonaType = 'personal' | 'academic' | 'professional';
export type CalendarDialect = 'afghan' | 'iranian';

export const SUPPORTED_TIMEZONES = [
  { id: 'Asia/Kabul', label: 'کابل (UTC+04:30)', labelEn: 'Kabul (UTC+04:30)', offsetMinutes: 270 },
  { id: 'Asia/Tehran', label: 'تهران (UTC+03:30)', labelEn: 'Tehran (UTC+03:30)', offsetMinutes: 210 },
  { id: 'Asia/Dubai', label: 'دبی (UTC+04:00)', labelEn: 'Dubai (UTC+04:00)', offsetMinutes: 240 },
  { id: 'UTC', label: 'زمان هماهنگ جهانی (UTC)', labelEn: 'Coordinated Universal Time (UTC)', offsetMinutes: 0 },
  { id: 'Europe/London', label: 'لندن (UTC+00:00 / BST)', labelEn: 'London (UTC+00:00 / BST)', offsetMinutes: 0 },
  { id: 'America/New_York', label: 'نیویورک (UTC-05:00 / EDT)', labelEn: 'New York (UTC-05:00 / EDT)', offsetMinutes: -300 },
] as const;

export type SupportedTimezone = typeof SUPPORTED_TIMEZONES[number]['id'];

export interface AppSettings {
  theme: ThemeMode;
  direction: LayoutDirection;
  active_persona: PersonaType;
  timezone: string;
  calendar_dialect?: CalendarDialect;
  app_root_dir: string;
  device_id: string;
}

export const DEFAULT_SETTINGS: AppSettings = {
  theme: 'dark',
  direction: 'rtl',
  active_persona: 'personal',
  timezone: 'Asia/Kabul',
  calendar_dialect: 'afghan',
  app_root_dir: 'default',
  device_id: 'device_primary',
};
