/**
 * Schedule & Time-Blocking Service — MY ASCEND
 * Manages calendar time-blocks, tasks/topics scheduling, and Day/Week view queries.
 */
import { db } from '../db/client';
import {
  Schedule,
  ScheduleEntityType,
  ScheduleStatus,
} from '../types/database';
import { getCurrentUtcIsoString } from '../lib/date/utc';
import { settingsService } from './settingsService';
import { logger } from './logger';

export interface CreateScheduleInput {
  title: string;
  entityType?: ScheduleEntityType;
  entityId?: string | null;
  startTime: string; // UTC ISO-8601
  endTime: string; // UTC ISO-8601
  isAllDay?: boolean;
  colorTag?: string | null;
  status?: ScheduleStatus;
  profileId?: string;
}

export interface UpdateScheduleInput {
  title?: string;
  entityType?: ScheduleEntityType;
  entityId?: string | null;
  startTime?: string;
  endTime?: string;
  isAllDay?: boolean;
  colorTag?: string | null;
  status?: ScheduleStatus;
}

export interface ScheduleFilter {
  startDate?: string; // e.g. "2026-09-07T00:00:00.000Z"
  endDate?: string; // e.g. "2026-09-07T23:59:59.999Z"
  entityType?: ScheduleEntityType;
  status?: ScheduleStatus;
  limit?: number;
}

class ScheduleService {
  private generateId(prefix: string): string {
    const rand = Math.random().toString(36).substring(2, 8);
    return `${prefix}_${Date.now()}_${rand}`;
  }

  private async ensureDefaultProfile(): Promise<string> {
    const profiles = await db.query<{ id: string }>('SELECT id FROM profiles LIMIT 1');
    if (profiles.length > 0) {
      return profiles[0].id;
    }

    const defaultId = 'profile_default';
    const now = getCurrentUtcIsoString();
    const deviceId = settingsService.getDeviceId();

    await db.execute(
      `INSERT OR IGNORE INTO profiles (
        id, created_at, updated_at, version, device_id, is_deleted, deleted_at,
        name, persona_type, is_active
      ) VALUES (?, ?, ?, 1, ?, 0, NULL, 'Default User', 'personal', 1)`,
      [defaultId, now, now, deviceId]
    );

    return defaultId;
  }

