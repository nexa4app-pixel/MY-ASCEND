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
import { useTheme } from '../hooks/useTheme';
import { useDirection } from '../hooks/useDirection';
import { useCurrentTime } from '../hooks/useCurrentTime';
import { Badge } from '../components/Badge';
import { Button } from '../components/Button';
import { Tooltip } from '../components/Tooltip';

const ROUTE_TITLES: Record<string, { fa: string; en: string }> = {
  dashboard: { fa: 'داشبورد جامع', en: 'Dashboard' },
  inbox: { fa: 'صندوق ورودی', en: 'Inbox' },
  tasks: { fa: 'وظایف و برنامه‌ریزی', en: 'Tasks & Planning' },
  focus: { fa: 'موتور تمرکز و پومودورو', en: 'Focus Timer' },
  schedule: { fa: 'تقویم و بلوک‌های زمانی', en: 'Schedule & Time-Blocks' },
  management: { fa: 'مدیریت و اهداف', en: 'Management' },
  academic: { fa: 'مدیریت دانشگاه و آموزش', en: 'Academic & Learning' },
  journal: { fa: 'دفترچه خاطرات و ثبت تجارب', en: 'Daily Journal & Vault' },
  analytics: { fa: 'تحلیل‌ها و شاخص پیشرفت (AGS)', en: 'Analytics & Growth' },
  life: { fa: 'سبک زندگی و ژورنال', en: 'Life & Journal' },
  settings: { fa: 'تنظیمات برنامه', en: 'Settings' },
  'settings/diagnostic': { fa: 'عیب‌یابی پایگاه داده', en: 'Database Diagnostic' },
};

const PERSONA_LABELS: Record<string, { fa: string; variant: 'accent' | 'success' | 'warning' }> = {
  personal: { fa: 'شخصی', variant: 'accent' },
  academic: { fa: 'آکادمیک', variant: 'success' },
  professional: { fa: 'کاری و حرفه‌ای', variant: 'warning' },
};

export const Topbar: React.FC = () => {
  const currentRoute = useNavigationStore((state) => state.currentRoute);
  const navigate = useNavigationStore((state) => state.navigate);
  const activePersona = useSettingsStore((state) => state.settings.active_persona);
  const openQuickCapture = useQuickCaptureStore((state) => state.openModal);
  const openSearchModal = useSearchStore((state) => state.openModal);
  const timerState = useFocusStore((state) => state.timerState);
  const timeRemaining = useFocusStore((state) => state.timeRemaining);
  const { theme, setTheme, resolvedTheme } = useTheme();
  const { isRtl, toggleDirection } = useDirection();
  const { jalaliDate, gregorianDate } = useCurrentTime();

  const titleInfo = ROUTE_TITLES[currentRoute] || { fa: 'صفحه اصلی', en: 'Home' };
  const personaInfo = PERSONA_LABELS[activePersona] || { fa: 'شخصی', variant: 'accent' };

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

  return (
    <header className="h-14 bg-white/70 dark:bg-[#202020]/70 fluent-mica border-b border-black/8 dark:border-white/8 px-6 flex items-center justify-between select-none z-20 shrink-0">
      {/* Route Title & Active Persona Badge */}
      <div className="flex items-center gap-3 text-start">
        <h1 className="text-base font-bold text-[#1f1f1f] dark:text-white">
          {titleInfo.fa}
        </h1>
        <span className="text-xs text-[#8a8a8a] hidden sm:inline">
          / {titleInfo.en}
        </span>
        <Badge variant={personaInfo.variant} size="sm" className="ms-1">
          {personaInfo.fa}
        </Badge>
      </div>

      {/* Action Controls & Date Display */}
      <div className="flex items-center gap-3">
        {/* Active Focus Session Indicator Pill */}
        {timerState === 'running' && (
          <Tooltip content="جلسه تمرکز در حال اجراست — برای مشاهده کلیک کنید" position="bottom">
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
        <div className="hidden lg:flex items-center gap-2 px-3 py-1 bg-black/5 dark:bg-white/5 rounded-md border border-black/5 dark:border-white/5 text-xs text-[#616161] dark:text-[#adadad]">
          <CalendarIcon className="w-3.5 h-3.5 text-[#0078d4]" />
          <span className="font-medium text-[#1f1f1f] dark:text-white">{jalaliDate}</span>
          <span className="text-black/30 dark:text-white/30">|</span>
          <span>{gregorianDate}</span>
        </div>

        {/* Global Search Button (Cmd/Ctrl+K) */}
        <Tooltip content="جستجوی سراسری پیشرفته (Ctrl+K)" position="bottom">
          <Button
            variant="subtle"
            size="sm"
            onClick={() => openSearchModal()}
            className="h-8 px-2.5 flex items-center gap-1.5"
            aria-label="Global Search"
          >
            <Search className="w-4 h-4 text-[#0078d4]" />
            <span className="hidden md:inline text-xs font-medium">جستجو...</span>
            <kbd className="hidden md:inline-flex items-center px-1.5 py-0.5 text-[10px] text-[#8a8a8a] bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded font-mono ms-1">
              Ctrl+K
            </kbd>
          </Button>
        </Tooltip>

        {/* Quick Capture (Phase 02 Active) */}
        <Tooltip content="ثبت سریع ورودی یا یادداشت (Ctrl+Shift+C)" position="bottom">
          <Button
            variant="primary"
            size="sm"
            onClick={() => openQuickCapture()}
            icon={<Plus className="w-3.5 h-3.5" />}
          >
            <span className="hidden sm:inline">ثبت سریع</span>
          </Button>
        </Tooltip>

        {/* Direction Switcher (RTL / LTR) */}
        <Tooltip content={`تغییر چیدمان به ${isRtl ? 'چپ‌به‌راست (LTR)' : 'راست‌به‌چپ (RTL)'}`} position="bottom">
          <Button
            variant="subtle"
            size="sm"
            onClick={toggleDirection}
            className="h-8 px-2.5"
            aria-label="Toggle Direction"
          >
            <Languages className="w-4 h-4 me-1.5" />
            <span className="text-xs font-semibold uppercase">{isRtl ? 'RTL' : 'LTR'}</span>
          </Button>
        </Tooltip>

        {/* Theme Switcher */}
        <Tooltip content={`پوسته: ${theme === 'system' ? 'سیستم' : theme === 'dark' ? 'تاریک' : 'روشن'}`} position="bottom">
          <Button
            variant="subtle"
            size="sm"
            onClick={cycleTheme}
            className="h-8 w-8 p-0"
            aria-label="Toggle Theme"
          >
            {theme === 'system' ? (
              <Laptop className="w-4 h-4 text-[#0078d4]" />
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
