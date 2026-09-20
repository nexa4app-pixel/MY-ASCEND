import React, { useState } from 'react';
import {
  Play,
  Pause,
  Plus,
  Lightbulb,
  X,
  Flame,
  Coffee,
  Clock,
  Send,
} from 'lucide-react';
import { useFocusStore } from '../store/useFocusStore';
import { useTranslation } from '../store/useLocaleStore';
import { focusAssistService } from '../services/focusAssistService';

export const MiniTimerOverlay: React.FC = () => {
  const { isRtl } = useTranslation();
  const {
    timerMode,
    timerState,
    timeRemaining,
    selectedTaskTitle,
    selectedTopicTitle,
    distractionCount,
    pauseTimer,
    resumeTimer,
    extendTime,
    captureDistraction,
  } = useFocusStore();

  const [distractionText, setDistractionText] = useState('');
  const [showDistractionInput, setShowDistractionInput] = useState(false);

  const formatTime = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const handleCapture = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!distractionText.trim()) return;
    await captureDistraction(distractionText.trim());
    setDistractionText('');
    setShowDistractionInput(false);
  };

  const handleCloseOverlay = () => {
    focusAssistService.toggleMiniTimerWindow(false);
  };

  const activeTitle = selectedTaskTitle || selectedTopicTitle || (isRtl ? 'تمرکز آزاد' : 'Free Focus');
  const isBreak = timerMode === 'short_break' || timerMode === 'long_break';

  return (
    <div
      data-tauri-drag-region
      className="w-full h-full min-h-[105px] max-h-[110px] bg-[#1e1e1e]/90 dark:bg-[#121212]/90 backdrop-blur-xl border border-white/10 rounded-2xl p-2.5 shadow-2xl text-white select-none flex flex-col justify-between overflow-hidden cursor-move font-sans"
    >
      {/* Top Bar */}
      <div className="flex items-center justify-between gap-1 text-[11px] text-white/70">
        <div className="flex items-center gap-1.5 truncate max-w-[170px]">
          {isBreak ? (
            <Coffee className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          ) : timerMode === 'stopwatch' ? (
            <Clock className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
          ) : (
            <Flame className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          )}
          <span className="truncate font-medium text-white/90 text-[11px]">{activeTitle}</span>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowDistractionInput(!showDistractionInput)}
            title={isRtl ? 'ثبت سریع حواس‌پرتی' : 'Quick Distraction Log'}
            className="p-1 rounded-md hover:bg-white/10 text-amber-300 transition-colors relative"
          >
            <Lightbulb className="w-3.5 h-3.5" />
            {distractionCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] font-bold rounded-full w-3 h-3 flex items-center justify-center">
                {distractionCount}
              </span>
            )}
          </button>
          <button
            onClick={handleCloseOverlay}
            title={isRtl ? 'بستن ویجت' : 'Close Widget'}
            className="p-1 rounded-md hover:bg-white/10 text-white/60 hover:text-white transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Row / Distraction Drawer */}
      {showDistractionInput ? (
        <form onSubmit={handleCapture} className="flex items-center gap-1.5 mt-1">
          <input
            type="text"
            autoFocus
            value={distractionText}
            onChange={(e) => setDistractionText(e.target.value)}
            placeholder={isRtl ? 'چه چیزی ذهنت را منحرف کرد؟' : 'What distracted you?'}
            className="flex-1 bg-white/10 border border-white/20 rounded-lg px-2 py-1 text-xs text-white placeholder-white/40 focus:outline-none focus:border-amber-400"
          />
          <button
            type="submit"
            className="p-1.5 bg-amber-500 hover:bg-amber-600 rounded-lg text-black font-bold transition-all"
          >
            <Send className="w-3 h-3" />
          </button>
        </form>
      ) : (
        <div className="flex items-center justify-between gap-2 mt-1">
          <div className="text-2xl font-black font-mono tracking-wider text-white">
            {formatTime(timeRemaining)}
          </div>

          <div className="flex items-center gap-1.5">
            {/* Extend +5 Min */}
            {timerMode !== 'stopwatch' && (
              <button
                onClick={() => extendTime(5)}
                title={isRtl ? '۵ دقیقه تمدید' : '+5 Minutes'}
                className="flex items-center gap-0.5 px-1.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-[10px] font-semibold text-white/80 hover:text-white transition-all"
              >
                <Plus className="w-3 h-3 text-emerald-400" />
                <span>5m</span>
              </button>
            )}

            {/* Play / Pause */}
            {timerState === 'running' ? (
              <button
                onClick={pauseTimer}
                className="p-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 border border-amber-500/30 transition-all shadow-sm"
              >
                <Pause className="w-4 h-4 fill-current" />
              </button>
            ) : (
              <button
                onClick={resumeTimer}
                className="p-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/30 transition-all shadow-sm"
              >
                <Play className="w-4 h-4 fill-current" />
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
