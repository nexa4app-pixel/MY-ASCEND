/**
 * Global Focus Timer Zustand Store — MY ASCEND
 * Advanced Multi-mode Productivity Engine, Windows DND Sync & Cross-Window Bridge
 */
import { create } from 'zustand';
import { focusService } from '../services/focusService';
import { focusAssistService } from '../services/focusAssistService';
import { soundSynthesizer } from '../lib/audio/chime';
import { FocusSessionType } from '../types/database';

export type TimerMode =
  | 'pomodoro'
  | 'deep_work_50'
  | 'deep_work_90'
  | 'custom'
  | 'stopwatch'
  | 'short_break'
  | 'long_break';

export type TimerState = 'idle' | 'running' | 'paused';

export const DEFAULT_DURATIONS: Record<TimerMode, number> = {
  pomodoro: 25 * 60,
  deep_work_50: 50 * 60,
  deep_work_90: 90 * 60,
  custom: 45 * 60,
  stopwatch: 0,
  short_break: 5 * 60,
  long_break: 15 * 60,
};

export interface FocusStoreState {
  timerMode: TimerMode;
  timerState: TimerState;
  timeRemaining: number; // in seconds
  elapsedSeconds: number; // in seconds
  plannedDurationMinutes: number;

  activeSessionId: string | null;
  selectedTaskId: string | null;
  selectedTaskTitle: string | null;
  selectedTopicId: string | null;
  selectedTopicTitle: string | null;
  selectedSubjectId: string | null;
  interruptionCount: number;
  distractionCount: number;
  energyLevel: number; // 1 to 5
  pomodorosCompletedToday: number;

  // Actions
  setTimerMode: (mode: TimerMode, customMinutes?: number) => void;
  setSelectedTask: (taskId: string | null, taskTitle?: string | null) => void;
  setSelectedTopic: (topicId: string | null, subjectId?: string | null, topicTitle?: string | null) => void;
  setEnergyLevel: (level: number) => void;

  startTimer: () => Promise<void>;
  pauseTimer: () => void;
  resumeTimer: () => void;
  extendTime: (minutes?: number) => void;
  skipBreak: () => void;
  completeTimer: (notes?: string | null) => Promise<void>;
  abandonTimer: (notes?: string | null) => Promise<void>;
  resetTimer: () => void;
  addInterruption: () => Promise<void>;
  captureDistraction: (thought: string) => Promise<void>;
  tick: () => void;
  syncFromRemote: (partial: Partial<FocusStoreState>) => void;
}

let timerInterval: ReturnType<typeof setInterval> | null = null;
let broadcastChannel: BroadcastChannel | null = null;

if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
  try {
    broadcastChannel = new BroadcastChannel('ascend_focus_channel');
  } catch {
    broadcastChannel = null;
  }
}

const broadcastUpdate = (state: Partial<FocusStoreState>) => {
  if (broadcastChannel) {
    try {
      broadcastChannel.postMessage({ type: 'FOCUS_SYNC', state });
    } catch {}
  }
};

const startBackgroundTicker = (get: () => FocusStoreState) => {
  if (timerInterval) clearInterval(timerInterval);

  timerInterval = setInterval(() => {
    const { timerState } = get();
    if (timerState === 'running') {
      get().tick();
    }
  }, 1000);
};

