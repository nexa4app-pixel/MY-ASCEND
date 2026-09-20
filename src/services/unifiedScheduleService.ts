/**
 * Unified Schedule & Bi-Directional Time-Block Sync Engine — MY ASCEND
 * Maintains 1:1 bi-directional synchronization between SQLite tasks and time_blocks,
 * handles conflict detection/resolution, Afghan prayer/rest buffers, and cross-module linkages.
 */

import { db } from '../db/client';
import {
  Task,
  TimeBlock,
  TaskPriority,
  TaskStatus,
  ScheduleStatus,
  RecurrencePattern,
  ModuleLink,
} from '../types/database';
import { getCurrentUtcIsoString } from '../lib/date/utc';
import { settingsService } from './settingsService';
import { logger } from './logger';

export interface CreateScheduledTaskInput {
  title: string;
  description?: string | null;
  scheduledStartTime: string; // ISO-8601
  scheduledEndTime: string; // ISO-8601
  priority?: TaskPriority;
  status?: TaskStatus;
  moduleLink?: ModuleLink;
  academicSubjectId?: string | null;
  recurrencePattern?: RecurrencePattern;
  recurrenceDays?: string[];
  reminderOffsetMinutes?: number;
  projectId?: string | null;
  colorTag?: string | null;
}

export interface UpdateTimeBlockInput {
  title?: string;
  description?: string | null;
  scheduledStartTime?: string;
  scheduledEndTime?: string;
  status?: ScheduleStatus;
  moduleLink?: ModuleLink;
  academicSubjectId?: string | null;
  recurrencePattern?: RecurrencePattern;
  recurrenceDays?: string[];
  reminderOffsetMinutes?: number;
  colorTag?: string | null;
}

export interface TimeBlockFilter {
  startDate?: string;
  endDate?: string;
  moduleLink?: ModuleLink;
  status?: ScheduleStatus;
}

export interface PrayerBuffer {
  nameEn: string;
  nameFa: string;
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  durationMinutes: number;
}

class UnifiedScheduleService {
  private generateId(prefix: string): string {
    const rand = Math.random().toString(36).substring(2, 8);
    return `${prefix}_${Date.now()}_${rand}`;
  }

  /**
   * Approximate solar prayer windows for Kabul, Afghanistan (UTC+04:30)
   */
  public getAfghanPrayerBuffers(): PrayerBuffer[] {
    return [
      { nameEn: 'Fajr Buffer', nameFa: 'نماز صبح و ذکر', startTime: '04:45', endTime: '05:15', durationMinutes: 30 },
      { nameEn: 'Dhuhr Buffer', nameFa: 'نماز پیشین و استراحت', startTime: '11:55', endTime: '12:35', durationMinutes: 40 },
      { nameEn: 'Asr Buffer', nameFa: 'نماز دیگر و تجدید قوا', startTime: '15:45', endTime: '16:15', durationMinutes: 30 },
      { nameEn: 'Maghrib Buffer', nameFa: 'نماز شام و افطار/عصرانه', startTime: '18:10', endTime: '18:45', durationMinutes: 35 },
      { nameEn: 'Isha Buffer', nameFa: 'نماز خفتن و جمع‌بندی روز', startTime: '19:40', endTime: '20:15', durationMinutes: 35 },
    ];
  }

