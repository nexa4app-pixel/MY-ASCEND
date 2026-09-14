/**
 * Focus Engine Service — MY ASCEND
 * Manages Pomodoro, Stopwatch, and Countdown focus sessions, distraction/interruption tracking, and focus statistics.
 */
import { db } from '../db/client';
import {
  FocusSession,
  FocusSessionType,
  FocusCompletedStatus,
} from '../types/database';
import { getCurrentUtcIsoString } from '../lib/date/utc';
import { settingsService } from './settingsService';
import { logger } from './logger';

export interface StartFocusSessionInput {
  taskId?: string | null;
  topicId?: string | null;
  subjectId?: string | null;
  projectId?: string | null;
  sessionType?: FocusSessionType;
  plannedDurationMinutes?: number;
  startedAt?: string;
  notes?: string | null;
}

export interface FocusSessionFilter {
  taskId?: string | null;
  topicId?: string | null;
  subjectId?: string | null;
  sessionType?: FocusSessionType;
  completedStatus?: FocusCompletedStatus;
  limit?: number;
}

export interface FocusStats {
  todayFocusedMinutes: number;
  totalFocusedMinutes: number;
  completedSessionsCount: number;
  abandonedSessionsCount: number;
  totalInterruptionCount: number;
  completionRate: number; // 0 to 100
  averageSessionMinutes: number;
}

class FocusService {
  private generateId(prefix: string): string {
    const rand = Math.random().toString(36).substring(2, 8);
    return `${prefix}_${Date.now()}_${rand}`;
  }

  public async startFocusSession(input: StartFocusSessionInput): Promise<FocusSession> {
    const id = this.generateId('focus');
    const now = getCurrentUtcIsoString();
    const deviceId = settingsService.getDeviceId();
    const sessionType: FocusSessionType = input.sessionType || 'pomodoro';
    const plannedDuration =
      input.plannedDurationMinutes !== undefined && input.plannedDurationMinutes !== null
        ? Math.max(1, Math.round(input.plannedDurationMinutes))
        : 25;
    const startedAt = input.startedAt || now;

    await db.execute(
      `INSERT INTO focus_sessions (
        id, created_at, updated_at, version, device_id, is_deleted, deleted_at,
        task_id, topic_id, subject_id, project_id, session_type, planned_duration_minutes,
        actual_duration_minutes, interruption_count, completed_status, notes, started_at, ended_at
      ) VALUES (?, ?, ?, 1, ?, 0, NULL, ?, ?, ?, ?, ?, ?, 0, 0, 'completed', ?, ?, NULL)`,
      [
        id,
        now,
        now,
        deviceId,
        input.taskId || null,
        input.topicId || null,
        input.subjectId || null,
        input.projectId || null,
        sessionType,
        plannedDuration,
        input.notes?.trim() || null,
        startedAt,
      ]
    );

    logger.info(`Started focus session ${id} (type=${sessionType}, planned=${plannedDuration}m)`, 'FocusService');

    const session: FocusSession = {
      id,
      created_at: now,
      updated_at: now,
      version: 1,
      device_id: deviceId,
      is_deleted: 0,
      deleted_at: null,
      task_id: input.taskId || null,
      topic_id: input.topicId || null,
      subject_id: input.subjectId || null,
      project_id: input.projectId || null,
      session_type: sessionType,
      planned_duration_minutes: plannedDuration,
      actual_duration_minutes: 0,
      interruption_count: 0,
      completed_status: 'completed',
      notes: input.notes?.trim() || null,
      started_at: startedAt,
      ended_at: null,
    };

    return session;
  }

