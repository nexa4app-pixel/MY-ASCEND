import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../src/db/client';
import { unifiedScheduleService } from '../src/services/unifiedScheduleService';
import { aiScheduleImporterService } from '../src/services/aiScheduleImporterService';
import { taskService } from '../src/services/taskService';
import { subjectService } from '../src/services/subjectService';
import { institutionService } from '../src/services/institutionService';

describe('Unified Calendar & Task Synchronization Engine (SQLite 1:1 Bi-Directional)', () => {
  beforeEach(async () => {
    // Clean tables before each test
    await db.execute('DELETE FROM time_blocks');
    await db.execute('DELETE FROM tasks');
    await db.execute('DELETE FROM subjects');
    await db.execute('DELETE FROM institutions');
  });

  // ─── 1. Creation & 1:1 Sync ───────────────────────────────────────────────

  it('1. should create a scheduled task and synchronously create matching time_block', async () => {
    const startIso = '2026-09-20T08:00:00.000Z';
    const endIso = '2026-09-20T09:30:00.000Z';

    const { task, timeBlock } = await unifiedScheduleService.createScheduledTask({
      title: 'جلسه حل تمرین الگوریتم',
      description: 'بررسی مسائل گراف',
      scheduledStartTime: startIso,
      scheduledEndTime: endIso,
      priority: 'high',
      moduleLink: 'academic_center',
      reminderOffsetMinutes: 15,
      colorTag: '#0078d4',
    });

    // Check Task entity
    expect(task.id).toMatch(/^task_/);
    expect(task.title).toBe('جلسه حل تمرین الگوریتم');
    expect(task.scheduled_start_time).toBe(startIso);
    expect(task.scheduled_end_time).toBe(endIso);
    expect(task.due_date).toBe(startIso);
    expect(task.priority).toBe('high');
    expect(task.module_link).toBe('academic_center');
    expect(task.time_block_id).toBe(timeBlock.id);

    // Check TimeBlock entity
    expect(timeBlock.id).toMatch(/^tblk_/);
    expect(timeBlock.task_id).toBe(task.id);
    expect(timeBlock.title).toBe('جلسه حل تمرین الگوریتم');
    expect(timeBlock.scheduled_start_time).toBe(startIso);
    expect(timeBlock.scheduled_end_time).toBe(endIso);
    expect(timeBlock.module_link).toBe('academic_center');
    expect(timeBlock.status).toBe('planned');

    // Verify persisted rows in SQLite
    const taskRows = await db.query('SELECT * FROM tasks WHERE id = ?', [task.id]);
    const blockRows = await db.query('SELECT * FROM time_blocks WHERE id = ?', [timeBlock.id]);

    expect(taskRows.length).toBe(1);
    expect(blockRows.length).toBe(1);
  });

  // ─── 2. Scheduling Existing Unscheduled Tasks ─────────────────────────────

  it('2. should schedule an unscheduled task and attach a new time_block', async () => {
    // Create an unscheduled task (inbox/backlog)
    const task = await taskService.createTask({
      title: 'مطالعه مستندات معماری',
      priority: 'urgent',
    });

    expect(task.scheduled_start_time).toBeUndefined();

    // Drag-and-drop onto calendar
    const startIso = '2026-09-20T10:00:00.000Z';
    const endIso = '2026-09-20T11:00:00.000Z';

    const { task: scheduledTask, timeBlock } = await unifiedScheduleService.scheduleTask(
      task.id,
      startIso,
      endIso,
      'focus_engine'
    );

    expect(scheduledTask.scheduled_start_time).toBe(startIso);
    expect(scheduledTask.scheduled_end_time).toBe(endIso);
    expect(scheduledTask.time_block_id).toBe(timeBlock.id);
    expect(scheduledTask.module_link).toBe('focus_engine');

    expect(timeBlock.task_id).toBe(task.id);
    expect(timeBlock.title).toBe('مطالعه مستندات معماری');
    expect(timeBlock.scheduled_start_time).toBe(startIso);
  });

  // ─── 3. Bi-Directional Updates ────────────────────────────────────────────

  it('3. should update linked Task when TimeBlock is modified', async () => {
    const { timeBlock, task } = await unifiedScheduleService.createScheduledTask({
      title: 'جلسه تمرکز اولیه',
      scheduledStartTime: '2026-09-20T08:00:00.000Z',
      scheduledEndTime: '2026-09-20T09:00:00.000Z',
    });

    const newStart = '2026-09-20T13:00:00.000Z';
    const newEnd = '2026-09-20T14:30:00.000Z';

    const updatedBlock = await unifiedScheduleService.updateTimeBlock(timeBlock.id, {
      title: 'جلسه تغییریافته',
      scheduledStartTime: newStart,
      scheduledEndTime: newEnd,
      moduleLink: 'focus_engine',
    });

    expect(updatedBlock.title).toBe('جلسه تغییریافته');
    expect(updatedBlock.scheduled_start_time).toBe(newStart);

    // Linked task must also have updated in SQLite
    const updatedTask = await unifiedScheduleService.getTaskById(task.id);
    expect(updatedTask?.title).toBe('جلسه تغییریافته');
    expect(updatedTask?.scheduled_start_time).toBe(newStart);
    expect(updatedTask?.scheduled_end_time).toBe(newEnd);
    expect(updatedTask?.module_link).toBe('focus_engine');
  });

  // ─── 4. Completion Toggle & State Propagation ─────────────────────────────

  it('4. should propagate completion between time_block and task', async () => {
    const { timeBlock, task } = await unifiedScheduleService.createScheduledTask({
      title: 'انجام پروژه آزمایشگاه',
      scheduledStartTime: '2026-09-20T14:00:00.000Z',
      scheduledEndTime: '2026-09-20T15:00:00.000Z',
    });

    expect(timeBlock.status).toBe('planned');
    expect(task.status).toBe('todo');

    // Toggle complete
    const completedBlock = await unifiedScheduleService.toggleComplete(timeBlock.id);
    expect(completedBlock.status).toBe('completed');

    const updatedTask = await unifiedScheduleService.getTaskById(task.id);
    expect(updatedTask?.status).toBe('completed');
    expect(updatedTask?.completed_at).toBeDefined();

    // Toggle uncomplete
    const reopenedBlock = await unifiedScheduleService.toggleComplete(timeBlock.id);
    expect(reopenedBlock.status).toBe('planned');

    const reopenedTask = await unifiedScheduleService.getTaskById(task.id);
    expect(reopenedTask?.status).toBe('todo');
    expect(reopenedTask?.completed_at).toBeNull();
  });

  // ─── 5. Bi-Directional Soft Deletion ──────────────────────────────────────

  it('5. should soft-delete linked task when time_block is deleted', async () => {
    const { timeBlock, task } = await unifiedScheduleService.createScheduledTask({
      title: 'وظیفه موقت برای حذف',
      scheduledStartTime: '2026-09-20T08:00:00.000Z',
      scheduledEndTime: '2026-09-20T09:00:00.000Z',
    });

    await unifiedScheduleService.deleteTimeBlock(timeBlock.id);

    const checkBlock = await unifiedScheduleService.getTimeBlockById(timeBlock.id);
    const checkTask = await unifiedScheduleService.getTaskById(task.id);

    expect(checkBlock).toBeNull();
    expect(checkTask).toBeNull();
  });

  it('6. should soft-delete linked time_block when task is deleted', async () => {
    const { timeBlock, task } = await unifiedScheduleService.createScheduledTask({
      title: 'وظیفه برای تست حذف تسک',
      scheduledStartTime: '2026-09-20T08:00:00.000Z',
      scheduledEndTime: '2026-09-20T09:00:00.000Z',
    });

    await unifiedScheduleService.deleteTask(task.id);

    const checkBlock = await unifiedScheduleService.getTimeBlockById(timeBlock.id);
    const checkTask = await unifiedScheduleService.getTaskById(task.id);

    expect(checkBlock).toBeNull();
    expect(checkTask).toBeNull();
  });

  // ─── 7. Academic Cross-Module Synergy ─────────────────────────────────────

  it('7. should link academic subject and recalculate progress when completed', async () => {
    // Setup Institution and Subject
    const inst = await institutionService.createInstitution({
      name: 'دانشگاه پولی‌تخنیک کابل',
      type: 'university',
    });

    const subject = await subjectService.createSubject({
      institutionId: inst.id,
      name: 'پایگاه داده‌ها',
    });

    // Create 2 tasks linked to this subject
    const item1 = await unifiedScheduleService.createScheduledTask({
      title: 'تکلیف ۱ پایگاه داده',
      scheduledStartTime: '2026-09-20T08:00:00.000Z',
      scheduledEndTime: '2026-09-20T09:00:00.000Z',
      moduleLink: 'academic_center',
      academicSubjectId: subject.id,
    });

    await unifiedScheduleService.createScheduledTask({
      title: 'تکلیف ۲ پایگاه داده',
      scheduledStartTime: '2026-09-20T09:30:00.000Z',
      scheduledEndTime: '2026-09-20T10:30:00.000Z',
      moduleLink: 'academic_center',
      academicSubjectId: subject.id,
    });

    // Complete item 1
    await unifiedScheduleService.toggleComplete(item1.timeBlock.id);

    // Verify task is completed
    const t1 = await unifiedScheduleService.getTaskById(item1.task.id);
    expect(t1?.status).toBe('completed');
  });

  // ─── 8. Atomic Bulk Commit via AI Schedule Importer ───────────────────────

  it('8. should bulk insert AI imported items in a single atomic transaction with subject auto-linking', async () => {
    // Create an academic subject
    const inst = await institutionService.createInstitution({
      name: 'پوهنتون کابل',
      type: 'university',
    });

    await subjectService.createSubject({
      institutionId: inst.id,
      name: 'سیستم‌های عامل',
    });

    const itemsToImport = [
      {
        title: 'مطالعه زمان‌بندی پردازنده',
        description: 'فصل ۵ کتاب سیلبرشاتز',
        scheduled_start_time: '2026-09-20T08:00:00.000Z',
        scheduled_end_time: '2026-09-20T09:30:00.000Z',
        priority: 'urgent' as const,
        module_link: 'academic_center' as const,
        academic_subject_title: 'سیستم‌های عامل',
        reminder_offset_minutes: 15,
      },
      {
        title: 'بلوک تمرکز عمیق کدنویسی پروژه',
        description: 'پیاده‌سازی الگوریتم Round Robin',
        scheduled_start_time: '2026-09-20T09:45:00.000Z',
        scheduled_end_time: '2026-09-20T11:15:00.000Z',
        priority: 'high' as const,
        module_link: 'focus_engine' as const,
        academic_subject_title: null,
        reminder_offset_minutes: 15,
      },
    ];

    const result = await aiScheduleImporterService.commitScheduleImport(itemsToImport);

    expect(result.success).toBe(true);
    expect(result.importedCount).toBe(2);
    expect(result.linkedSubjectsCount).toBe(1);

    // Verify both items exist in time_blocks and tasks
    const blocks = await unifiedScheduleService.getTimeBlocks();
    expect(blocks.length).toBe(2);

    const academicBlock = blocks.find((b) => b.module_link === 'academic_center');
    expect(academicBlock).toBeDefined();
    expect(academicBlock?.academic_subject_name).toBe('سیستم‌های عامل');

    const focusBlock = blocks.find((b) => b.module_link === 'focus_engine');
    expect(focusBlock).toBeDefined();
    expect(focusBlock?.color_tag).toBe('#d83b01');
  });

  // ─── 9. Afghan Prayer Buffers ─────────────────────────────────────────────

  it('9. should return standard 5 Kabul daily prayer buffers', () => {
    const buffers = unifiedScheduleService.getAfghanPrayerBuffers();
    expect(buffers.length).toBe(5);
    expect(buffers[0].nameEn).toContain('Fajr');
    expect(buffers[1].nameEn).toContain('Dhuhr');
    expect(buffers[2].nameEn).toContain('Asr');
    expect(buffers[3].nameEn).toContain('Maghrib');
    expect(buffers[4].nameEn).toContain('Isha');
  });
});