  /**
   * 1:1 Creation: Creates a Task and synchronously creates a corresponding TimeBlock
   */
  public async createScheduledTask(input: CreateScheduledTaskInput): Promise<{ task: Task; timeBlock: TimeBlock }> {
    const trimmedTitle = input.title.trim();
    if (!trimmedTitle) {
      throw new Error('Task title cannot be empty.');
    }
    if (!input.scheduledStartTime || !input.scheduledEndTime) {
      throw new Error('Both start and end time are required for scheduled tasks.');
    }

    const taskId = this.generateId('task');
    const timeBlockId = this.generateId('tblk');
    const now = getCurrentUtcIsoString();
    const deviceId = settingsService.getDeviceId();

    const priority: TaskPriority = input.priority || 'medium';
    const status: TaskStatus = input.status || 'todo';
    const recurrencePattern: RecurrencePattern = input.recurrencePattern || 'none';
    const recurrenceDaysStr = JSON.stringify(input.recurrenceDays || []);
    const moduleLink: ModuleLink = input.moduleLink || 'none';
    const academicSubjectId = input.academicSubjectId || null;
    const reminderOffsetMinutes = input.reminderOffsetMinutes ?? 15;
    const colorTag = input.colorTag || '#0078d4';

    // Insert Task
    await db.execute(
      `INSERT INTO tasks (
        id, created_at, updated_at, version, device_id, is_deleted, deleted_at,
        project_id, parent_task_id, title, description, due_date, priority, status,
        estimated_minutes, actual_minutes, completed_at,
        scheduled_start_time, scheduled_end_time, recurrence_pattern, recurrence_days,
        module_link, academic_subject_id, reminder_offset_minutes, time_block_id
      ) VALUES (?, ?, ?, 1, ?, 0, NULL, ?, NULL, ?, ?, ?, ?, ?, NULL, NULL, NULL, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        taskId,
        now,
        now,
        deviceId,
        input.projectId || null,
        trimmedTitle,
        input.description || null,
        input.scheduledStartTime, // due_date matches start time
        priority,
        status,
        input.scheduledStartTime,
        input.scheduledEndTime,
        recurrencePattern,
        recurrenceDaysStr,
        moduleLink,
        academicSubjectId,
        reminderOffsetMinutes,
        timeBlockId,
      ]
    );

    // Insert corresponding TimeBlock
    const timeBlockStatus: ScheduleStatus = status === 'completed' ? 'completed' : 'planned';
    await db.execute(
      `INSERT INTO time_blocks (
        id, created_at, updated_at, version, device_id, is_deleted, deleted_at,
        task_id, title, description, scheduled_start_time, scheduled_end_time,
        recurrence_pattern, recurrence_days, module_link, academic_subject_id,
        reminder_offset_minutes, status, color_tag
      ) VALUES (?, ?, ?, 1, ?, 0, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        timeBlockId,
        now,
        now,
        deviceId,
        taskId,
        trimmedTitle,
        input.description || null,
        input.scheduledStartTime,
        input.scheduledEndTime,
        recurrencePattern,
        recurrenceDaysStr,
        moduleLink,
        academicSubjectId,
        reminderOffsetMinutes,
        timeBlockStatus,
        colorTag,
      ]
    );

    logger.info(`Created 1:1 synced Task ${taskId} and TimeBlock ${timeBlockId}`, 'UnifiedScheduleService');

    const task: Task = {
      id: taskId,
      created_at: now,
      updated_at: now,
      version: 1,
      device_id: deviceId,
      is_deleted: 0,
      deleted_at: null,
      project_id: input.projectId || null,
      parent_task_id: null,
      title: trimmedTitle,
      description: input.description || null,
      due_date: input.scheduledStartTime,
      priority,
      status,
      estimated_minutes: null,
      actual_minutes: null,
      completed_at: null,
      scheduled_start_time: input.scheduledStartTime,
      scheduled_end_time: input.scheduledEndTime,
      recurrence_pattern: recurrencePattern,
      recurrence_days: input.recurrenceDays || [],
      module_link: moduleLink,
      academic_subject_id: academicSubjectId,
      reminder_offset_minutes: reminderOffsetMinutes,
      time_block_id: timeBlockId,
    };

    const timeBlock: TimeBlock = {
      id: timeBlockId,
      created_at: now,
      updated_at: now,
      version: 1,
      device_id: deviceId,
      is_deleted: 0,
      deleted_at: null,
      task_id: taskId,
      title: trimmedTitle,
      description: input.description || null,
      scheduled_start_time: input.scheduledStartTime,
      scheduled_end_time: input.scheduledEndTime,
      recurrence_pattern: recurrencePattern,
      recurrence_days: input.recurrenceDays || [],
      module_link: moduleLink,
      academic_subject_id: academicSubjectId,
      reminder_offset_minutes: reminderOffsetMinutes,
      status: timeBlockStatus,
      color_tag: colorTag,
    };

    return { task, timeBlock };
  }