  public async createSchedule(input: CreateScheduleInput): Promise<Schedule> {
    if (!input.title || !input.title.trim()) {
      throw new Error('عنوان زمان‌بندی نمی‌تواند خالی باشد.');
    }
    if (!input.startTime) {
      throw new Error('زمان شروع الزامی است.');
    }
    if (!input.endTime) {
      throw new Error('زمان پایان الزامی است.');
    }

    const id = this.generateId('sched');
    const now = getCurrentUtcIsoString();
    const deviceId = settingsService.getDeviceId();
    const profileId = input.profileId || (await this.ensureDefaultProfile());
    const entityType: ScheduleEntityType = input.entityType || 'general';
    const status: ScheduleStatus = input.status || 'planned';
    const isAllDay = input.isAllDay ? 1 : 0;
    const title = input.title.trim();

    await db.execute(
      `INSERT INTO schedules (
        id, created_at, updated_at, version, device_id, is_deleted, deleted_at,
        profile_id, title, entity_type, entity_id, start_time, end_time,
        is_all_day, color_tag, status
      ) VALUES (?, ?, ?, 1, ?, 0, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        now,
        now,
        deviceId,
        profileId,
        title,
        entityType,
        input.entityId || null,
        input.startTime,
        input.endTime,
        isAllDay,
        input.colorTag || null,
        status,
      ]
    );

    logger.info(`Created schedule ${id} ("${title}", start=${input.startTime})`, 'ScheduleService');

    const schedule: Schedule = {
      id,
      created_at: now,
      updated_at: now,
      version: 1,
      device_id: deviceId,
      is_deleted: 0,
      deleted_at: null,
      profile_id: profileId,
      title,
      entity_type: entityType,
      entity_id: input.entityId || null,
      start_time: input.startTime,
      end_time: input.endTime,
      is_all_day: isAllDay,
      color_tag: input.colorTag || null,
      status,
    };

    return schedule;
  }

  public async updateSchedule(id: string, input: UpdateScheduleInput): Promise<Schedule> {
    const existing = await this.getScheduleById(id);
    if (!existing) {
      throw new Error(`زمان‌بندی با شناسه ${id} یافت نشد.`);
    }

    const now = getCurrentUtcIsoString();
    const title = input.title !== undefined ? input.title.trim() : existing.title;
    if (!title) {
      throw new Error('عنوان زمان‌بندی نمی‌تواند خالی باشد.');
    }

    const entityType = input.entityType !== undefined ? input.entityType : existing.entity_type;
    const entityId = input.entityId !== undefined ? input.entityId : existing.entity_id;
    const startTime = input.startTime !== undefined ? input.startTime : existing.start_time;
    const endTime = input.endTime !== undefined ? input.endTime : existing.end_time;
    const isAllDay = input.isAllDay !== undefined ? (input.isAllDay ? 1 : 0) : existing.is_all_day;
    const colorTag = input.colorTag !== undefined ? input.colorTag : existing.color_tag;
    const status = input.status !== undefined ? input.status : existing.status;

    await db.execute(
      `UPDATE schedules SET
        title = ?,
        entity_type = ?,
        entity_id = ?,
        start_time = ?,
        end_time = ?,
        is_all_day = ?,
        color_tag = ?,
        status = ?,
        updated_at = ?,
        version = version + 1
      WHERE id = ?`,
      [title, entityType, entityId, startTime, endTime, isAllDay, colorTag, status, now, id]
    );

    logger.info(`Updated schedule ${id}`, 'ScheduleService');

    return {
      ...existing,
      title,
      entity_type: entityType,
      entity_id: entityId,
      start_time: startTime,
      end_time: endTime,
      is_all_day: isAllDay,
      color_tag: colorTag,
      status,
      updated_at: now,
      version: existing.version + 1,
    };
  }

  public async getSchedules(filter?: ScheduleFilter): Promise<Schedule[]> {
    let sql = 'SELECT * FROM schedules WHERE is_deleted = 0';
    const params: unknown[] = [];

    if (filter?.startDate) {
      sql += ' AND end_time >= ?';
      params.push(filter.startDate);
    }
    if (filter?.endDate) {
      sql += ' AND start_time <= ?';
      params.push(filter.endDate);
    }
    if (filter?.entityType) {
      sql += ' AND entity_type = ?';
      params.push(filter.entityType);
    }
    if (filter?.status) {
      sql += ' AND status = ?';
      params.push(filter.status);
    }

    sql += ' ORDER BY start_time ASC';

    if (filter?.limit) {
      sql += ` LIMIT ${Math.round(filter.limit)}`;
    }

    const rows = await db.query<Schedule>(sql, params);

    // Populate entity titles
    for (const s of rows) {
      if (s.entity_id) {
        if (s.entity_type === 'task') {
          const tasks = await db.query<{ title: string }>(
            'SELECT title FROM tasks WHERE id = ?',
            [s.entity_id]
          );
          s.entity_title = tasks[0]?.title || null;
        } else if (s.entity_type === 'topic') {
          const topics = await db.query<{ title: string }>(
            'SELECT title FROM topics WHERE id = ?',
            [s.entity_id]
          );
          s.entity_title = topics[0]?.title || null;
        }
      }
    }

    return rows;
  }

  public async getScheduleById(id: string): Promise<Schedule | null> {
    const rows = await db.query<Schedule>(
      'SELECT * FROM schedules WHERE id = ? AND is_deleted = 0',
      [id]
    );
    if (rows.length === 0) return null;

    const s = rows[0];
    if (s.entity_id) {
      if (s.entity_type === 'task') {
        const tasks = await db.query<{ title: string }>(
          'SELECT title FROM tasks WHERE id = ?',
          [s.entity_id]
        );
        s.entity_title = tasks[0]?.title || null;
      } else if (s.entity_type === 'topic') {
        const topics = await db.query<{ title: string }>(
          'SELECT title FROM topics WHERE id = ?',
          [s.entity_id]
        );
        s.entity_title = topics[0]?.title || null;
      }
    }

    return s;
  }

  public async deleteSchedule(id: string): Promise<void> {
    const existing = await this.getScheduleById(id);
    if (!existing) return;

    const now = getCurrentUtcIsoString();
    const deviceId = settingsService.getDeviceId();
    const trashId = this.generateId('trash');
    const payload = JSON.stringify(existing);

    await db.execute(
      `UPDATE schedules SET
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
      ) VALUES (?, 'schedules', ?, ?, ?, ?, 1)`,
      [trashId, id, now, deviceId, payload]
    );

    logger.info(`Soft-deleted schedule ${id}`, 'ScheduleService');
  }
}

export const scheduleService = new ScheduleService();
