import React from 'react';
import {
  Moon,
  Sun,
  Laptop,
  Languages,
  Plus,
  Calendar as CalendarIcon,
  Flame,
  Search,
} from 'lucide-react';
import { useNavigationStore } from '../store/useNavigationStore';
import { useSettingsStore } from '../store/useSettingsStore';
import { useQuickCaptureStore } from '../store/useQuickCaptureStore';
import { useFocusStore } from '../store/useFocusStore';
import { useSearchStore } from '../stores/searchStore';
import { useTranslation } from '../store/useLocaleStore';
import { toast } from '../store/useToastStore';
import { useTheme } from '../hooks/useTheme';
import { useCurrentTime } from '../hooks/useCurrentTime';
import { Badge } from '../components/Badge';
import { Button } from '../components/Button';
import { Tooltip } from '../components/Tooltip';

export const Topbar: React.FC = () => {
  const currentRoute = useNavigationStore((state) => state.currentRoute);
  const navigate = useNavigationStore((state) => state.navigate);
  const activePersona = useSettingsStore((state) => state.settings.active_persona);
  const openQuickCapture = useQuickCaptureStore((state) => state.openModal);
  const openSearchModal = useSearchStore((state) => state.openModal);
  const timerState = useFocusStore((state) => state.timerState);
  const timeRemaining = useFocusStore((state) => state.timeRemaining);
  const { theme, setTheme, resolvedTheme } = useTheme();
  const { jalaliDate, gregorianDate } = useCurrentTime();
  const { t, locale, toggleLocale, isRtl } = useTranslation();

  const currentTitle = t(`routes.${currentRoute}`, 'MY ASCEND');
  const personaLabel = t(`persona.${activePersona}`, 'Personal');

  const personaVariant: 'accent' | 'success' | 'warning' =
    activePersona === 'academic'
      ? 'success'
      : activePersona === 'professional'
      ? 'warning'
      : 'accent';

  const formatTimer = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(mins).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const cycleTheme = () => {
    if (theme === 'dark') setTheme('light');
    else if (theme === 'light') setTheme('system');
    else setTheme('dark');
  };

  const handleLanguageToggle = async () => {
    await toggleLocale();
    const nextMsg = locale === 'fa' ? 'Language changed to English (LTR)' : 'زبان به فارسی (راست‌به‌چپ) تغییر یافت';
    toast.info(nextMsg);
  };

  return (
    <header className="h-14 bg-white/80 dark:bg-[#161922]/80 fluent-mica border-b border-black/6 dark:border-white/8 px-6 flex items-center justify-between select-none z-20 shrink-0">
      {/* Route Title & Active Persona Badge */}
      <div className="flex items-center gap-3 text-start">
        <h1 className="text-base font-bold text-[#1f1f1f] dark:text-[#f5f6f8]">
          {currentTitle}
        </h1>
        <Badge variant={personaVariant} size="sm" className="ms-1">
          {personaLabel}
        </Badge>
      </div>

      {/* Action Controls & Date Display */}
      <div className="flex items-center gap-2.5 sm:gap-3">
        {/* Active Focus Session Indicator Pill */}
        {timerState === 'running' && (
          <Tooltip content={t('topbar.activeFocus')} position="bottom">
            <button
              onClick={() => navigate('focus')}
              className="flex items-center gap-1.5 px-3 py-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30 rounded-full text-xs font-bold font-mono transition-all animate-pulse"
            >
              <Flame className="w-3.5 h-3.5 fill-current" />
              <span>{formatTimer(timeRemaining)}</span>
            </button>
          </Tooltip>
        )}

        {/* Dual Date Display (Jalali + Gregorian) */}
        <div className="hidden lg:flex items-center gap-2 px-3 py-1 bg-black/4 dark:bg-white/5 rounded-lg border border-black/5 dark:border-white/5 text-xs text-[#5c6270] dark:text-[#9fa6b2]">
          <CalendarIcon className="w-3.5 h-3.5 text-[#0078d4] dark:text-[#60a5fa]" />
          {isRtl ? (
            <>
              <span className="font-medium text-[#1f1f1f] dark:text-white">{jalaliDate}</span>
              <span className="text-black/20 dark:text-white/20">|</span>
              <span>{gregorianDate}</span>
            </>
          ) : (
            <>
              <span className="font-medium text-[#1f1f1f] dark:text-white">{gregorianDate}</span>
              <span className="text-black/20 dark:text-white/20">|</span>
              <span>{jalaliDate}</span>
            </>
          )}
        </div>

        {/* Global Search Button (Cmd/Ctrl+K) */}
        <Tooltip content={t('topbar.searchTooltip')} position="bottom">
          <Button
            variant="subtle"
            size="sm"
            onClick={() => openSearchModal()}
            className="h-8 px-2.5 flex items-center gap-1.5"
            aria-label="Global Search"
          >
            <Search className="w-4 h-4 text-[#0078d4] dark:text-[#60a5fa]" />
            <span className="hidden md:inline text-xs font-medium">{t('common.search')}</span>
            <kbd className="hidden md:inline-flex items-center px-1.5 py-0.5 text-[10px] text-[#878e9c] bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded font-mono ms-1">
              Ctrl+K
            </kbd>
          </Button>
        </Tooltip>

        {/* Quick Capture (Phase 02 Active) */}
        <Tooltip content={t('topbar.quickCaptureTooltip')} position="bottom">
          <Button
            variant="primary"
            size="sm"
            onClick={() => openQuickCapture()}
            icon={<Plus className="w-3.5 h-3.5" />}
          >
            <span className="hidden sm:inline">{t('topbar.quickCapture')}</span>
          </Button>
        </Tooltip>

        {/* Language & Direction Switcher (FA / EN) */}
        <Tooltip content={t('topbar.toggleLanguage')} position="bottom">
          <Button
            variant="subtle"
            size="sm"
            onClick={handleLanguageToggle}
            className="h-8 px-2.5 flex items-center gap-1.5"
            aria-label="Toggle Language"
          >
            <Languages className="w-4 h-4 text-[#0078d4] dark:text-[#60a5fa]" />
            <span className="text-xs font-bold uppercase tracking-wider">
              {isRtl ? 'FA' : 'EN'}
            </span>
          </Button>
        </Tooltip>

        {/* Theme Switcher */}
        <Tooltip content={t('topbar.toggleTheme')} position="bottom">
          <Button
            variant="subtle"
            size="sm"
            onClick={cycleTheme}
            className="h-8 w-8 p-0"
            aria-label="Toggle Theme"
          >
            {theme === 'system' ? (
              <Laptop className="w-4 h-4 text-[#0078d4] dark:text-[#60a5fa]" />
            ) : resolvedTheme === 'dark' ? (
              <Moon className="w-4 h-4 text-amber-300" />
            ) : (
              <Sun className="w-4 h-4 text-amber-500" />
            )}
          </Button>
        </Tooltip>
      </div>
    </header>
  );
};
