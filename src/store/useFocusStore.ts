/**
 * Global Focus Timer Zustand Store — MY ASCEND
 * Controls live timer state, background ticking, audio chimes, and entity linkages across routes.
 */
import { create } from 'zustand';
import { focusService } from '../services/focusService';
import { soundSynthesizer } from '../lib/audio/chime';
import { FocusSessionType } from '../types/database';

export type TimerMode = 'pomodoro' | 'short_break' | 'long_break' | 'stopwatch' | 'countdown';
export type TimerState = 'idle' | 'running' | 'paused';

const DEFAULT_DURATIONS: Record<TimerMode, number> = {
  pomodoro: 25 * 60,
  short_break: 5 * 60,
  long_break: 15 * 60,
  stopwatch: 0,
  countdown: 30 * 60,
};

interface FocusStoreState {
  timerMode: TimerMode;
  timerState: TimerState;
  timeRemaining: number; // in seconds
  elapsedSeconds: number; // in seconds
  plannedDurationMinutes: number;

  activeSessionId: string | null;
  selectedTaskId: string | null;
  selectedTopicId: string | null;
  selectedSubjectId: string | null;
  interruptionCount: number;
  pomodorosCompletedToday: number;

  // Actions
  setTimerMode: (mode: TimerMode, customMinutes?: number) => void;
  setSelectedTask: (taskId: string | null) => void;
  setSelectedTopic: (topicId: string | null, subjectId?: string | null) => void;

  startTimer: () => Promise<void>;
  pauseTimer: () => void;
  resumeTimer: () => void;
  completeTimer: (notes?: string | null) => Promise<void>;
  abandonTimer: (notes?: string | null) => Promise<void>;
  resetTimer: () => void;
  addInterruption: () => Promise<void>;
  tick: () => void;
}

let timerInterval: ReturnType<typeof setInterval> | null = null;

const startBackgroundTicker = (get: () => FocusStoreState) => {
  if (timerInterval) clearInterval(timerInterval);

  timerInterval = setInterval(() => {
    const { timerState } = get();
    if (timerState === 'running') {
      get().tick();
    }
  }, 1000);
};

export const useFocusStore = create<FocusStoreState>((set, get) => ({
  timerMode: 'pomodoro',
  timerState: 'idle',
  timeRemaining: DEFAULT_DURATIONS.pomodoro,
  elapsedSeconds: 0,
  plannedDurationMinutes: 25,

  activeSessionId: null,
  selectedTaskId: null,
  selectedTopicId: null,
  selectedSubjectId: null,
  interruptionCount: 0,
  pomodorosCompletedToday: 0,

  setTimerMode: (mode: TimerMode, customMinutes?: number) => {
    const minutes = customMinutes || (mode === 'pomodoro' ? 25 : mode === 'short_break' ? 5 : mode === 'long_break' ? 15 : 30);
    const durationSec = mode === 'stopwatch' ? 0 : minutes * 60;

    set(() => ({
      timerMode: mode,
      timerState: 'idle',
      plannedDurationMinutes: minutes,
      timeRemaining: durationSec,
      elapsedSeconds: 0,
      activeSessionId: null,
      interruptionCount: 0,
    }));
  },

  setSelectedTask: (taskId: string | null) => {
    set(() => ({
      selectedTaskId: taskId,
      selectedTopicId: taskId ? null : get().selectedTopicId,
    }));
  },

  setSelectedTopic: (topicId: string | null, subjectId?: string | null) => {
    set(() => ({
      selectedTopicId: topicId,
      selectedSubjectId: subjectId || null,
      selectedTaskId: topicId ? null : get().selectedTaskId,
    }));
  },

  startTimer: async () => {
    const { timerMode, plannedDurationMinutes, selectedTaskId, selectedTopicId, selectedSubjectId } = get();

    // Start DB session for focus activities (not breaks)
    let sessionId: string | null = null;
    if (timerMode === 'pomodoro' || timerMode === 'stopwatch' || timerMode === 'countdown') {
      const type: FocusSessionType = timerMode === 'stopwatch' ? 'stopwatch' : timerMode === 'countdown' ? 'countdown' : 'pomodoro';
      try {
        const session = await focusService.startFocusSession({
          taskId: selectedTaskId,
          topicId: selectedTopicId,
          subjectId: selectedSubjectId,
          sessionType: type,
          plannedDurationMinutes,
        });
        sessionId = session.id;
      } catch (err) {
        console.error('Failed to persist start focus session:', err);
      }
    }

    set(() => ({
      timerState: 'running',
      activeSessionId: sessionId,
      interruptionCount: 0,
      elapsedSeconds: 0,
      timeRemaining: timerMode === 'stopwatch' ? 0 : plannedDurationMinutes * 60,
    }));

    startBackgroundTicker(get);
  },

  pauseTimer: () => {
    set(() => ({ timerState: 'paused' }));
  },

  resumeTimer: () => {
    set(() => ({ timerState: 'running' }));
    startBackgroundTicker(get);
  },

  completeTimer: async (notes?: string | null) => {
    const { activeSessionId, elapsedSeconds, timerMode, pomodorosCompletedToday } = get();

    const actualMins = Math.max(1, Math.round(elapsedSeconds / 60));

    if (activeSessionId) {
      try {
        await focusService.completeFocusSession(activeSessionId, actualMins, notes);
      } catch (err) {
        console.error('Failed to persist complete focus session:', err);
      }
    }

    soundSynthesizer.playCompletionChime();

    const newPomodoros = timerMode === 'pomodoro' ? pomodorosCompletedToday + 1 : pomodorosCompletedToday;

    set(() => ({
      timerState: 'idle',
      activeSessionId: null,
      timeRemaining: DEFAULT_DURATIONS[timerMode],
      elapsedSeconds: 0,
      interruptionCount: 0,
      pomodorosCompletedToday: newPomodoros,
    }));
  },

  abandonTimer: async (notes?: string | null) => {
    const { activeSessionId, elapsedSeconds } = get();
    const actualMins = Math.round(elapsedSeconds / 60);

    if (activeSessionId) {
      try {
        await focusService.abandonFocusSession(activeSessionId, actualMins, notes);
      } catch (err) {
        console.error('Failed to persist abandon focus session:', err);
      }
    }

    set(() => ({
      timerState: 'idle',
      activeSessionId: null,
      timeRemaining: DEFAULT_DURATIONS[get().timerMode],
      elapsedSeconds: 0,
      interruptionCount: 0,
    }));
  },

  resetTimer: () => {
    const { timerMode, plannedDurationMinutes } = get();
    set(() => ({
      timerState: 'idle',
      activeSessionId: null,
      timeRemaining: timerMode === 'stopwatch' ? 0 : plannedDurationMinutes * 60,
      elapsedSeconds: 0,
      interruptionCount: 0,
    }));
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

    set(() => ({ interruptionCount: interruptionCount + 1 }));
  },

  tick: () => {
    const { timerMode, timeRemaining, elapsedSeconds } = get();

    if (timerMode === 'stopwatch') {
      set(() => ({
        elapsedSeconds: elapsedSeconds + 1,
        timeRemaining: elapsedSeconds + 1,
      }));
    } else {
      // Countdown modes (pomodoro, breaks, countdown)
      if (timeRemaining <= 1) {
        // Finished
        get().completeTimer();
      } else {
        set(() => ({
          timeRemaining: timeRemaining - 1,
          elapsedSeconds: elapsedSeconds + 1,
        }));
      }
    }
  },
}));
