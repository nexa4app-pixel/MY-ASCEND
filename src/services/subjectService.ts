/**
 * Academic Subject Service
 * Handles CRUD and soft-delete for academic subjects/courses linked to institutions.
 */
import { db } from '../db/client';
import { Subject } from '../types/database';
import { getCurrentUtcIsoString } from '../lib/date/utc';
import { settingsService } from './settingsService';
import { logger } from './logger';

export interface CreateSubjectInput {
  institutionId: string;
  name: string;
  code?: string | null;
  credits?: number | null;
  instructor?: string | null;
  color?: string | null;
}

export interface UpdateSubjectInput {
  name?: string;
  code?: string | null;
  credits?: number | null;
  instructor?: string | null;
  color?: string | null;
}

class SubjectService {
  private generateId(prefix: string): string {
    const rand = Math.random().toString(36).substring(2, 8);
    return `${prefix}_${Date.now()}_${rand}`;
  }

  public async createSubject(input: CreateSubjectInput): Promise<Subject> {
    const trimmedName = input.name.trim();
    if (!trimmedName) {
      throw new Error('نام درس نمی‌تواند خالی باشد.');
    }
    if (!input.institutionId) {
      throw new Error('شناسه نهاد آموزشی (institution_id) الزامی است.');
    }

    const id = this.generateId('subj');
    const now = getCurrentUtcIsoString();
    const deviceId = settingsService.getDeviceId();
    const credits = input.credits !== undefined && input.credits !== null ? Number(input.credits) : 3.0;
    const color = input.color || '#0078d4';

    await db.execute(
      `INSERT INTO subjects (
        id, created_at, updated_at, version, device_id, is_deleted, deleted_at,
        institution_id, name, code, credits, instructor, color
      ) VALUES (?, ?, ?, 1, ?, 0, NULL, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        now,
        now,
        deviceId,
        input.institutionId,
        trimmedName,
        input.code || null,
        credits,
        input.instructor || null,
        color,
      ]
    );

    logger.info(`Created subject ${id} ("${trimmedName}")`, 'SubjectService');

    return {
      id,
      created_at: now,
      updated_at: now,
      version: 1,
      device_id: deviceId,
      is_deleted: 0,
      deleted_at: null,
      institution_id: input.institutionId,
      name: trimmedName,
      code: input.code || null,
      credits,
      instructor: input.instructor || null,
      color,
      book_count: 0,
      topic_count: 0,
      completed_topic_count: 0,
    };
  }

  public async getSubjects(institutionId?: string): Promise<Subject[]> {
    let sql = 'SELECT * FROM subjects WHERE is_deleted = 0';
    const params: unknown[] = [];

    if (institutionId) {
      sql += ' AND institution_id = ?';
      params.push(institutionId);
    }
    sql += ' ORDER BY created_at DESC';

    const subjects = await db.query<Subject>(sql, params);

    for (const subj of subjects) {
      const bookCounts = await db.query<{ count: number }>(
        'SELECT COUNT(*) as count FROM books WHERE subject_id = ? AND is_deleted = 0',
        [subj.id]
      );
      subj.book_count = bookCounts.length > 0 ? Number(bookCounts[0].count) : 0;

      const topicCounts = await db.query<{ is_completed: number; count: number }>(
        'SELECT is_completed, COUNT(*) as count FROM topics WHERE subject_id = ? AND is_deleted = 0 GROUP BY is_completed',
        [subj.id]
      );

      let totalTopics = 0;
      let completedTopics = 0;
      for (const t of topicCounts) {
        const c = Number(t.count);
        totalTopics += c;
        if (Number(t.is_completed) === 1) {
          completedTopics += c;
        }
      }
      subj.topic_count = totalTopics;
      subj.completed_topic_count = completedTopics;
    }

    return subjects;
  }

  public async getSubjectById(id: string): Promise<Subject | null> {
    const rows = await db.query<Subject>(
      'SELECT * FROM subjects WHERE id = ? AND is_deleted = 0',
      [id]
    );
    if (rows.length === 0) return null;

    const subj = rows[0];
    const bookCounts = await db.query<{ count: number }>(
      'SELECT COUNT(*) as count FROM books WHERE subject_id = ? AND is_deleted = 0',
      [subj.id]
    );
    subj.book_count = bookCounts.length > 0 ? Number(bookCounts[0].count) : 0;

    const topicCounts = await db.query<{ is_completed: number; count: number }>(
      'SELECT is_completed, COUNT(*) as count FROM topics WHERE subject_id = ? AND is_deleted = 0 GROUP BY is_completed',
      [subj.id]
    );

    let totalTopics = 0;
    let completedTopics = 0;
    for (const t of topicCounts) {
      const c = Number(t.count);
      totalTopics += c;
      if (Number(t.is_completed) === 1) {
        completedTopics += c;
      }
    }
    subj.topic_count = totalTopics;
    subj.completed_topic_count = completedTopics;

    return subj;
  }

  public async updateSubject(id: string, updates: UpdateSubjectInput): Promise<void> {
    const existing = await this.getSubjectById(id);
    if (!existing) {
      throw new Error(`Subject ${id} not found.`);
    }

    const now = getCurrentUtcIsoString();
    const name = updates.name !== undefined ? updates.name.trim() : existing.name;
    if (!name) {
      throw new Error('نام درس نمی‌تواند خالی باشد.');
    }

    const code = updates.code !== undefined ? updates.code : existing.code;
    const credits = updates.credits !== undefined ? updates.credits : existing.credits;
    const instructor = updates.instructor !== undefined ? updates.instructor : existing.instructor;
    const color = updates.color !== undefined ? updates.color : existing.color;

    await db.execute(
      `UPDATE subjects SET
        name = ?,
        code = ?,
        credits = ?,
        instructor = ?,
        color = ?,
        updated_at = ?,
        version = version + 1
      WHERE id = ?`,
      [name, code, credits, instructor, color, now, id]
    );

    logger.info(`Updated subject ${id}`, 'SubjectService');
  }

  public async deleteSubject(id: string): Promise<void> {
    const existing = await this.getSubjectById(id);
    if (!existing) return;

    const now = getCurrentUtcIsoString();
    const deviceId = settingsService.getDeviceId();
    const trashId = this.generateId('trash');
    const payload = JSON.stringify(existing);

    await db.execute(
      `UPDATE subjects SET
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
      ) VALUES (?, 'subjects', ?, ?, ?, ?, 1)`,
      [trashId, id, now, deviceId, payload]
    );

    logger.info(`Soft-deleted subject ${id}`, 'SubjectService');
  }
}

export const subjectService = new SubjectService();