  public async completeFocusSession(
    id: string,
    actualMinutes: number,
    notes?: string | null
  ): Promise<FocusSession> {
    const existing = await this.getFocusSessionById(id);
    if (!existing) {
      throw new Error(`جلسه تمرکز با شناسه ${id} یافت نشد.`);
    }

    const now = getCurrentUtcIsoString();
    const duration = Math.max(0, Math.round(actualMinutes));
    const finalNotes = notes !== undefined ? notes?.trim() || null : existing.notes;

    await db.execute(
      `UPDATE focus_sessions SET
        actual_duration_minutes = ?,
        completed_status = 'completed',
        notes = ?,
        ended_at = ?,
        updated_at = ?,
        version = version + 1
      WHERE id = ?`,
      [duration, finalNotes, now, now, id]
    );

    logger.info(`Completed focus session ${id} (duration=${duration}m)`, 'FocusService');

    return {
      ...existing,
      actual_duration_minutes: duration,
      completed_status: 'completed',
      notes: finalNotes,
      ended_at: now,
      updated_at: now,
      version: existing.version + 1,
    };
  }

  public async abandonFocusSession(
    id: string,
    actualMinutes: number,
    notes?: string | null
  ): Promise<FocusSession> {
    const existing = await this.getFocusSessionById(id);
    if (!existing) {
      throw new Error(`جلسه تمرکز با شناسه ${id} یافت نشد.`);
    }

    const now = getCurrentUtcIsoString();
    const duration = Math.max(0, Math.round(actualMinutes));
    const finalNotes = notes !== undefined ? notes?.trim() || null : existing.notes;

    await db.execute(
      `UPDATE focus_sessions SET
        actual_duration_minutes = ?,
        completed_status = 'abandoned',
        notes = ?,
        ended_at = ?,
        updated_at = ?,
        version = version + 1
      WHERE id = ?`,
      [duration, finalNotes, now, now, id]
    );

    logger.info(`Abandoned focus session ${id} (duration=${duration}m)`, 'FocusService');

    return {
      ...existing,
      actual_duration_minutes: duration,
      completed_status: 'abandoned',
      notes: finalNotes,
      ended_at: now,
      updated_at: now,
      version: existing.version + 1,
    };
  }

  public async logInterruption(sessionId: string): Promise<number> {
    const session = await this.getFocusSessionById(sessionId);
    if (!session) {
      throw new Error(`جلسه تمرکز با شناسه ${sessionId} یافت نشد.`);
    }

    const now = getCurrentUtcIsoString();
    const newCount = session.interruption_count + 1;

    await db.execute(
      `UPDATE focus_sessions SET
        interruption_count = ?,
        updated_at = ?,
        version = version + 1
      WHERE id = ?`,
      [newCount, now, sessionId]
    );

    logger.info(`Logged interruption for session ${sessionId} (total=${newCount})`, 'FocusService');
    return newCount;
  }

  public async getFocusSessions(filter?: FocusSessionFilter): Promise<FocusSession[]> {
    let sql = 'SELECT * FROM focus_sessions WHERE is_deleted = 0';
    const params: unknown[] = [];

    if (filter?.taskId) {
      sql += ' AND task_id = ?';
      params.push(filter.taskId);
    }
    if (filter?.topicId) {
      sql += ' AND topic_id = ?';
      params.push(filter.topicId);
    }
    if (filter?.subjectId) {
      sql += ' AND subject_id = ?';
      params.push(filter.subjectId);
    }
    if (filter?.sessionType) {
      sql += ' AND session_type = ?';
      params.push(filter.sessionType);
    }
    if (filter?.completedStatus) {
      sql += ' AND completed_status = ?';
      params.push(filter.completedStatus);
    }

    sql += ' ORDER BY started_at DESC';

    if (filter?.limit) {
      sql += ` LIMIT ${Math.round(filter.limit)}`;
    }

    const rows = await db.query<FocusSession>(sql, params);

    // Populate entity display names
    for (const s of rows) {
      if (s.task_id) {
        const tasks = await db.query<{ title: string }>(
          'SELECT title FROM tasks WHERE id = ?',
          [s.task_id]
        );
        s.task_title = tasks[0]?.title || null;
      }
      if (s.topic_id) {
        const topics = await db.query<{ title: string }>(
          'SELECT title FROM topics WHERE id = ?',
          [s.topic_id]
        );
        s.topic_title = topics[0]?.title || null;
      }
      if (s.subject_id) {
        const subjs = await db.query<{ name: string }>(
          'SELECT name FROM subjects WHERE id = ?',
          [s.subject_id]
        );
        s.subject_name = subjs[0]?.name || null;
      }
    }

    return rows;
  }

