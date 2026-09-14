import React, { useState, useEffect } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Flame,
  Coffee,
  Clock,
  Timer as TimerIcon,
  BookOpen,
  CheckSquare,
} from 'lucide-react';
import { Card } from './Card';
import { Button } from './Button';
import { Badge } from './Badge';
import { useFocusStore, TimerMode } from '../store/useFocusStore';
import { taskService } from '../services/taskService';
import { db } from '../db/client';
import { Task, Topic } from '../types/database';

export const FocusTimer: React.FC = () => {
  const {
    timerMode,
    timerState,
    timeRemaining,
    elapsedSeconds,
    plannedDurationMinutes,
    selectedTaskId,
    selectedTopicId,
    interruptionCount,
    setTimerMode,
    setSelectedTask,
    setSelectedTopic,
    startTimer,
    pauseTimer,
    resumeTimer,
    completeTimer,
    abandonTimer,
    resetTimer,
    addInterruption,
  } = useFocusStore();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [notes, setNotes] = useState('');
  const [showNotes, setShowNotes] = useState(false);

  useEffect(() => {
    // Load active tasks (not completed)
    taskService.getTasks().then((all) => {
      setTasks(all.filter((t) => t.status !== 'completed' && t.status !== 'cancelled'));
    }).catch(console.error);

    // Load academic topics
    db.query<Topic>('SELECT * FROM topics WHERE is_deleted = 0 AND is_completed = 0 ORDER BY title ASC')
      .then(setTopics)
      .catch(console.error);
  }, []);

  // Format seconds to MM:SS or HH:MM:SS
  const formatTime = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  // Progress percentage for countdown
  const totalSeconds = plannedDurationMinutes * 60;
  const progressPercent =
    timerMode === 'stopwatch'
      ? 100
      : totalSeconds > 0
      ? Math.max(0, Math.min(100, Math.round(((totalSeconds - timeRemaining) / totalSeconds) * 100)))
      : 0;

  const MODES: { id: TimerMode; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'pomodoro', label: 'پومودورو (۲۵ دقیقه)', icon: Flame },
    { id: 'short_break', label: 'استراحت کوتاه (۵ دقیقه)', icon: Coffee },
    { id: 'long_break', label: 'استراحت بلند (۱۵ دقیقه)', icon: Coffee },
    { id: 'stopwatch', label: 'کرنومتر آزاد', icon: Clock },
    { id: 'countdown', label: 'شمارش معکوس', icon: TimerIcon },
  ];

  return (
    <Card variant="acrylic" className="p-6 max-w-2xl mx-auto space-y-6 select-none text-center">
      {/* Mode Switcher Tabs */}
      <div className="flex flex-wrap items-center justify-center gap-1.5 p-1 bg-black/5 dark:bg-white/5 rounded-xl border border-black/5 dark:border-white/5">
        {MODES.map((m) => {
          const Icon = m.icon;
          const isActive = timerMode === m.id;
          return (
            <button
              key={m.id}
              disabled={timerState === 'running'}
              onClick={() => setTimerMode(m.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                isActive
                  ? 'bg-white dark:bg-[#333] text-[#0078d4] dark:text-[#60a5fa] font-bold shadow-sm'
                  : 'text-[#616161] dark:text-[#adadad] hover:text-black dark:hover:text-white disabled:opacity-50'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{m.label}</span>
            </button>
          );
        })}
      </div>

      {/* Entity Association Selector (Task or Topic) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-start">
        <div>
          <label className="block text-xs font-semibold text-[#1f1f1f] dark:text-white mb-1 flex items-center gap-1.5">
            <CheckSquare className="w-3.5 h-3.5 text-[#0078d4]" />
            <span>اتصال به وظیفه (Task)</span>
          </label>
          <select
            value={selectedTaskId || ''}
            disabled={timerState === 'running'}
            onChange={(e) => setSelectedTask(e.target.value || null)}
            className="w-full h-8 text-xs bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-lg px-2 text-[#1f1f1f] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0078d4] disabled:opacity-50"
          >
            <option value="">(بدون وظیفه مشخص)</option>
            {tasks.map((t) => (
              <option key={t.id} value={t.id}>
                {t.title}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-[#1f1f1f] dark:text-white mb-1 flex items-center gap-1.5">
            <BookOpen className="w-3.5 h-3.5 text-purple-500" />
            <span>اتصال به مبحث درسی (Academic Topic)</span>
          </label>
          <select
            value={selectedTopicId || ''}
            disabled={timerState === 'running'}
            onChange={(e) => {
              const topicId = e.target.value || null;
              const topic = topics.find((t) => t.id === topicId);
              setSelectedTopic(topicId, topic?.subject_id || null);
            }}
            className="w-full h-8 text-xs bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-lg px-2 text-[#1f1f1f] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0078d4] disabled:opacity-50"
          >
            <option value="">(بدون مبحث درسی)</option>
            {topics.map((top) => (
              <option key={top.id} value={top.id}>
                {top.title}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Timer Display & Progress Ring */}
      <div className="relative flex flex-col items-center justify-center py-6">
        {/* Progress Bar Track */}
        <div className="w-64 h-2 bg-black/5 dark:bg-white/5 rounded-full overflow-hidden mb-4 border border-black/5 dark:border-white/5">
          <div
            className="h-full bg-gradient-to-r from-[#0078d4] to-[#60a5fa] transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Big Digits */}
        <div className="font-mono text-6xl sm:text-7xl font-bold tracking-tight text-[#1f1f1f] dark:text-white">
          {formatTime(timeRemaining)}
        </div>

        {/* State subtitle */}
        <div className="mt-2 flex items-center gap-2">
          {timerState === 'running' ? (
            <Badge variant="success" size="sm" className="animate-pulse">
              در حال تمرکز عمیق...
            </Badge>
          ) : timerState === 'paused' ? (
            <Badge variant="warning" size="sm">
              تایمر متوقف شده
            </Badge>
          ) : (
            <span className="text-xs text-[#8a8a8a]">
              مدت برنامه‌ریزی: {plannedDurationMinutes} دقیقه
            </span>
          )}
        </div>
      </div>

      {/* Primary Action Controls */}
      <div className="flex flex-wrap items-center justify-center gap-3">
        {timerState === 'idle' && (
          <Button
            variant="primary"
            size="lg"
            icon={<Play className="w-5 h-5 fill-current" />}
            onClick={() => startTimer()}
            className="px-8 shadow-md"
          >
            شروع تمرکز
          </Button>
        )}

        {timerState === 'running' && (
          <>
            <Button
              variant="secondary"
              size="lg"
              icon={<Pause className="w-5 h-5" />}
              onClick={pauseTimer}
            >
              مکث
            </Button>
            <Button
              variant="primary"
              size="lg"
              icon={<CheckCircle2 className="w-5 h-5" />}
              onClick={() => completeTimer(notes)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              تکمیل جلسه
            </Button>
            <Button
              variant="subtle"
              size="lg"
              icon={<XCircle className="w-5 h-5" />}
              onClick={() => abandonTimer(notes)}
              className="text-red-500 hover:bg-red-500/10"
            >
              انصراف
            </Button>
          </>
        )}

        {timerState === 'paused' && (
          <>
            <Button
              variant="primary"
              size="lg"
              icon={<Play className="w-5 h-5 fill-current" />}
              onClick={resumeTimer}
              className="px-6"
            >
              ادامه
            </Button>
            <Button
              variant="secondary"
              size="lg"
              icon={<CheckCircle2 className="w-5 h-5" />}
              onClick={() => completeTimer(notes)}
              className="text-emerald-600"
            >
              تکمیل
            </Button>
            <Button
              variant="subtle"
              size="lg"
              icon={<RotateCcw className="w-5 h-5" />}
              onClick={resetTimer}
            >
              تنظیم مجدد
            </Button>
            <Button
              variant="subtle"
              size="lg"
              icon={<XCircle className="w-5 h-5" />}
              onClick={() => abandonTimer(notes)}
              className="text-red-500 hover:bg-red-500/10"
            >
              انصراف
            </Button>
          </>
        )}
      </div>

      {/* Interruption Logger Button */}
      {timerState !== 'idle' && (
        <div className="pt-2 flex items-center justify-center gap-3">
          <Button
            variant="secondary"
            size="sm"
            icon={<AlertTriangle className="w-4 h-4 text-amber-500" />}
            onClick={() => addInterruption()}
            className="border-amber-500/30 hover:border-amber-500/60 bg-amber-500/5"
          >
            <span>ثبت حواس‌پرتی (Interruption +1)</span>
            {interruptionCount > 0 && (
              <span className="ms-1.5 px-2 py-0.2 rounded-full text-xs font-mono font-bold bg-amber-500 text-white">
                {interruptionCount}
              </span>
            )}
          </Button>

          <button
            onClick={() => setShowNotes(!showNotes)}
            className="text-xs text-[#8a8a8a] hover:text-[#0078d4] underline"
          >
            {showNotes ? 'بستن یادداشت' : '+ افزودن یادداشت'}
          </button>
        </div>
      )}

      {/* Session Notes Input */}
      {showNotes && (
        <div className="text-start space-y-1 pt-2">
          <label className="text-xs text-[#8a8a8a]">یادداشت جلسه (اختیاری):</label>
          <textarea
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="دستاوردها، موانع یا تمرکز روی چه موضوعی بود..."
            className="w-full text-xs bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-lg p-2.5 text-[#1f1f1f] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0078d4] resize-none"
          />
        </div>
      )}

      {/* Elapsed seconds info */}
      {elapsedSeconds > 0 && (
        <div className="text-[11px] text-[#8a8a8a] font-mono">
          زمان سپری‌شده واقعی: {Math.floor(elapsedSeconds / 60)} دقیقه و {elapsedSeconds % 60} ثانیه
        </div>
      )}
    </Card>
  );
};
