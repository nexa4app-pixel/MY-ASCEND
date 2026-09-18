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
import { useTranslation } from '../store/useLocaleStore';
import { Tooltip } from '../components/Tooltip';
import { Badge } from '../components/Badge';

interface NavItemDef {
  id: AppRoute;
  translationKey: string;
  icon: React.ComponentType<{ className?: string }>;
  phase?: string;
}

const NAV_ITEMS: NavItemDef[] = [
  { id: 'dashboard', translationKey: 'routes.dashboard', icon: LayoutDashboard },
  { id: 'inbox', translationKey: 'routes.inbox', icon: Inbox },
  { id: 'tasks', translationKey: 'routes.tasks', icon: CheckSquare },
  { id: 'focus', translationKey: 'routes.focus', icon: Timer },
  { id: 'schedule', translationKey: 'routes.schedule', icon: Calendar },
  { id: 'management', translationKey: 'routes.management', icon: Target, phase: 'P03' },
  { id: 'academic', translationKey: 'routes.academic', icon: GraduationCap },
  { id: 'journal', translationKey: 'routes.journal', icon: BookHeart },
  { id: 'analytics', translationKey: 'routes.analytics', icon: TrendingUp, phase: 'P08' },
  { id: 'settings', translationKey: 'routes.settings', icon: Settings },
  { id: 'settings/diagnostic', translationKey: 'routes.diagnostic', icon: Activity },
];

export const Sidebar: React.FC = () => {
  const currentRoute = useNavigationStore((state) => state.currentRoute);
  const isSidebarCollapsed = useNavigationStore((state) => state.isSidebarCollapsed);
  const navigate = useNavigationStore((state) => state.navigate);
  const toggleSidebar = useNavigationStore((state) => state.toggleSidebar);
  const { t, isRtl } = useTranslation();

  return (
    <aside
      className={clsx(
        'relative flex flex-col h-full bg-[#f8fafc]/90 dark:bg-[#12151c]/90 fluent-mica border-e border-black/8 dark:border-white/8 transition-all duration-200 select-none z-30',
        isSidebarCollapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Brand / Logo Header */}
      <div className="flex items-center justify-between h-14 px-3.5 border-b border-black/5 dark:border-white/5">
        <div className={clsx('flex items-center gap-2.5 overflow-hidden', isSidebarCollapsed && 'justify-center w-full')}>
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-[#0078d4] to-[#60a5fa] flex items-center justify-center text-white font-black text-sm shadow-fluent-elevation-1 shrink-0">
            ▲
          </div>
          {!isSidebarCollapsed && (
            <div className="flex flex-col text-start">
              <span className="font-bold text-sm tracking-wide text-[#1f1f1f] dark:text-[#f5f6f8]">MY ASCEND</span>
              <span className="text-[10px] text-[#878e9c] font-mono tracking-tighter">DESKTOP OS</span>
            </div>
          )}
        </div>

        {!isSidebarCollapsed && (
          <button
            onClick={toggleSidebar}
            aria-label="Collapse sidebar"
            className="p-1.5 rounded-lg text-black/40 dark:text-white/40 hover:bg-black/5 dark:hover:bg-white/5 hover:text-black dark:hover:text-white transition-colors"
          >
            <PanelLeftClose className={clsx('w-4 h-4', !isRtl && 'rotate-180')} />
          </button>
        )}
      </div>

      {/* Navigation List */}
      <nav className="flex-1 py-3 px-2 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = currentRoute === item.id;
          const itemLabel = t(item.translationKey);

          const buttonContent = (
            <button
              key={item.id}
              onClick={() => navigate(item.id)}
              className={clsx(
                'w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-150 relative group text-start',
                isActive
                  ? 'bg-[#0078d4]/10 dark:bg-[#0078d4]/15 text-[#0078d4] dark:text-[#60a5fa] font-semibold shadow-sm'
                  : 'text-[#5c6270] dark:text-[#9fa6b2] hover:bg-black/5 dark:hover:bg-white/5 hover:text-[#1f1f1f] dark:hover:text-white',
                isSidebarCollapsed && 'justify-center px-0'
              )}
            >
              {isActive && (
                <span className="absolute start-0 inset-y-1.5 w-1 rounded-full bg-[#0078d4] dark:bg-[#60a5fa]" />
              )}
              <Icon className={clsx('w-5 h-5 shrink-0', isActive ? 'text-[#0078d4] dark:text-[#60a5fa]' : 'text-inherit')} />
              {!isSidebarCollapsed && (
                <div className="flex items-center justify-between flex-1 overflow-hidden">
                  <span className="truncate">{itemLabel}</span>
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
              <Tooltip key={item.id} content={itemLabel} position="end">
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
            className="p-2 rounded-lg text-black/40 dark:text-white/40 hover:bg-black/5 dark:hover:bg-white/5 hover:text-black dark:hover:text-white transition-colors"
          >
            <PanelLeftOpen className={clsx('w-4 h-4', !isRtl && 'rotate-180')} />
          </button>
        </div>
      )}
    </aside>
  );
};
