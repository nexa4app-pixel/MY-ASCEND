import React from 'react';
import { AppShell } from './layout/AppShell';
import { useNavigationStore } from './store/useNavigationStore';
import { DashboardPage } from './pages/DashboardPage';
import { InboxPage } from './pages/InboxPage';
import { TasksPage } from './pages/TasksPage';
import { FocusPage } from './pages/FocusPage';
import { SchedulePage } from './pages/SchedulePage';
import { ManagementPage } from './pages/ManagementPage';
import { AcademicPage } from './pages/AcademicPage';
import { JournalPage } from './pages/JournalPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { SettingsPage } from './pages/SettingsPage';
import { DiagnosticPage } from './pages/DiagnosticPage';
import { MiniTimerOverlay } from './components/MiniTimerOverlay';
import { useFocusStore } from './store/useFocusStore';
import { Play, Pause, Flame, Coffee, Clock, Plus, Maximize2 } from 'lucide-react';

export const App: React.FC = () => {
  const currentRoute = useNavigationStore((state) => state.currentRoute);
  const navigate = useNavigationStore((state) => state.navigate);

  const {
    timerState,
    timerMode,
    timeRemaining,
    selectedTaskTitle,
    selectedTopicTitle,
    pauseTimer,
    resumeTimer,
    extendTime,
  } = useFocusStore();

  const isMiniTimerWindow =
    typeof window !== 'undefined' && window.location.search.includes('window=mini-timer');

  if (isMiniTimerWindow) {
    return <MiniTimerOverlay />;
  }

  const formatTime = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const renderCurrentPage = () => {
    switch (currentRoute) {
      case 'dashboard':
        return <DashboardPage />;
      case 'inbox':
        return <InboxPage />;
      case 'tasks':
        return <TasksPage />;
      case 'focus':
        return <FocusPage />;
      case 'schedule':
        return <SchedulePage />;
      case 'management':
        return <ManagementPage />;
      case 'academic':
        return <AcademicPage />;
      case 'journal':
        return <JournalPage />;
      case 'analytics':
        return <AnalyticsPage />;
      case 'life':
        return <JournalPage />;
      case 'settings':
        return <SettingsPage />;
      case 'settings/diagnostic':
        return <DiagnosticPage />;
      default:
        return <DashboardPage />;
    }
  };

  const activeTitle = selectedTaskTitle || selectedTopicTitle || 'Active Focus';
  const isBreak = timerMode === 'short_break' || timerMode === 'long_break';

  return (
    <AppShell>
      {renderCurrentPage()}

      {/* In-App Floating Mini-Timer Pill when navigating away from Focus page */}
      {currentRoute !== 'focus' && timerState !== 'idle' && (
        <div className="fixed bottom-5 end-6 z-50 flex items-center gap-2.5 px-3.5 py-2 rounded-2xl bg-[#1e1e1e]/90 dark:bg-[#181818]/90 backdrop-blur-xl border border-white/15 shadow-2xl text-white animate-in slide-in-from-bottom duration-300">
          <div
            onClick={() => navigate('focus')}
            className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
          >
            {isBreak ? (
              <Coffee className="w-4 h-4 text-emerald-400" />
            ) : timerMode === 'stopwatch' ? (
              <Clock className="w-4 h-4 text-cyan-400" />
            ) : (
              <Flame className="w-4 h-4 text-amber-400" />
            )}
            <div className="flex flex-col text-start">
              <span className="text-xs font-mono font-bold">{formatTime(timeRemaining)}</span>
              <span className="text-[10px] text-white/60 truncate max-w-[120px]">{activeTitle}</span>
            </div>
          </div>

          <div className="h-6 w-[1px] bg-white/10 mx-0.5" />

          {timerMode !== 'stopwatch' && (
            <button
              onClick={() => extendTime(5)}
              title="+5m"
              className="p-1 rounded-lg bg-white/10 hover:bg-white/20 text-emerald-400 text-xs transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          )}

          {timerState === 'running' ? (
            <button
              onClick={pauseTimer}
              className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 transition-colors"
            >
              <Pause className="w-3.5 h-3.5 fill-current" />
            </button>
          ) : (
            <button
              onClick={resumeTimer}
              className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 transition-colors"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
            </button>
          )}

          <button
            onClick={() => navigate('focus')}
            className="p-1 text-white/50 hover:text-white transition-colors"
            title="Open Focus Page"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </AppShell>
  );
};
