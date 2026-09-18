import { describe, it, expect, beforeEach } from 'vitest';
import { useLocaleStore } from '../src/store/useLocaleStore';
import { useToastStore, toast } from '../src/store/useToastStore';
import { getTranslation } from '../src/i18n/translations';

describe('UI/UX Overhaul: i18n, Localization & Toast Notification System', () => {
  beforeEach(async () => {
    await useLocaleStore.getState().setLocale('fa');
    useToastStore.getState().clearToasts();
  });

  describe('Locale & Direction Management (useLocaleStore)', () => {
    it('1. should initialize with Persian (fa) and RTL direction by default', () => {
      const state = useLocaleStore.getState();
      expect(state.locale).toBe('fa');
      expect(state.dir).toBe('rtl');
    });

    it('2. should switch to English (en) and LTR direction when setLocale("en") is called', async () => {
      await useLocaleStore.getState().setLocale('en');
      const state = useLocaleStore.getState();
      expect(state.locale).toBe('en');
      expect(state.dir).toBe('ltr');
      expect(document.documentElement.getAttribute('dir')).toBe('ltr');
      expect(document.documentElement.getAttribute('lang')).toBe('en');
    });

    it('3. should toggle back and forth between fa/rtl and en/ltr using toggleLocale()', async () => {
      expect(useLocaleStore.getState().locale).toBe('fa');
      await useLocaleStore.getState().toggleLocale();
      expect(useLocaleStore.getState().locale).toBe('en');
      expect(useLocaleStore.getState().dir).toBe('ltr');

      await useLocaleStore.getState().toggleLocale();
      expect(useLocaleStore.getState().locale).toBe('fa');
      expect(useLocaleStore.getState().dir).toBe('rtl');
    });
  });

  describe('Translation Resolution (getTranslation)', () => {
    it('4. should resolve Persian route and common strings accurately', () => {
      expect(getTranslation('fa', 'routes.dashboard')).toBe('داشبورد');
      expect(getTranslation('fa', 'routes.tasks')).toBe('وظایف و اقدام');
      expect(getTranslation('fa', 'common.save')).toBe('ذخیره');
      expect(getTranslation('fa', 'common.cancel')).toBe('انصراف');
      expect(getTranslation('fa', 'tasks.title')).toBe('مدیریت وظایف و موتور اقدام');
    });

    it('5. should resolve English route and common strings accurately', () => {
      expect(getTranslation('en', 'routes.dashboard')).toBe('Dashboard');
      expect(getTranslation('en', 'routes.tasks')).toBe('Tasks & Planning');
      expect(getTranslation('en', 'common.save')).toBe('Save');
      expect(getTranslation('en', 'common.cancel')).toBe('Cancel');
      expect(getTranslation('en', 'tasks.title')).toBe('Tasks & Action Engine');
    });

    it('6. should fall back to fallback string or key if translation is missing', () => {
      expect(getTranslation('fa', 'nonexistent.key', 'Fallback Text')).toBe('Fallback Text');
      expect(getTranslation('en', 'nonexistent.key')).toBe('nonexistent.key');
    });
  });

  describe('Toast Notification Engine (useToastStore)', () => {
    it('7. should queue success, error, info, and warning toasts via helper methods', () => {
      toast.success('Task created successfully', 'Success');
      toast.error('Failed to connect to database', 'Error');
      toast.info('Language updated', 'Info');
      toast.warning('Auto-lock timeout approaching', 'Warning');

      const toasts = useToastStore.getState().toasts;
      expect(toasts.length).toBe(4);
      expect(toasts[0].type).toBe('success');
      expect(toasts[0].message).toBe('Task created successfully');
      expect(toasts[1].type).toBe('error');
      expect(toasts[2].type).toBe('info');
      expect(toasts[3].type).toBe('warning');
    });

    it('8. should allow manual dismissal of a toast by id', () => {
      const id = toast.success('To be dismissed');
      expect(useToastStore.getState().toasts.some((t) => t.id === id)).toBe(true);

      toast.dismiss(id);
      expect(useToastStore.getState().toasts.some((t) => t.id === id)).toBe(false);
    });

    it('9. should limit maximum active toasts to 5', () => {
      for (let i = 1; i <= 8; i++) {
        toast.info(`Toast #${i}`);
      }

      const toasts = useToastStore.getState().toasts;
      expect(toasts.length).toBeLessThanOrEqual(5);
      expect(toasts[toasts.length - 1].message).toBe('Toast #8');
    });
  });
});