  public async getFocusSessionById(id: string): Promise<FocusSession | null> {
    const rows = await db.query<FocusSession>(
      'SELECT * FROM focus_sessions WHERE id = ? AND is_deleted = 0',
      [id]
    );
    if (rows.length === 0) return null;

    const s = rows[0];
    if (s.task_id) {
      const tasks = await db.query<{ title: string }>(
        'SELECT title FROM tasks WHERE id = ?',
        [s.task_id]
      );
      s.task_title = tasks[0]?.title || null;
    }
    if (s.topic_id) {
      const topics = await db.query<{ title: string }>(
        'SELECT title FROM topics WHERE id = ?',
        [s.topic_id]
      );
      s.topic_title = topics[0]?.title || null;
    }
    if (s.subject_id) {
      const subjs = await db.query<{ name: string }>(
        'SELECT name FROM subjects WHERE id = ?',
        [s.subject_id]
      );
      s.subject_name = subjs[0]?.name || null;
    }

    return s;
  }

  public async getFocusStats(): Promise<FocusStats> {
    const todayStr = new Date().toISOString().split('T')[0];

    const allSessions = await db.query<{
      actual_duration_minutes: number;
      interruption_count: number;
      completed_status: FocusCompletedStatus;
      started_at: string;
    }>(
      'SELECT actual_duration_minutes, interruption_count, completed_status, started_at FROM focus_sessions WHERE is_deleted = 0'
    );

    let todayFocusedMinutes = 0;
    let totalFocusedMinutes = 0;
    let completedSessionsCount = 0;
    let abandonedSessionsCount = 0;
    let totalInterruptionCount = 0;

    for (const s of allSessions) {
      const mins = Number(s.actual_duration_minutes) || 0;
      const interrupts = Number(s.interruption_count) || 0;

      totalFocusedMinutes += mins;
      totalInterruptionCount += interrupts;

      if (s.started_at && s.started_at.startsWith(todayStr)) {
        todayFocusedMinutes += mins;
      }

      if (s.completed_status === 'completed') {
        completedSessionsCount += 1;
      } else if (s.completed_status === 'abandoned') {
        abandonedSessionsCount += 1;
      }
    }

    const totalSessions = completedSessionsCount + abandonedSessionsCount;
    const completionRate =
      totalSessions > 0 ? Math.round((completedSessionsCount / totalSessions) * 100) : 100;
    const averageSessionMinutes =
      completedSessionsCount > 0
        ? Math.round(totalFocusedMinutes / completedSessionsCount)
        : 0;

    return {
      todayFocusedMinutes,
      totalFocusedMinutes,
      completedSessionsCount,
      abandonedSessionsCount,
      totalInterruptionCount,
      completionRate,
      averageSessionMinutes,
    };
  }

  public async deleteFocusSession(id: string): Promise<void> {
    const existing = await this.getFocusSessionById(id);
    if (!existing) return;

    const now = getCurrentUtcIsoString();
    const deviceId = settingsService.getDeviceId();
    const trashId = this.generateId('trash');
    const payload = JSON.stringify(existing);

    await db.execute(
      `UPDATE focus_sessions SET
        is_deleted = 1,
        deleted_at = ?,
        updated_at = ?,
        version = version + 1
      WHERE id = ?`,
      [now, now, id]
    );

    await db.execute(
      `INSERT INTO trash (
        id, entity_type, entity_id, deleted_at, device_id, payload, can_restore
      ) VALUES (?, 'focus_sessions', ?, ?, ?, ?, 1)`,
      [trashId, id, now, deviceId, payload]
    );

    logger.info(`Soft-deleted focus session ${id}`, 'FocusService');
  }
}

export const focusService = new FocusService();