  /**
   * Schedule an existing unscheduled task onto the calendar
   */
  public async scheduleTask(
    taskId: string,
    startTime: string,
    endTime: string,
    moduleLink?: ModuleLink,
    academicSubjectId?: string | null
  ): Promise<{ task: Task; timeBlock: TimeBlock }> {
    const existing = await this.getTaskById(taskId);
    if (!existing) {
      throw new Error(`Task ${taskId} not found.`);
    }

    const now = getCurrentUtcIsoString();
    const deviceId = settingsService.getDeviceId();
    let timeBlockId = existing.time_block_id;

    if (!timeBlockId) {
      timeBlockId = this.generateId('tblk');
      await db.execute(
        `INSERT INTO time_blocks (
          id, created_at, updated_at, version, device_id, is_deleted, deleted_at,
          task_id, title, description, scheduled_start_time, scheduled_end_time,
          recurrence_pattern, recurrence_days, module_link, academic_subject_id,
          reminder_offset_minutes, status, color_tag
        ) VALUES (?, ?, ?, 1, ?, 0, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          timeBlockId,
          now,
          now,
          deviceId,
          taskId,
          existing.title,
          existing.description || null,
          startTime,
          endTime,
          existing.recurrence_pattern || 'none',
          JSON.stringify(existing.recurrence_days || []),
          moduleLink || existing.module_link || 'none',
          academicSubjectId !== undefined ? academicSubjectId : existing.academic_subject_id || null,
          existing.reminder_offset_minutes || 15,
          existing.status === 'completed' ? 'completed' : 'planned',
          '#0078d4',
        ]
      );
    } else {
      await db.execute(
        `UPDATE time_blocks SET
          scheduled_start_time = ?,
          scheduled_end_time = ?,
          module_link = COALESCE(?, module_link),
          academic_subject_id = COALESCE(?, academic_subject_id),
          updated_at = ?,
          version = version + 1
        WHERE id = ?`,
        [
          startTime,
          endTime,
          moduleLink || null,
          academicSubjectId || null,
          now,
          timeBlockId,
        ]
      );
    }

    // Update Task
    await db.execute(
      `UPDATE tasks SET
        scheduled_start_time = ?,
        scheduled_end_time = ?,
        due_date = ?,
        module_link = COALESCE(?, module_link),
        academic_subject_id = COALESCE(?, academic_subject_id),
        time_block_id = ?,
        updated_at = ?,
        version = version + 1
      WHERE id = ?`,
      [
        startTime,
        endTime,
        startTime,
        moduleLink || null,
        academicSubjectId || null,
        timeBlockId,
        now,
        taskId,
      ]
    );

    const updatedTask = (await this.getTaskById(taskId))!;
    const updatedBlock = (await this.getTimeBlockById(timeBlockId))!;

    return { task: updatedTask, timeBlock: updatedBlock };
  }

  /**
   * Bi-Directional Update: Updating a TimeBlock synchronizes the linked Task
   */
  public async updateTimeBlock(id: string, updates: UpdateTimeBlockInput): Promise<TimeBlock> {
    const existing = await this.getTimeBlockById(id);
    if (!existing) {
      throw new Error(`TimeBlock ${id} not found.`);
    }

    const now = getCurrentUtcIsoString();
    const title = updates.title !== undefined ? updates.title.trim() : existing.title;
    const description = updates.description !== undefined ? updates.description : existing.description;
    const startTime = updates.scheduledStartTime !== undefined ? updates.scheduledStartTime : existing.scheduled_start_time;
    const endTime = updates.scheduledEndTime !== undefined ? updates.scheduledEndTime : existing.scheduled_end_time;
    const status = updates.status !== undefined ? updates.status : existing.status;
    const moduleLink = updates.moduleLink !== undefined ? updates.moduleLink : existing.module_link;
    const subjectId = updates.academicSubjectId !== undefined ? updates.academicSubjectId : existing.academic_subject_id;
    const recPattern = updates.recurrencePattern !== undefined ? updates.recurrencePattern : existing.recurrence_pattern;
    const recDays = updates.recurrenceDays !== undefined ? updates.recurrenceDays : existing.recurrence_days;
    const reminderOffset = updates.reminderOffsetMinutes !== undefined ? updates.reminderOffsetMinutes : existing.reminder_offset_minutes;
    const colorTag = updates.colorTag !== undefined ? updates.colorTag : existing.color_tag;

    await db.execute(
      `UPDATE time_blocks SET
        title = ?,
        description = ?,
        scheduled_start_time = ?,
        scheduled_end_time = ?,
        status = ?,
        module_link = ?,
        academic_subject_id = ?,
        recurrence_pattern = ?,
        recurrence_days = ?,
        reminder_offset_minutes = ?,
        color_tag = ?,
        updated_at = ?,
        version = version + 1
      WHERE id = ?`,
      [
        title,
        description,
        startTime,
        endTime,
        status,
        moduleLink,
        subjectId,
        recPattern,
        JSON.stringify(recDays || []),
        reminderOffset,
        colorTag,
        now,
        id,
      ]
    );

    // Synchronize linked Task if present
    if (existing.task_id) {
      const taskStatus: TaskStatus = status === 'completed' ? 'completed' : 'todo';
      const completedAt = status === 'completed' ? now : null;

      await db.execute(
        `UPDATE tasks SET
          title = ?,
          description = ?,
          scheduled_start_time = ?,
          scheduled_end_time = ?,
          due_date = ?,
          status = ?,
          module_link = ?,
          academic_subject_id = ?,
          recurrence_pattern = ?,
          recurrence_days = ?,
          reminder_offset_minutes = ?,
          completed_at = ?,
          updated_at = ?,
          version = version + 1
        WHERE id = ?`,
        [
          title,
          description,
          startTime,
          endTime,
          startTime,
          taskStatus,
          moduleLink,
          subjectId,
          recPattern,
          JSON.stringify(recDays || []),
          reminderOffset,
          completedAt,
          now,
          existing.task_id,
        ]
      );

      // Trigger academic subject progress update if applicable
      if (moduleLink === 'academic_center' && subjectId) {
        await this.updateSubjectProgress(subjectId);
      }
    }

    logger.info(`Updated TimeBlock ${id} and synced to Task ${existing.task_id}`, 'UnifiedScheduleService');
    return (await this.getTimeBlockById(id))!;
  }

  /**
   * Bi-Directional Status Toggle / Completion
   */
  public async toggleComplete(timeBlockId: string): Promise<TimeBlock> {
    const block = await this.getTimeBlockById(timeBlockId);
    if (!block) throw new Error(`TimeBlock ${timeBlockId} not found.`);

    const newStatus: ScheduleStatus = block.status === 'completed' ? 'planned' : 'completed';
    return this.updateTimeBlock(timeBlockId, { status: newStatus });
  }

  /**
   * Bi-Directional Deletion: Soft-deletes time block and linked task
   */
  public async deleteTimeBlock(id: string): Promise<void> {
    const block = await this.getTimeBlockById(id);
    if (!block) return;

    const now = getCurrentUtcIsoString();
    await db.execute(
      `UPDATE time_blocks SET is_deleted = 1, deleted_at = ?, updated_at = ? WHERE id = ?`,
      [now, now, id]
    );

    if (block.task_id) {
      await db.execute(
        `UPDATE tasks SET is_deleted = 1, deleted_at = ?, updated_at = ? WHERE id = ?`,
        [now, now, block.task_id]
      );
    }

    logger.info(`Deleted TimeBlock ${id} and linked Task ${block.task_id}`, 'UnifiedScheduleService');
  }

  /**
   * Delete Task and synchronously delete its corresponding TimeBlock
   */
  public async deleteTask(taskId: string): Promise<void> {
    const task = await this.getTaskById(taskId);
    if (!task) return;

    const now = getCurrentUtcIsoString();
    await db.execute(
      `UPDATE tasks SET is_deleted = 1, deleted_at = ?, updated_at = ? WHERE id = ?`,
      [now, now, taskId]
    );

    if (task.time_block_id) {
      await db.execute(
        `UPDATE time_blocks SET is_deleted = 1, deleted_at = ?, updated_at = ? WHERE id = ?`,
        [now, now, task.time_block_id]
      );
    }

    logger.info(`Deleted Task ${taskId} and linked TimeBlock ${task.time_block_id}`, 'UnifiedScheduleService');
  }

  /**
   * Query Unscheduled Tasks for Left Queue / Inbox
   */
  public async getUnscheduledTasks(): Promise<Task[]> {
    const sql = `
      SELECT * FROM tasks
      WHERE is_deleted = 0
        AND status != 'completed'
        AND (scheduled_start_time IS NULL OR scheduled_start_time = '')
      ORDER BY
        CASE priority
          WHEN 'urgent' THEN 1
          WHEN 'high' THEN 2
          WHEN 'medium' THEN 3
          WHEN 'low' THEN 4
          ELSE 5
        END ASC,
        created_at DESC
    `;
    const rows = await db.query<Task>(sql);
    return rows.map((r) => ({
      ...r,
      recurrence_days: typeof r.recurrence_days === 'string' ? JSON.parse(r.recurrence_days || '[]') : r.recurrence_days,
    }));
  }

  /**
   * Query TimeBlocks for Calendar View with Conflict Detection
   */
  public async getTimeBlocks(filter?: TimeBlockFilter): Promise<TimeBlock[]> {
    let sql = 'SELECT * FROM time_blocks WHERE is_deleted = 0';
    const params: unknown[] = [];

    if (filter?.startDate) {
      sql += ' AND scheduled_end_time >= ?';
      params.push(filter.startDate);
    }
    if (filter?.endDate) {
      sql += ' AND scheduled_start_time <= ?';
      params.push(filter.endDate);
    }
    if (filter?.moduleLink) {
      sql += ' AND module_link = ?';
      params.push(filter.moduleLink);
    }
    if (filter?.status) {
      sql += ' AND status = ?';
      params.push(filter.status);
    }

    sql += ' ORDER BY scheduled_start_time ASC';

    const rows = await db.query<TimeBlock>(sql, params);

    // Resolve academic subject titles
    const subjects = await db.query<{ id: string; name: string }>('SELECT id, name FROM subjects WHERE is_deleted = 0');
    const subjectMap = new Map<string, string>();
    subjects.forEach((s) => subjectMap.set(s.id, s.name));

    const parsedBlocks = rows.map((b) => ({
      ...b,
      recurrence_days: typeof b.recurrence_days === 'string' ? JSON.parse(b.recurrence_days || '[]') : b.recurrence_days,
      academic_subject_name: b.academic_subject_id ? subjectMap.get(b.academic_subject_id) || null : null,
    }));

    return this.annotateConflicts(parsedBlocks);
  }

  /**
   * Annotate time blocks with conflict flags
   */
  public annotateConflicts(blocks: TimeBlock[]): TimeBlock[] {
    const annotated = blocks.map((b) => ({ ...b, has_conflict: false, conflicting_with_id: null as string | null }));

    for (let i = 0; i < annotated.length; i++) {
      for (let j = i + 1; j < annotated.length; j++) {
        const a = annotated[i];
        const b = annotated[j];

        const aStart = new Date(a.scheduled_start_time).getTime();
        const aEnd = new Date(a.scheduled_end_time).getTime();
        const bStart = new Date(b.scheduled_start_time).getTime();
        const bEnd = new Date(b.scheduled_end_time).getTime();

        // Conflict condition: intervals overlap
        if (aStart < bEnd && aEnd > bStart) {
          annotated[i].has_conflict = true;
          annotated[i].conflicting_with_id = b.id;
          annotated[j].has_conflict = true;
          annotated[j].conflicting_with_id = a.id;
        }
      }
    }

    return annotated;
  }

  /**
   * Smart Conflict Resolver: Shifts overlapping blocks forward by duration + bufferMinutes
   */
  public resolveConflicts<T extends { scheduled_start_time: string; scheduled_end_time: string }>(
    blocks: T[],
    bufferMinutes: number = 10
  ): T[] {
    if (blocks.length <= 1) return [...blocks];

    // Sort chronologically
    const sorted = [...blocks].sort(
      (a, b) => new Date(a.scheduled_start_time).getTime() - new Date(b.scheduled_start_time).getTime()
    );

    for (let i = 1; i < sorted.length; i++) {
      const prev = sorted[i - 1];
      const curr = sorted[i];

      const prevEnd = new Date(prev.scheduled_end_time).getTime();
      const currStart = new Date(curr.scheduled_start_time).getTime();
      const currEnd = new Date(curr.scheduled_end_time).getTime();
      const durationMs = Math.max(15 * 60 * 1000, currEnd - currStart);

      if (currStart < prevEnd) {
        // Shift current block forward
        const newStartMs = prevEnd + bufferMinutes * 60 * 1000;
        const newEndMs = newStartMs + durationMs;

        curr.scheduled_start_time = new Date(newStartMs).toISOString();
        curr.scheduled_end_time = new Date(newEndMs).toISOString();
      }
    }

    return sorted;
  }

  /**
   * Recalculate academic subject progress percent based on completed tasks/topics
   */
  public async updateSubjectProgress(subjectId: string): Promise<void> {
    try {
      const tasks = await db.query<{ status: string }>(
        'SELECT status FROM tasks WHERE academic_subject_id = ? AND is_deleted = 0',
        [subjectId]
      );

      if (tasks.length === 0) return;

      const completed = tasks.filter((t) => t.status === 'completed').length;
      const progressPercent = Math.round((completed / tasks.length) * 100);

      // In MY ASCEND, academic subject progress is reflected in topics or subject metadata
      logger.info(
        `Academic Subject ${subjectId} progress: ${completed}/${tasks.length} (${progressPercent}%)`,
        'UnifiedScheduleService'
      );
    } catch (err) {
      console.warn('Failed to update subject progress:', err);
    }
  }

  public async getTaskById(id: string): Promise<Task | null> {
    const rows = await db.query<Task>('SELECT * FROM tasks WHERE id = ? AND is_deleted = 0', [id]);
    if (rows.length === 0) return null;
    const r = rows[0];
    return {
      ...r,
      recurrence_days: typeof r.recurrence_days === 'string' ? JSON.parse(r.recurrence_days || '[]') : r.recurrence_days,
    };
  }

  public async getTimeBlockById(id: string): Promise<TimeBlock | null> {
    const rows = await db.query<TimeBlock>('SELECT * FROM time_blocks WHERE id = ? AND is_deleted = 0', [id]);
    if (rows.length === 0) return null;
    const r = rows[0];
    return {
      ...r,
      recurrence_days: typeof r.recurrence_days === 'string' ? JSON.parse(r.recurrence_days || '[]') : r.recurrence_days,
    };
  }
}

export const unifiedScheduleService = new UnifiedScheduleService();
