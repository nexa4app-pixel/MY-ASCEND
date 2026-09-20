/**
 * Phase 06 — Focus Engine & Time-Blocking Calendar Tests
 * Covers: Focus sessions (Pomodoro, Stopwatch, Countdown), Interruption tracking,
 * Entity linkages (Tasks, Topics), Focus stats, and Schedule time-blocks with universal metadata & soft-delete.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { db } from '../src/db/client';
import { focusService } from '../src/services/focusService';
import { scheduleService } from '../src/services/scheduleService';
import { useFocusStore } from '../src/store/useFocusStore';
import { isValidUtcIso } from '../src/lib/date/utc';

let testTaskId: string;
let testTopicId: string;
let testSubjectId: string;

describe('Phase 06: Focus Engine & Time-Blocking Calendar', () => {
  beforeAll(async () => {
    // Clean all focus and schedule data before running suite
    await db.execute('DELETE FROM focus_sessions');
    await db.execute('DELETE FROM schedules');
    await db.execute("DELETE FROM trash WHERE entity_type IN ('focus_sessions', 'schedules')");

    // Ensure dummy fixtures for Task, Subject, and Topic
    const profiles = await db.query<{ id: string }>('SELECT id FROM profiles LIMIT 1');
    const profileId = profiles[0]?.id || 'profile_default';

    // Insert dummy task
    testTaskId = `task_focus_${Date.now()}`;
    await db.execute(
      `INSERT INTO tasks (id, created_at, updated_at, version, device_id, is_deleted, deleted_at, title, status, priority)
       VALUES (?, datetime('now'), datetime('now'), 1, 'dev', 0, NULL, 'تسک تست تمرکز', 'todo', 'p1')`,
      [testTaskId]
    );

    // Insert dummy subject
    testSubjectId = `subj_focus_${Date.now()}`;
    const insts = await db.query<{ id: string }>('SELECT id FROM institutions LIMIT 1');
    const instId = insts[0]?.id || `inst_${Date.now()}`;
    await db.execute(
      `INSERT OR IGNORE INTO institutions (id, created_at, updated_at, version, device_id, is_deleted, deleted_at, name, type, profile_id)
       VALUES (?, datetime('now'), datetime('now'), 1, 'dev', 0, NULL, 'دانشگاه تست', 'university', ?)`,
      [instId, profileId]
    );
    await db.execute(
      `INSERT INTO subjects (id, created_at, updated_at, version, device_id, is_deleted, deleted_at, name, institution_id)
       VALUES (?, datetime('now'), datetime('now'), 1, 'dev', 0, NULL, 'طراحی الگوریتم', ?)`,
      [testSubjectId, instId]
    );

    // Insert dummy chapter & topic
    const bookId = `book_${Date.now()}`;
    await db.execute(
      `INSERT INTO books (id, created_at, updated_at, version, device_id, is_deleted, deleted_at, title, subject_id)
       VALUES (?, datetime('now'), datetime('now'), 1, 'dev', 0, NULL, 'کتاب تست', ?)`,
      [bookId, testSubjectId]
    );
    const chapId = `chap_${Date.now()}`;
    await db.execute(
      `INSERT INTO chapters (id, created_at, updated_at, version, device_id, is_deleted, deleted_at, title, book_id, chapter_number)
       VALUES (?, datetime('now'), datetime('now'), 1, 'dev', 0, NULL, 'فصل ۱', ?, 1)`,
      [chapId, bookId]
    );
    testTopicId = `topic_focus_${Date.now()}`;
    await db.execute(
      `INSERT INTO topics (id, created_at, updated_at, version, device_id, is_deleted, deleted_at, title, chapter_id, subject_id, importance_level, is_completed)
       VALUES (?, datetime('now'), datetime('now'), 1, 'dev', 0, NULL, 'الگوریتم حریصانه', ?, ?, 'high', 0)`,
      [testTopicId, chapId, testSubjectId]
    );
  });

  // ─── 1. Focus Session Lifecycle & Metadata ─────────────────────────────────

  describe('Focus Session Lifecycle', () => {
    it('should start a Pomodoro focus session with universal metadata and UTC ISO-8601 timestamps', async () => {
      const session = await focusService.startFocusSession({
        sessionType: 'pomodoro',
        plannedDurationMinutes: 25,
        notes: 'شروع پومودورو ۱',
      });

      expect(session.id).toMatch(/^focus_\d+_[a-z0-9]{6}$/);
      expect(session.session_type).toBe('pomodoro');
      expect(session.planned_duration_minutes).toBe(25);
      expect(session.actual_duration_minutes).toBe(0);
      expect(session.interruption_count).toBe(0);
      expect(session.completed_status).toBe('completed');
      expect(session.notes).toBe('شروع پومودورو ۱');
      expect(session.version).toBe(1);
      expect(session.is_deleted).toBe(0);
      expect(session.deleted_at).toBeNull();
      expect(isValidUtcIso(session.created_at)).toBe(true);
      expect(isValidUtcIso(session.updated_at)).toBe(true);
      expect(isValidUtcIso(session.started_at)).toBe(true);
      expect(session.ended_at).toBeNull();
    });

    it('should complete a focus session, recording actual minutes and ended_at timestamp', async () => {
      const session = await focusService.startFocusSession({
        plannedDurationMinutes: 25,
      });

      const completed = await focusService.completeFocusSession(session.id, 25, 'تکمیل موفقیت‌آمیز');

      expect(completed.id).toBe(session.id);
      expect(completed.actual_duration_minutes).toBe(25);
      expect(completed.completed_status).toBe('completed');
      expect(completed.notes).toBe('تکمیل موفقیت‌آمیز');
      expect(completed.version).toBe(2);
      expect(completed.ended_at).not.toBeNull();
      expect(isValidUtcIso(completed.ended_at!)).toBe(true);
    });

    it('should abandon a focus session with partial time recorded', async () => {
      const session = await focusService.startFocusSession({
        plannedDurationMinutes: 25,
      });

      const abandoned = await focusService.abandonFocusSession(session.id, 12, 'انصراف به دلیل تماس اضطراری');

      expect(abandoned.id).toBe(session.id);
      expect(abandoned.actual_duration_minutes).toBe(12);
      expect(abandoned.completed_status).toBe('abandoned');
      expect(abandoned.notes).toBe('انصراف به دلیل تماس اضطراری');
      expect(abandoned.version).toBe(2);
      expect(abandoned.ended_at).not.toBeNull();
    });

    it('should start and complete a Stopwatch free session', async () => {
      const session = await focusService.startFocusSession({
        sessionType: 'stopwatch',
      });

      expect(session.session_type).toBe('stopwatch');

      const completed = await focusService.completeFocusSession(session.id, 42);
      expect(completed.actual_duration_minutes).toBe(42);
    });

    it('should start and complete a custom Countdown session', async () => {
      const session = await focusService.startFocusSession({
        sessionType: 'countdown',
        plannedDurationMinutes: 45,
      });

      expect(session.session_type).toBe('countdown');
      expect(session.planned_duration_minutes).toBe(45);

      const completed = await focusService.completeFocusSession(session.id, 45);
      expect(completed.actual_duration_minutes).toBe(45);
    });

    it('should link a focus session to a Task ID', async () => {
      const session = await focusService.startFocusSession({
        taskId: testTaskId,
        plannedDurationMinutes: 30,
      });

      expect(session.task_id).toBe(testTaskId);

      const retrieved = await focusService.getFocusSessionById(session.id);
      expect(retrieved?.task_id).toBe(testTaskId);
      expect(retrieved?.task_title).toBe('تسک تست تمرکز');
    });

    it('should link a focus session to an Academic Topic and Subject ID', async () => {
      const session = await focusService.startFocusSession({
        topicId: testTopicId,
        subjectId: testSubjectId,
        plannedDurationMinutes: 50,
      });

      expect(session.topic_id).toBe(testTopicId);
      expect(session.subject_id).toBe(testSubjectId);

      const retrieved = await focusService.getFocusSessionById(session.id);
      expect(retrieved?.topic_title).toBe('الگوریتم حریصانه');
      expect(retrieved?.subject_name).toBe('طراحی الگوریتم');
    });

    it('should increment interruption count dynamically via logInterruption', async () => {
      const session = await focusService.startFocusSession({ plannedDurationMinutes: 25 });

      const count1 = await focusService.logInterruption(session.id);
      expect(count1).toBe(1);

      const count2 = await focusService.logInterruption(session.id);
      expect(count2).toBe(2);

      const count3 = await focusService.logInterruption(session.id);
      expect(count3).toBe(3);

      const retrieved = await focusService.getFocusSessionById(session.id);
      expect(retrieved?.interruption_count).toBe(3);
      expect(retrieved?.version).toBe(4); // 1 initial + 3 increments
    });

    it('should reject completing or abandoning a non-existent session ID', async () => {
      await expect(
        focusService.completeFocusSession('non_existent_id', 25)
      ).rejects.toThrow('جلسه تمرکز با شناسه non_existent_id یافت نشد.');

      await expect(
        focusService.abandonFocusSession('non_existent_id', 10)
      ).rejects.toThrow('جلسه تمرکز با شناسه non_existent_id یافت نشد.');
    });

    it('should filter focus sessions by Task ID and Topic ID', async () => {
      const taskSessions = await focusService.getFocusSessions({ taskId: testTaskId });
      expect(taskSessions.every((s) => s.task_id === testTaskId)).toBe(true);

      const topicSessions = await focusService.getFocusSessions({ topicId: testTopicId });
      expect(topicSessions.every((s) => s.topic_id === testTopicId)).toBe(true);
    });

    it('should soft-delete a focus session and write JSON audit snapshot to trash', async () => {
      const session = await focusService.startFocusSession({ plannedDurationMinutes: 20 });

      await focusService.deleteFocusSession(session.id);

      const retrieved = await focusService.getFocusSessionById(session.id);
      expect(retrieved).toBeNull();

      const trash = await db.query<{ id: string; entity_id: string; payload: string }>(
        "SELECT id, entity_id, payload FROM trash WHERE entity_type = 'focus_sessions' AND entity_id = ?",
        [session.id]
      );
      expect(trash.length).toBe(1);
      const parsed = JSON.parse(trash[0].payload);
      expect(parsed.id).toBe(session.id);
    });
  });

  // ─── 2. Focus Statistics Computation ───────────────────────────────────────

  describe('Focus Statistics Computation', () => {
    it('should accurately calculate focus statistics (today minutes, total minutes, completion rate)', async () => {
      // Clear sessions to verify exact stats
      await db.execute('DELETE FROM focus_sessions');

      // Create 2 completed sessions of 25m each
      const s1 = await focusService.startFocusSession({ plannedDurationMinutes: 25 });
      await focusService.completeFocusSession(s1.id, 25);

      const s2 = await focusService.startFocusSession({ plannedDurationMinutes: 25 });
      await focusService.completeFocusSession(s2.id, 25);
      await focusService.logInterruption(s2.id);
      await focusService.logInterruption(s2.id);

      // Create 1 abandoned session of 10m
      const s3 = await focusService.startFocusSession({ plannedDurationMinutes: 25 });
      await focusService.abandonFocusSession(s3.id, 10);
      await focusService.logInterruption(s3.id);

      const stats = await focusService.getFocusStats();

      expect(stats.totalFocusedMinutes).toBe(60); // 25 + 25 + 10
      expect(stats.todayFocusedMinutes).toBe(60);
      expect(stats.completedSessionsCount).toBe(2);
      expect(stats.abandonedSessionsCount).toBe(1);
      expect(stats.totalInterruptionCount).toBe(3); // 2 + 1
      expect(stats.completionRate).toBe(67); // 2 / 3 = 66.6% -> 67%
      expect(stats.averageSessionMinutes).toBe(30); // 60 / 2 completed = 30m
    });
  });

  // ─── 3. Schedule & Time-Blocking Calendar CRUD ─────────────────────────────

  describe('Schedule & Time-Blocking Calendar', () => {
    it('should create a schedule time-block with universal metadata and UTC timestamps', async () => {
      const schedule = await scheduleService.createSchedule({
        title: 'بلوک تمرکز طراحی الگوریتم',
        entityType: 'topic',
        entityId: testTopicId,
        startTime: '2026-09-07T09:00:00.000Z',
        endTime: '2026-09-07T11:00:00.000Z',
        colorTag: '#0078d4',
        status: 'planned',
      });

      expect(schedule.id).toMatch(/^sched_\d+_[a-z0-9]{6}$/);
      expect(schedule.title).toBe('بلوک تمرکز طراحی الگوریتم');
      expect(schedule.entity_type).toBe('topic');
      expect(schedule.entity_id).toBe(testTopicId);
      expect(schedule.start_time).toBe('2026-09-07T09:00:00.000Z');
      expect(schedule.end_time).toBe('2026-09-07T11:00:00.000Z');
      expect(schedule.color_tag).toBe('#0078d4');
      expect(schedule.status).toBe('planned');
      expect(schedule.is_all_day).toBe(0);
      expect(schedule.version).toBe(1);
      expect(schedule.is_deleted).toBe(0);
      expect(isValidUtcIso(schedule.created_at)).toBe(true);
      expect(isValidUtcIso(schedule.updated_at)).toBe(true);
    });

    it('should reject creating a schedule block with empty title or invalid times', async () => {
      await expect(
        scheduleService.createSchedule({
          title: '   ',
          startTime: '2026-09-07T09:00:00.000Z',
          endTime: '2026-09-07T10:00:00.000Z',
        })
      ).rejects.toThrow('عنوان زمان‌بندی نمی‌تواند خالی باشد.');

      await expect(
        scheduleService.createSchedule({
          title: 'تست بدون زمان',
          startTime: '',
          endTime: '2026-09-07T10:00:00.000Z',
        })
      ).rejects.toThrow('زمان شروع الزامی است.');
    });

    it('should create a schedule block linked to a Task', async () => {
      const schedule = await scheduleService.createSchedule({
        title: 'اجرای تسک مهم',
        entityType: 'task',
        entityId: testTaskId,
        startTime: '2026-09-07T14:00:00.000Z',
        endTime: '2026-09-07T15:30:00.000Z',
        colorTag: '#107c41',
      });

      expect(schedule.entity_type).toBe('task');
      expect(schedule.entity_id).toBe(testTaskId);

      const retrieved = await scheduleService.getScheduleById(schedule.id);
      expect(retrieved?.entity_title).toBe('تسک تست تمرکز');
    });

    it('should update a schedule block and increment version', async () => {
      const schedule = await scheduleService.createSchedule({
        title: 'عنوان اولیه',
        startTime: '2026-09-07T16:00:00.000Z',
        endTime: '2026-09-07T17:00:00.000Z',
      });

      const updated = await scheduleService.updateSchedule(schedule.id, {
        title: 'عنوان ویرایش‌شده',
        status: 'completed',
        colorTag: '#d83b01',
      });

      expect(updated.title).toBe('عنوان ویرایش‌شده');
      expect(updated.status).toBe('completed');
      expect(updated.color_tag).toBe('#d83b01');
      expect(updated.version).toBe(2);
    });

    it('should query schedules by date range (Day and Week views)', async () => {
      // Query for 2026-09-07
      const daySchedules = await scheduleService.getSchedules({
        startDate: '2026-09-07T00:00:00.000Z',
        endDate: '2026-09-07T23:59:59.999Z',
      });

      expect(daySchedules.length).toBeGreaterThan(0);
      expect(
        daySchedules.every(
          (s) => s.end_time >= '2026-09-07T00:00:00.000Z' && s.start_time <= '2026-09-07T23:59:59.999Z'
        )
      ).toBe(true);
    });

    it('should soft-delete a schedule block and write JSON audit snapshot to trash', async () => {
      const schedule = await scheduleService.createSchedule({
        title: 'زمان‌بندی موقت حذفی',
        startTime: '2026-09-08T08:00:00.000Z',
        endTime: '2026-09-08T09:00:00.000Z',
      });

      await scheduleService.deleteSchedule(schedule.id);

      const retrieved = await scheduleService.getScheduleById(schedule.id);
      expect(retrieved).toBeNull();

      const trash = await db.query<{ id: string; entity_id: string; payload: string }>(
        "SELECT id, entity_id, payload FROM trash WHERE entity_type = 'schedules' AND entity_id = ?",
        [schedule.id]
      );
      expect(trash.length).toBe(1);
      const parsed = JSON.parse(trash[0].payload);
      expect(parsed.id).toBe(schedule.id);
      expect(parsed.title).toBe('زمان‌بندی موقت حذفی');
    });
  });

  // ─── 4. Advanced Multi-Mode Focus & Distractions Engine ───────────────────

  describe('Advanced Multi-Mode Focus & Distractions Engine', () => {
    it('should create and complete deep_work_50 and deep_work_90 sessions with energy levels', async () => {
      const s50 = await focusService.startFocusSession({
        sessionType: 'deep_work_50',
        plannedDurationMinutes: 50,
        energyLevel: 4,
      });

      expect(s50.session_type).toBe('deep_work_50');
      expect(s50.planned_duration_minutes).toBe(50);
      expect(s50.energy_level).toBe(4);

      const completed50 = await focusService.completeFocusSession(s50.id, 50, 'Flow achieved', 3);
      expect(completed50.actual_duration_minutes).toBe(50);
      expect(completed50.energy_level).toBe(3);

      const s90 = await focusService.startFocusSession({
        sessionType: 'deep_work_90',
        plannedDurationMinutes: 90,
        energyLevel: 2,
      });

      expect(s90.session_type).toBe('deep_work_90');
      expect(s90.planned_duration_minutes).toBe(90);
      expect(s90.energy_level).toBe(2);

      const sCustom = await focusService.startFocusSession({
        sessionType: 'custom',
        plannedDurationMinutes: 35,
      });
      expect(sCustom.session_type).toBe('custom');
      expect(sCustom.planned_duration_minutes).toBe(35);
    });

    it('should log distractions, retrieve them by session, and increment distractions count', async () => {
      const session = await focusService.startFocusSession({
        sessionType: 'pomodoro',
        plannedDurationMinutes: 25,
      });

      const d1 = await focusService.logDistraction(session.id, 'Check email reply');
      expect(d1.id).toMatch(/^distract_\d+_[a-z0-9]{6}$/);
      expect(d1.session_id).toBe(session.id);
      expect(d1.thought).toBe('Check email reply');
      expect(isValidUtcIso(d1.logged_at)).toBe(true);

      const d2 = await focusService.logDistraction(session.id, 'Buy coffee beans');
      expect(d2.thought).toBe('Buy coffee beans');

      // Fetch session distractions (newest first)
      const sessionDistractions = await focusService.getDistractions(session.id);
      expect(sessionDistractions.length).toBe(2);
      expect(sessionDistractions[0].thought).toBe('Buy coffee beans');
      expect(sessionDistractions[1].thought).toBe('Check email reply');

      // Check session metadata reflects distractions_count
      const retrieved = await focusService.getFocusSessionById(session.id);
      expect(retrieved?.distractions_count).toBe(2);
    });

    it('should aggregate totalDistractionCount in getFocusStats', async () => {
      const stats = await focusService.getFocusStats();
      expect(stats.totalDistractionCount).toBeGreaterThanOrEqual(2);
    });

    it('should exercise useFocusStore state machine: extendTime, skipBreak, setEnergyLevel, captureDistraction', async () => {
      const store = useFocusStore.getState();
      store.resetTimer();
      store.setTimerMode('pomodoro', 25);
      store.setEnergyLevel(4);
      expect(useFocusStore.getState().energyLevel).toBe(4);

      await store.startTimer();
      expect(useFocusStore.getState().timerState).toBe('running');
      const prevRemaining = useFocusStore.getState().timeRemaining;

      // Extend time by 5 minutes (+300 seconds)
      store.extendTime(5);
      expect(useFocusStore.getState().timeRemaining).toBe(prevRemaining + 300);

      // Capture distraction in active store
      await store.captureDistraction('Wondering about next feature');
      expect(useFocusStore.getState().distractionCount).toBe(1);

      // Complete timer -> triggers suggestion for short break
      await store.completeTimer('Focus session done');
      expect(useFocusStore.getState().timerState).toBe('idle');
      expect(useFocusStore.getState().timerMode).toBe('short_break');

      // Skip break -> returns to pomodoro
      store.skipBreak();
      expect(useFocusStore.getState().timerMode).toBe('pomodoro');
      expect(useFocusStore.getState().timerState).toBe('idle');
    });
  });
});