export const useFocusStore = create<FocusStoreState>((set, get) => {
  // Listen for broadcast messages from other windows (e.g. mini-timer overlay)
  if (broadcastChannel) {
    broadcastChannel.onmessage = (event) => {
      if (event.data?.type === 'FOCUS_SYNC' && event.data.state) {
        set(event.data.state);
      }
    };
  }

  return {
    timerMode: 'pomodoro',
    timerState: 'idle',
    timeRemaining: DEFAULT_DURATIONS.pomodoro,
    elapsedSeconds: 0,
    plannedDurationMinutes: 25,

    activeSessionId: null,
    selectedTaskId: null,
    selectedTaskTitle: null,
    selectedTopicId: null,
    selectedTopicTitle: null,
    selectedSubjectId: null,
    interruptionCount: 0,
    distractionCount: 0,
    energyLevel: 3,
    pomodorosCompletedToday: 0,

    setTimerMode: (mode: TimerMode, customMinutes?: number) => {
      let minutes = customMinutes;
      if (!minutes) {
        switch (mode) {
          case 'pomodoro':
            minutes = 25;
            break;
          case 'deep_work_50':
            minutes = 50;
            break;
          case 'deep_work_90':
            minutes = 90;
            break;
          case 'custom':
            minutes = 45;
            break;
          case 'short_break':
            minutes = 5;
            break;
          case 'long_break':
            minutes = 15;
            break;
          case 'stopwatch':
            minutes = 0;
            break;
          default:
            minutes = 25;
        }
      }
      const durationSec = mode === 'stopwatch' ? 0 : minutes * 60;

      const updated = {
        timerMode: mode,
        timerState: 'idle' as TimerState,
        plannedDurationMinutes: minutes,
        timeRemaining: durationSec,
        elapsedSeconds: 0,
        activeSessionId: null,
        interruptionCount: 0,
        distractionCount: 0,
      };

      set(updated);
      broadcastUpdate(updated);
    },

    setSelectedTask: (taskId: string | null, taskTitle?: string | null) => {
      const updated = {
        selectedTaskId: taskId,
        selectedTaskTitle: taskTitle || null,
        selectedTopicId: taskId ? null : get().selectedTopicId,
        selectedTopicTitle: taskId ? null : get().selectedTopicTitle,
      };
      set(updated);
      broadcastUpdate(updated);
    },

    setSelectedTopic: (topicId: string | null, subjectId?: string | null, topicTitle?: string | null) => {
      const updated = {
        selectedTopicId: topicId,
        selectedTopicTitle: topicTitle || null,
        selectedSubjectId: subjectId || null,
        selectedTaskId: topicId ? null : get().selectedTaskId,
        selectedTaskTitle: topicId ? null : get().selectedTaskTitle,
      };
      set(updated);
      broadcastUpdate(updated);
    },

    setEnergyLevel: (level: number) => {
      const energyLevel = Math.max(1, Math.min(5, Math.round(level)));
      set({ energyLevel });
      broadcastUpdate({ energyLevel });
    },

    startTimer: async () => {
      const {
        timerMode,
        plannedDurationMinutes,
        selectedTaskId,
        selectedTopicId,
        selectedSubjectId,
        energyLevel,
      } = get();

      const isBreak = timerMode === 'short_break' || timerMode === 'long_break';

      // Start DB session for focus activities (not breaks)
      let sessionId: string | null = null;
      if (!isBreak) {
        const type: FocusSessionType =
          timerMode === 'stopwatch'
            ? 'stopwatch'
            : timerMode === 'deep_work_50'
            ? 'deep_work_50'
            : timerMode === 'deep_work_90'
            ? 'deep_work_90'
            : timerMode === 'custom'
            ? 'custom'
            : 'pomodoro';

        try {
          const session = await focusService.startFocusSession({
            taskId: selectedTaskId,
            topicId: selectedTopicId,
            subjectId: selectedSubjectId,
            sessionType: type,
            plannedDurationMinutes,
            energyLevel,
          });
          sessionId = session.id;
        } catch (err) {
          console.error('Failed to persist start focus session:', err);
        }

        // Enable Windows Do Not Disturb / Focus Assist
        focusAssistService.setFocusAssist(true).catch(() => {});
      }

      const updated = {
        timerState: 'running' as TimerState,
        activeSessionId: sessionId,
        interruptionCount: 0,
        distractionCount: 0,
        elapsedSeconds: 0,
        timeRemaining: timerMode === 'stopwatch' ? 0 : plannedDurationMinutes * 60,
      };

      set(updated);
      broadcastUpdate(updated);
      startBackgroundTicker(get);
    },

    pauseTimer: () => {
      set({ timerState: 'paused' });
      broadcastUpdate({ timerState: 'paused' });
      focusAssistService.setFocusAssist(false).catch(() => {});
    },

    resumeTimer: () => {
      const isBreak = get().timerMode === 'short_break' || get().timerMode === 'long_break';
      set({ timerState: 'running' });
      broadcastUpdate({ timerState: 'running' });
      if (!isBreak) {
        focusAssistService.setFocusAssist(true).catch(() => {});
      }
      startBackgroundTicker(get);
    },

    extendTime: (minutes: number = 5) => {
      const { timeRemaining, plannedDurationMinutes, timerMode } = get();
      if (timerMode === 'stopwatch') return;

      const addedSec = minutes * 60;
      const updated = {
        timeRemaining: timeRemaining + addedSec,
        plannedDurationMinutes: plannedDurationMinutes + minutes,
      };
      set(updated);
      broadcastUpdate(updated);
    },

    skipBreak: () => {
      const { setTimerMode } = get();
      setTimerMode('pomodoro', 25);
    },

    completeTimer: async (notes?: string | null) => {
      const {
        activeSessionId,
        elapsedSeconds,
        timerMode,
        pomodorosCompletedToday,
        energyLevel,
      } = get();

      const actualMins = Math.max(1, Math.round(elapsedSeconds / 60));

      if (activeSessionId) {
        try {
          await focusService.completeFocusSession(
            activeSessionId,
            actualMins,
            notes,
            energyLevel
          );
        } catch (err) {
          console.error('Failed to persist complete focus session:', err);
        }
      }

      // Restore Windows notifications
      focusAssistService.setFocusAssist(false).catch(() => {});

      soundSynthesizer.playCompletionChime();

      const newPomodoros =
        timerMode === 'pomodoro' || timerMode === 'deep_work_50' || timerMode === 'deep_work_90'
          ? pomodorosCompletedToday + 1
          : pomodorosCompletedToday;

      // Auto-suggest break after completed focus
      let nextMode: TimerMode = 'pomodoro';
      if (timerMode === 'pomodoro') {
        nextMode = newPomodoros % 4 === 0 ? 'long_break' : 'short_break';
      } else if (timerMode === 'deep_work_50') {
        nextMode = 'short_break';
      } else if (timerMode === 'deep_work_90') {
        nextMode = 'long_break';
      }

      const updated = {
        timerMode: nextMode,
        timerState: 'idle' as TimerState,
        activeSessionId: null,
        timeRemaining: DEFAULT_DURATIONS[nextMode],
        plannedDurationMinutes: Math.round(DEFAULT_DURATIONS[nextMode] / 60),
        elapsedSeconds: 0,
        interruptionCount: 0,
        distractionCount: 0,
        pomodorosCompletedToday: newPomodoros,
      };

      set(updated);
      broadcastUpdate(updated);
    },

    abandonTimer: async (notes?: string | null) => {
      const { activeSessionId, elapsedSeconds, timerMode } = get();
      const actualMins = Math.round(elapsedSeconds / 60);

      if (activeSessionId) {
        try {
          await focusService.abandonFocusSession(activeSessionId, actualMins, notes);
        } catch (err) {
          console.error('Failed to persist abandon focus session:', err);
        }
      }

      focusAssistService.setFocusAssist(false).catch(() => {});

      const updated = {
        timerState: 'idle' as TimerState,
        activeSessionId: null,
        timeRemaining: DEFAULT_DURATIONS[timerMode],
        elapsedSeconds: 0,
        interruptionCount: 0,
        distractionCount: 0,
      };

      set(updated);
      broadcastUpdate(updated);
    },

    resetTimer: () => {
      const { timerMode, plannedDurationMinutes } = get();
      focusAssistService.setFocusAssist(false).catch(() => {});

      const updated = {
        timerState: 'idle' as TimerState,
        activeSessionId: null,
        timeRemaining: timerMode === 'stopwatch' ? 0 : plannedDurationMinutes * 60,
        elapsedSeconds: 0,
        interruptionCount: 0,
        distractionCount: 0,
      };

      set(updated);
      broadcastUpdate(updated);
    },

    addInterruption: async () => {
      const { activeSessionId, interruptionCount } = get();
      soundSynthesizer.playInterruptionPulse();

      if (activeSessionId) {
        try {
          await focusService.logInterruption(activeSessionId);
        } catch (err) {
          console.error('Failed to log interruption to DB:', err);
        }
      }

      const updated = { interruptionCount: interruptionCount + 1 };
      set(updated);
      broadcastUpdate(updated);
    },

    captureDistraction: async (thought: string) => {
      const { activeSessionId, distractionCount, interruptionCount } = get();
      soundSynthesizer.playInterruptionPulse();

      try {
        await focusService.logDistraction(activeSessionId, thought);
      } catch (err) {
        console.error('Failed to log distraction thought:', err);
      }

      const updated = {
        distractionCount: distractionCount + 1,
        interruptionCount: interruptionCount + 1,
      };
      set(updated);
      broadcastUpdate(updated);
    },

    tick: () => {
      const { timerMode, timeRemaining, elapsedSeconds } = get();

      if (timerMode === 'stopwatch') {
        const nextSec = elapsedSeconds + 1;
        const updated = {
          elapsedSeconds: nextSec,
          timeRemaining: nextSec,
        };
        set(updated);
        broadcastUpdate(updated);
      } else {
        // Countdown modes
        if (timeRemaining <= 1) {
          get().completeTimer();
        } else {
          const nextRemaining = timeRemaining - 1;
          const nextElapsed = elapsedSeconds + 1;
          const updated = {
            timeRemaining: nextRemaining,
            elapsedSeconds: nextElapsed,
          };
          set(updated);
          // Broadcast ticks throttled or every tick
          broadcastUpdate(updated);
        }
      }
    },

    syncFromRemote: (partial: Partial<FocusStoreState>) => {
      set(partial);
    },
  };
});
