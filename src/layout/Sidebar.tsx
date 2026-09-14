import React from 'react';
import { clsx } from 'clsx';
import {
  LayoutDashboard,
  Inbox,
  CheckSquare,
  Timer,
  Calendar,
  Target,
  GraduationCap,
  BookHeart,
  TrendingUp,
  Settings,
  Activity,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';
import { useNavigationStore, AppRoute } from '../store/useNavigationStore';
import { Tooltip } from '../components/Tooltip';
import { Badge } from '../components/Badge';

interface NavItem {
  id: AppRoute;
  label: string;
  enLabel: string;
  icon: React.ComponentType<{ className?: string }>;
  phase?: string;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'dashboard', label: 'داشبورد', enLabel: 'Dashboard', icon: LayoutDashboard },
  { id: 'inbox', label: 'صندوق ورودی', enLabel: 'Inbox', icon: Inbox },
  { id: 'tasks', label: 'وظایف و اقدام', enLabel: 'Tasks & Planning', icon: CheckSquare },
  { id: 'focus', label: 'موتور تمرکز', enLabel: 'Focus Timer', icon: Timer },
  { id: 'schedule', label: 'تقویم و زمان‌بندی', enLabel: 'Schedule & Time-Block', icon: Calendar },
  { id: 'management', label: 'مدیریت و اهداف', enLabel: 'Management', icon: Target, phase: 'P03' },
  { id: 'academic', label: 'مرکز آکادمیک', enLabel: 'Academic', icon: GraduationCap },
  { id: 'journal', label: 'دفترچه خاطرات و تجارب', enLabel: 'Journal & Vault', icon: BookHeart },
  { id: 'analytics', label: 'تحلیل و رشد (AGS)', enLabel: 'Analytics & Growth', icon: TrendingUp, phase: 'P08' },
  { id: 'settings', label: 'تنظیمات', enLabel: 'Settings', icon: Settings },
  { id: 'settings/diagnostic', label: 'عیب‌یابی پایگاه داده', enLabel: 'DB Diagnostic', icon: Activity },
];

export const Sidebar: React.FC = () => {
  const currentRoute = useNavigationStore((state) => state.currentRoute);
  const isSidebarCollapsed = useNavigationStore((state) => state.isSidebarCollapsed);
  const navigate = useNavigationStore((state) => state.navigate);
  const toggleSidebar = useNavigationStore((state) => state.toggleSidebar);

  return (
    <aside
      className={clsx(
        'relative flex flex-col h-full bg-[#f8f8f8]/90 dark:bg-[#202020]/90 border-e border-black/8 dark:border-white/8 transition-all duration-200 select-none z-30',
        isSidebarCollapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Brand / Logo Header */}
      <div className="flex items-center justify-between h-14 px-3.5 border-b border-black/5 dark:border-white/5">
        <div className={clsx('flex items-center gap-2.5 overflow-hidden', isSidebarCollapsed && 'justify-center w-full')}>
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-[#0078d4] to-[#60a5fa] flex items-center justify-center text-white font-black text-sm shadow-sm shrink-0">
            ▲
          </div>
          {!isSidebarCollapsed && (
            <div className="flex flex-col text-start">
              <span className="font-bold text-sm tracking-wide text-[#1f1f1f] dark:text-white">MY ASCEND</span>
              <span className="text-[10px] text-[#8a8a8a] font-mono tracking-tighter">PHASE 01 CORE</span>
            </div>
          )}
        </div>

        {!isSidebarCollapsed && (
          <button
            onClick={toggleSidebar}
            aria-label="Collapse sidebar"
            className="p-1.5 rounded-md text-black/50 dark:text-white/50 hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
          >
            <PanelLeftClose className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Navigation List */}
      <nav className="flex-1 py-3 px-2 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = currentRoute === item.id;

          const buttonContent = (
            <button
              key={item.id}
              onClick={() => navigate(item.id)}
              className={clsx(
                'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150 relative group text-start',
                isActive
                  ? 'bg-black/8 dark:bg-white/10 text-[#0078d4] dark:text-[#60a5fa] shadow-sm font-semibold'
                  : 'text-[#616161] dark:text-[#adadad] hover:bg-black/5 dark:hover:bg-white/5 hover:text-black dark:hover:text-white',
                isSidebarCollapsed && 'justify-center px-0'
              )}
            >
              {isActive && (
                <span className="absolute start-0 inset-y-1.5 w-1 rounded-full bg-[#0078d4]" />
              )}
              <Icon className={clsx('w-5 h-5 shrink-0', isActive ? 'text-[#0078d4] dark:text-[#60a5fa]' : 'text-inherit')} />
              {!isSidebarCollapsed && (
                <div className="flex items-center justify-between flex-1 overflow-hidden">
                  <span className="truncate">{item.label}</span>
                  {item.phase && (
                    <Badge variant="neutral" size="sm" className="text-[9px] px-1.5 py-0 opacity-60">
                      {item.phase}
                    </Badge>
                  )}
                </div>
              )}
            </button>
          );

          if (isSidebarCollapsed) {
            return (
              <Tooltip key={item.id} content={`${item.label} (${item.enLabel})`} position="end">
                {buttonContent}
              </Tooltip>
            );
          }

          return buttonContent;
        })}
      </nav>

      {/* Collapse button for mini mode */}
      {isSidebarCollapsed && (
        <div className="p-2 border-t border-black/5 dark:border-white/5 flex justify-center">
          <button
            onClick={toggleSidebar}
            aria-label="Expand sidebar"
            className="p-2 rounded-md text-black/50 dark:text-white/50 hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
          >
            <PanelLeftOpen className="w-4 h-4" />
          </button>
        </div>
      )}
    </aside>
  );
};
