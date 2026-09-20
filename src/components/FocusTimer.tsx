import React, { useState, useEffect } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  CheckCircle2,
  XCircle,
  Flame,
  Coffee,
  Clock,
  Timer as TimerIcon,
  BookOpen,
  CheckSquare,
  Plus,
  Lightbulb,
  ExternalLink,
  Zap,
  Sparkles,
  Send,
  SkipForward,
} from 'lucide-react';
import { Card } from './Card';
import { Button } from './Button';
import { Badge } from './Badge';
import { useFocusStore, TimerMode } from '../store/useFocusStore';
import { taskService } from '../services/taskService';
import { db } from '../db/client';
import { Task, Topic } from '../types/database';
import { useTranslation } from '../store/useLocaleStore';
import { focusAssistService } from '../services/focusAssistService';

export const FocusTimer: React.FC = () => {
  const { t, isRtl } = useTranslation();
  const {
    timerMode,
    timerState,
    timeRemaining,
    elapsedSeconds,
    plannedDurationMinutes,
    selectedTaskId,
    selectedTopicId,
    distractionCount,
    energyLevel,
    setTimerMode,
    setSelectedTask,
    setSelectedTopic,
    setEnergyLevel,
    startTimer,
    pauseTimer,
    resumeTimer,
    extendTime,
    skipBreak,
    completeTimer,
    abandonTimer,
    resetTimer,
    captureDistraction,
  } = useFocusStore();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [notes, setNotes] = useState('');
  const [showNotes, setShowNotes] = useState(false);
  const [distractionText, setDistractionText] = useState('');
  const [showDistractionInput, setShowDistractionInput] = useState(false);
  const [customMinutesInput, setCustomMinutesInput] = useState('45');

  useEffect(() => {
    // Load active tasks (not completed)
    taskService
      .getTasks()
      .then((all) => {
        setTasks(all.filter((item) => item.status !== 'completed' && item.status !== 'cancelled'));
      })
      .catch(console.error);

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
    { id: 'pomodoro', label: t('focus.modePomodoro'), icon: Flame },
    { id: 'deep_work_50', label: t('focus.modeFlow50'), icon: Zap },
    { id: 'deep_work_90', label: t('focus.modeDeep90'), icon: Sparkles },
    { id: 'custom', label: t('focus.modeCustom'), icon: TimerIcon },
    { id: 'stopwatch', label: t('focus.modeStopwatch'), icon: Clock },
    { id: 'short_break', label: t('focus.modeShortBreak'), icon: Coffee },
    { id: 'long_break', label: t('focus.modeLongBreak'), icon: Coffee },
  ];

  const handleCaptureDistraction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!distractionText.trim()) return;
    await captureDistraction(distractionText.trim());
    setDistractionText('');
    setShowDistractionInput(false);
  };

  const handleCustomDurationChange = (val: string) => {
    setCustomMinutesInput(val);
    const num = parseInt(val, 10);
    if (!isNaN(num) && num > 0) {
      setTimerMode('custom', num);
    }
  };

  const isBreak = timerMode === 'short_break' || timerMode === 'long_break';

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
              onClick={() => {
                if (m.id === 'custom') {
                  const num = parseInt(customMinutesInput, 10) || 45;
                  setTimerMode('custom', num);
                } else {
                  setTimerMode(m.id);
                }
              }}
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

      {/* Custom Duration Input */}
      {timerMode === 'custom' && timerState === 'idle' && (
        <div className="flex items-center justify-center gap-2 text-xs">
          <span className="text-[#8a8a8a]">{isRtl ? 'مدت زمان دلخواه (دقیقه):' : 'Custom duration (minutes):'}</span>
          <input
            type="number"
            min={1}
            max={360}
            value={customMinutesInput}
            onChange={(e) => handleCustomDurationChange(e.target.value)}
            className="w-20 px-2 py-1 text-center bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-lg text-sm font-bold text-[#1f1f1f] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0078d4]"
          />
        </div>
      )}

      {/* Entity Association Selector (Task or Topic) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-start">
        <div>
          <label className="block text-xs font-semibold text-[#1f1f1f] dark:text-white mb-1 flex items-center gap-1.5">
            <CheckSquare className="w-3.5 h-3.5 text-[#0078d4]" />
            <span>{t('focus.taskLinked')}</span>
          </label>
          <select
            value={selectedTaskId || ''}
            disabled={timerState === 'running'}
            onChange={(e) => {
              const taskId = e.target.value || null;
              const taskObj = tasks.find((item) => item.id === taskId);
              setSelectedTask(taskId, taskObj?.title || null);
            }}
            className="w-full h-8 text-xs bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-lg px-2 text-[#1f1f1f] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0078d4] disabled:opacity-50"
          >
            <option value="">(بدون وظیفه مشخص)</option>
            {tasks.map((item) => (
              <option key={item.id} value={item.id}>
                {item.title}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-[#1f1f1f] dark:text-white mb-1 flex items-center gap-1.5">
            <BookOpen className="w-3.5 h-3.5 text-purple-500" />
            <span>{t('focus.topicLinked')}</span>
          </label>
          <select
            value={selectedTopicId || ''}
            disabled={timerState === 'running'}
            onChange={(e) => {
              const topicId = e.target.value || null;
              const topicObj = topics.find((top) => top.id === topicId);
              setSelectedTopic(topicId, topicObj?.subject_id || null, topicObj?.title || null);
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

      {/* Energy Level Selector */}
      <div className="flex items-center justify-between px-1 py-1.5 bg-black/3 dark:bg-white/3 rounded-xl text-xs">
        <span className="text-xs text-[#8a8a8a] flex items-center gap-1.5">
          <Zap className="w-3.5 h-3.5 text-amber-500" />
          <span>{t('focus.energyLevel')}:</span>
        </span>
        <div className="flex items-center gap-1">
          {[
            { val: 1, label: t('focus.energyLow') },
            { val: 2, label: t('focus.energyMedium') },
            { val: 3, label: t('focus.energyHigh') },
            { val: 4, label: t('focus.energySuper') },
          ].map((lvl) => (
            <button
              key={lvl.val}
              onClick={() => setEnergyLevel(lvl.val)}
              className={`px-2 py-0.5 rounded-md text-[11px] font-medium transition-all ${
                energyLevel === lvl.val
                  ? 'bg-amber-500 text-black font-bold shadow-sm'
                  : 'text-[#8a8a8a] hover:bg-black/5 dark:hover:bg-white/5'
              }`}
            >
              {lvl.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Timer Display & Progress Ring */}
      <div className="relative flex flex-col items-center justify-center py-4">
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
            <Badge variant={isBreak ? 'accent' : 'success'} size="sm" className="animate-pulse">
              {isBreak ? (isRtl ? 'زمان استراحت...' : 'Break time...') : (isRtl ? 'در حال تمرکز عمیق (اعلانات ویندوز بی‌صدا شده‌اند)' : 'Deep focus active (Windows DND on)')}
            </Badge>
          ) : timerState === 'paused' ? (
            <Badge variant="warning" size="sm">
              {t('focus.pause')}
            </Badge>
          ) : (
            <span className="text-xs text-[#8a8a8a]">
              {isRtl ? `مدت برنامه‌ریزی: ${plannedDurationMinutes} دقیقه` : `Planned duration: ${plannedDurationMinutes} min`}
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
            {t('focus.start')}
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
              {t('focus.pause')}
            </Button>
            {timerMode !== 'stopwatch' && (
              <Button
                variant="subtle"
                size="lg"
                icon={<Plus className="w-4 h-4 text-emerald-500" />}
                onClick={() => extendTime(5)}
                className="text-emerald-600 dark:text-emerald-400"
              >
                {t('focus.extend5m')}
              </Button>
            )}
            {isBreak && (
              <Button
                variant="subtle"
                size="lg"
                icon={<SkipForward className="w-4 h-4 text-blue-500" />}
                onClick={skipBreak}
              >
                {t('focus.skipBreak')}
              </Button>
            )}
            <Button
              variant="primary"
              size="lg"
              icon={<CheckCircle2 className="w-5 h-5" />}
              onClick={() => completeTimer(notes)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {t('focus.complete')}
            </Button>
            <Button
              variant="subtle"
              size="lg"
              icon={<XCircle className="w-5 h-5" />}
              onClick={() => abandonTimer(notes)}
              className="text-red-500 hover:bg-red-500/10"
            >
              {t('focus.abandon')}
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
              {t('focus.resume')}
            </Button>
            {timerMode !== 'stopwatch' && (
              <Button
                variant="subtle"
                size="lg"
                icon={<Plus className="w-4 h-4 text-emerald-500" />}
                onClick={() => extendTime(5)}
                className="text-emerald-600 dark:text-emerald-400"
              >
                {t('focus.extend5m')}
              </Button>
            )}
            <Button
              variant="secondary"
              size="lg"
              icon={<CheckCircle2 className="w-5 h-5" />}
              onClick={() => completeTimer(notes)}
              className="text-emerald-600"
            >
              {t('focus.complete')}
            </Button>
            <Button
              variant="subtle"
              size="lg"
              icon={<RotateCcw className="w-5 h-5" />}
              onClick={resetTimer}
            >
              {t('focus.reset')}
            </Button>
            <Button
              variant="subtle"
              size="lg"
              icon={<XCircle className="w-5 h-5" />}
              onClick={() => abandonTimer(notes)}
              className="text-red-500 hover:bg-red-500/10"
            >
              {t('focus.abandon')}
            </Button>
          </>
        )}
      </div>

      {/* Quick Distraction Capture Bar & Mini-Timer Overlay Launcher */}
      <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
        {/* Distraction button */}
        <Button
          variant="secondary"
          size="sm"
          icon={<Lightbulb className="w-4 h-4 text-amber-500" />}
          onClick={() => setShowDistractionInput(!showDistractionInput)}
          className="border-amber-500/30 hover:border-amber-500/60 bg-amber-500/5 text-xs"
        >
          <span>{t('focus.distractionLog')}</span>
          {distractionCount > 0 && (
            <span className="ms-1.5 px-2 py-0.2 rounded-full text-xs font-mono font-bold bg-amber-500 text-white">
              {distractionCount}
            </span>
          )}
        </Button>

        {/* Windows Mini-Timer Window Toggle */}
        <Button
          variant="subtle"
          size="sm"
          icon={<ExternalLink className="w-3.5 h-3.5 text-[#0078d4]" />}
          onClick={() => focusAssistService.toggleMiniTimerWindow(true)}
          className="text-xs"
        >
          <span>{t('focus.openMiniTimer')}</span>
        </Button>

        <button
          onClick={() => setShowNotes(!showNotes)}
          className="text-xs text-[#8a8a8a] hover:text-[#0078d4] underline"
        >
          {showNotes ? (isRtl ? 'بستن یادداشت' : 'Close Note') : (isRtl ? '+ افزودن یادداشت' : '+ Add Note')}
        </button>
      </div>

      {/* Distraction Inline Quick Form */}
      {showDistractionInput && (
        <form onSubmit={handleCaptureDistraction} className="flex items-center gap-2 max-w-md mx-auto pt-2 animate-in fade-in duration-200">
          <input
            type="text"
            autoFocus
            value={distractionText}
            onChange={(e) => setDistractionText(e.target.value)}
            placeholder={t('focus.distractionPlaceholder')}
            className="flex-1 text-xs bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-lg px-3 py-2 text-[#1f1f1f] dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
          <Button variant="primary" size="sm" type="submit" className="bg-amber-500 hover:bg-amber-600 text-black font-bold">
            <Send className="w-3.5 h-3.5" />
          </Button>
        </form>
      )}

      {/* Session Notes Input */}
      {showNotes && (
        <div className="text-start space-y-1 pt-2 max-w-md mx-auto">
          <label className="text-xs text-[#8a8a8a]">{isRtl ? 'یادداشت جلسه (اختیاری):' : 'Session note (optional):'}</label>
          <textarea
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={isRtl ? 'دستاوردها، موانع یا تمرکز روی چه موضوعی بود...' : 'Key accomplishments, blockers, or ideas...'}
            className="w-full text-xs bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-lg p-2.5 text-[#1f1f1f] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0078d4] resize-none"
          />
        </div>
      )}

      {/* Elapsed seconds info */}
      {elapsedSeconds > 0 && (
        <div className="text-[11px] text-[#8a8a8a] font-mono">
          {isRtl
            ? `زمان سپری‌شده واقعی: ${Math.floor(elapsedSeconds / 60)} دقیقه و ${elapsedSeconds % 60} ثانیه`
            : `Actual elapsed: ${Math.floor(elapsedSeconds / 60)}m ${elapsedSeconds % 60}s`}
        </div>
      )}
    </Card>
  );
};
