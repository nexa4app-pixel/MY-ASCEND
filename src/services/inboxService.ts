/**
 * Inbox Service & Triage Engine
 * Manages rapid capture lifecycle, universal metadata, soft delete with trash snapshot,
 * and 1-click promotions into Task, Note, and Journal entities.
 */
import { db } from '../db/client';
import {
  InboxCapture,
  InboxSource,
  InboxStatus,
  Note,
  Task,
  Journal,
} from '../types/database';
import { getCurrentUtcIsoString } from '../lib/date/utc';
import { settingsService } from './settingsService';
import { logger } from './logger';

export interface CreateCaptureInput {
  rawContent: string;
  source?: InboxSource;
  profileId?: string | null;
}

export interface CaptureFilter {
  status?: InboxStatus | 'all';
  source?: InboxSource | 'all';
  search?: string;
}

export interface TriageStats {
  total: number;
  unprocessed: number;
  processed: number;
  archived: number;
  progressPercent: number;
}

class InboxService {
  private generateId(prefix: string): string {
    const rand = Math.random().toString(36).substring(2, 8);
    return `${prefix}_${Date.now()}_${rand}`;
  }

  /**
   * Create a new rapid capture entry with universal metadata and UTC timestamp.
   */
  public async createCapture(input: CreateCaptureInput): Promise<InboxCapture> {
    const trimmed = input.rawContent.trim();
    if (!trimmed) {
      throw new Error('Capture content cannot be empty.');
    }

    const id = this.generateId('cap');
    const now = getCurrentUtcIsoString();
    const deviceId = settingsService.getDeviceId();
    const source: InboxSource = input.source || 'quick_capture';
    const status: InboxStatus = 'unprocessed';
    const profileId = input.profileId || null;

    await db.execute(
      `INSERT INTO inbox_captures (
        id, created_at, updated_at, version, device_id, is_deleted, deleted_at,
        profile_id, raw_content, source, status, processed_at
      ) VALUES (?, ?, ?, 1, ?, 0, NULL, ?, ?, ?, ?, NULL)`,
      [id, now, now, deviceId, profileId, trimmed, source, status]
    );

    logger.info(`Created inbox capture ${id} (${source})`, 'InboxService');

    return {
      id,
      created_at: now,
      updated_at: now,
      version: 1,
      device_id: deviceId,
      is_deleted: 0,
      deleted_at: null,
      profile_id: profileId,
      raw_content: trimmed,
      source,
      status,
      processed_at: null,
    };
  }

  /**
   * Retrieve filtered list of non-deleted captures.
   */
  public async getCaptures(filter?: CaptureFilter): Promise<InboxCapture[]> {
    let sql = 'SELECT * FROM inbox_captures WHERE is_deleted = 0';
    const params: unknown[] = [];

    if (filter?.status && filter.status !== 'all') {
      sql += ' AND status = ?';
      params.push(filter.status);
    }

    if (filter?.source && filter.source !== 'all') {
      sql += ' AND source = ?';
      params.push(filter.source);
    }

    if (filter?.search && filter.search.trim()) {
      sql += ' AND raw_content LIKE ?';
      params.push(`%${filter.search.trim()}%`);
    }

    sql += ' ORDER BY created_at DESC';

    const rows = await db.query<InboxCapture>(sql, params);
    return rows;
  }

  /**
   * Get single capture by ID.
   */
  public async getCaptureById(id: string): Promise<InboxCapture | null> {
    const rows = await db.query<InboxCapture>(
      'SELECT * FROM inbox_captures WHERE id = ? AND is_deleted = 0',
      [id]
    );
    return rows.length > 0 ? rows[0] : null;
  }

  /**
   * Update raw content or status of an existing capture.
   */
  public async updateCapture(
    id: string,
    updates: { raw_content?: string; source?: InboxSource; status?: InboxStatus }
  ): Promise<void> {
    const existing = await this.getCaptureById(id);
    if (!existing) {
      throw new Error(`Inbox capture ${id} not found.`);
    }

    const now = getCurrentUtcIsoString();
    const newContent = updates.raw_content !== undefined ? updates.raw_content.trim() : existing.raw_content;
    const newSource = updates.source !== undefined ? updates.source : existing.source;
    const newStatus = updates.status !== undefined ? updates.status : existing.status;
    const processedAt =
      newStatus === 'processed' ? (existing.processed_at || now) : existing.processed_at;

    await db.execute(
      `UPDATE inbox_captures SET
        raw_content = ?,
        source = ?,
        status = ?,
        processed_at = ?,
        updated_at = ?,
        version = version + 1
      WHERE id = ?`,
      [newContent, newSource, newStatus, processedAt, now, id]
    );

    logger.info(`Updated capture ${id} (status=${newStatus})`, 'InboxService');
  }

  /**
   * Soft-delete capture with full JSON snapshot written into trash table.
   */
  public async deleteCapture(id: string): Promise<void> {
    const existing = await this.getCaptureById(id);
    if (!existing) {
      return;
    }

    const now = getCurrentUtcIsoString();
    const deviceId = settingsService.getDeviceId();
    const trashId = this.generateId('trash');
    const payload = JSON.stringify(existing);

    // 1. Soft-delete the capture
    await db.execute(
      `UPDATE inbox_captures SET
        is_deleted = 1,
        deleted_at = ?,
        updated_at = ?,
        version = version + 1
      WHERE id = ?`,
      [now, now, id]
    );

    // 2. Insert into trash table for audit and restore capability
    await db.execute(
      `INSERT INTO trash (
        id, entity_type, entity_id, deleted_at, device_id, payload, can_restore
      ) VALUES (?, 'inbox_captures', ?, ?, ?, ?, 1)`,
      [trashId, id, now, deviceId, payload]
    );

    logger.info(`Soft-deleted capture ${id} and created trash entry ${trashId}`, 'InboxService');
  }

  /**
   * Batch soft-delete captures.
   */
  public async batchDeleteCaptures(ids: string[]): Promise<void> {
    for (const id of ids) {
      await this.deleteCapture(id);
    }
  }

  /**
   * Batch update status.
   */
  public async batchUpdateStatus(ids: string[], status: InboxStatus): Promise<void> {
    const now = getCurrentUtcIsoString();
    for (const id of ids) {
      const processedAt = status === 'processed' ? now : null;
      await db.execute(
        `UPDATE inbox_captures SET
          status = ?,
          processed_at = ?,
          updated_at = ?,
          version = version + 1
        WHERE id = ?`,
        [status, processedAt, now, id]
      );
    }
    logger.info(`Batch updated ${ids.length} captures to status=${status}`, 'InboxService');
  }

  /**
   * 1-Click Promotion: Convert Capture to Task (Candidate).
   * Status is strictly set to 'inbox' to land in the unplanned task queue for Phase 03.
   */
  public async promoteToTask(
    captureId: string,
    customTitle?: string,
    priority: Task['priority'] = 'medium'
  ): Promise<Task> {
    const capture = await this.getCaptureById(captureId);
    if (!capture) {
      throw new Error(`Capture ${captureId} not found.`);
    }

    const now = getCurrentUtcIsoString();
    const deviceId = settingsService.getDeviceId();
    const taskId = this.generateId('task');

    // Extract title & description
    const lines = capture.raw_content.split('\n');
    const firstLine = lines[0].trim();
    const title = customTitle?.trim() || (firstLine.length > 80 ? `${firstLine.substring(0, 80)}...` : firstLine);
    const description = lines.length > 1 ? lines.slice(1).join('\n').trim() : capture.raw_content;

    // Create Task with status = 'inbox'
    await db.execute(
      `INSERT INTO tasks (
        id, created_at, updated_at, version, device_id, is_deleted, deleted_at,
        project_id, parent_task_id, title, description, due_date, priority, status,
        estimated_minutes, actual_minutes, completed_at
      ) VALUES (?, ?, ?, 1, ?, 0, NULL, NULL, NULL, ?, ?, NULL, ?, 'inbox', NULL, NULL, NULL)`,
      [taskId, now, now, deviceId, title, description, priority]
    );

    // Mark capture as processed
    await db.execute(
      `UPDATE inbox_captures SET
        status = 'processed',
        processed_at = ?,
        updated_at = ?,
        version = version + 1
      WHERE id = ?`,
      [now, now, captureId]
    );

    logger.info(`Promoted capture ${captureId} to task ${taskId} (status=inbox)`, 'InboxService');

    return {
      id: taskId,
      created_at: now,
      updated_at: now,
      version: 1,
      device_id: deviceId,
      is_deleted: 0,
      deleted_at: null,
      project_id: null,
      parent_task_id: null,
      title,
      description,
      due_date: null,
      priority,
      status: 'inbox',
      estimated_minutes: null,
      actual_minutes: null,
      completed_at: null,
    };
  }

  /**
   * 1-Click Promotion: Convert Capture to Quick/Markdown Note.
   */
  public async promoteToNote(
    captureId: string,
    customTitle?: string,
    noteType: 'quick' | 'markdown' = 'quick'
  ): Promise<Note> {
    const capture = await this.getCaptureById(captureId);
    if (!capture) {
      throw new Error(`Capture ${captureId} not found.`);
    }

    const now = getCurrentUtcIsoString();
    const deviceId = settingsService.getDeviceId();
    const noteId = this.generateId('note');

    const lines = capture.raw_content.split('\n');
    const firstLine = lines[0].trim();
    const title = customTitle?.trim() || (firstLine.length > 60 ? `${firstLine.substring(0, 60)}...` : firstLine);
    const content = capture.raw_content;

    await db.execute(
      `INSERT INTO notes (
        id, created_at, updated_at, version, device_id, is_deleted, deleted_at,
        profile_id, title, content, note_type, is_pinned, is_archived
      ) VALUES (?, ?, ?, 1, ?, 0, NULL, ?, ?, ?, ?, 0, 0)`,
      [noteId, now, now, deviceId, capture.profile_id || null, title, content, noteType]
    );

    // Mark capture as processed
    await db.execute(
      `UPDATE inbox_captures SET
        status = 'processed',
        processed_at = ?,
        updated_at = ?,
        version = version + 1
      WHERE id = ?`,
      [now, now, captureId]
    );

    logger.info(`Promoted capture ${captureId} to note ${noteId}`, 'InboxService');

    return {
      id: noteId,
      created_at: now,
      updated_at: now,
      version: 1,
      device_id: deviceId,
      is_deleted: 0,
      deleted_at: null,
      profile_id: capture.profile_id,
      title,
      content,
      note_type: noteType,
      is_pinned: 0,
      is_archived: 0,
    };
  }

  /**
   * 1-Click Promotion: Convert Capture to Journal Entry.
   * Ensures uniqueness of entry_date in YYYY-MM-DD UTC format.
   * If a journal entry already exists for today, appends the capture content.
   */
  public async promoteToJournal(
    captureId: string,
    customTitle?: string,
    mood?: string,
    tags?: string
  ): Promise<Journal> {
    const capture = await this.getCaptureById(captureId);
    if (!capture) {
      throw new Error(`Capture ${captureId} not found.`);
    }

    const now = getCurrentUtcIsoString();
    const entryDate = now.split('T')[0]; // UTC YYYY-MM-DD
    const deviceId = settingsService.getDeviceId();
    const profileId = capture.profile_id || 'default_profile';

    // Check if an entry already exists for this entry_date and profile
    const existing = await db.query<Journal>(
      'SELECT * FROM journals WHERE entry_date = ? AND profile_id = ? AND is_deleted = 0',
      [entryDate, profileId]
    );

    let journalRecord: Journal;

    if (existing.length > 0) {
      const current = existing[0];
      const appendedContent = `${current.content}\n\n---\n${capture.raw_content}`;
      await db.execute(
        `UPDATE journals SET
          content = ?,
          updated_at = ?,
          version = version + 1
        WHERE id = ?`,
        [appendedContent, now, current.id]
      );
      journalRecord = {
        ...current,
        content: appendedContent,
        updated_at: now,
        version: current.version + 1,
      };
      logger.info(`Appended capture ${captureId} to existing journal ${current.id} for ${entryDate}`, 'InboxService');
    } else {
      const journalId = this.generateId('journ');
      const title = customTitle?.trim() || `ژورنال روزانه (${entryDate})`;
      const content = capture.raw_content;

      await db.execute(
        `INSERT INTO journals (
          id, created_at, updated_at, version, device_id, is_deleted, deleted_at,
          profile_id, entry_date, title, content, mood, tags
        ) VALUES (?, ?, ?, 1, ?, 0, NULL, ?, ?, ?, ?, ?, ?)`,
        [journalId, now, now, deviceId, profileId, entryDate, title, content, mood || 'neutral', tags || 'inbox_promoted']
      );

      journalRecord = {
        id: journalId,
        created_at: now,
        updated_at: now,
        version: 1,
        device_id: deviceId,
        is_deleted: 0,
        deleted_at: null,
        profile_id: profileId,
        entry_date: entryDate,
        title,
        content,
        mood: mood || 'neutral',
        tags: tags || 'inbox_promoted',
      };
      logger.info(`Created new journal ${journalId} for ${entryDate} from capture ${captureId}`, 'InboxService');
    }

    // Mark capture as processed
    await db.execute(
      `UPDATE inbox_captures SET
        status = 'processed',
        processed_at = ?,
        updated_at = ?,
        version = version + 1
      WHERE id = ?`,
      [now, now, captureId]
    );

    return journalRecord;
  }

  /**
   * Get triage summary statistics for progress monitoring.
   */
  public async getTriageStats(): Promise<TriageStats> {
    const all = await db.query<{ status: InboxStatus; count: number }>(
      `SELECT status, COUNT(*) as count FROM inbox_captures WHERE is_deleted = 0 GROUP BY status`
    );

    let unprocessed = 0;
    let processed = 0;
    let archived = 0;

    for (const r of all) {
      if (r.status === 'unprocessed') unprocessed = Number(r.count);
      if (r.status === 'processed') processed = Number(r.count);
      if (r.status === 'archived') archived = Number(r.count);
    }

    const total = unprocessed + processed + archived;
    const progressPercent = total === 0 ? 100 : Math.round((processed / total) * 100);

    return {
      total,
      unprocessed,
      processed,
      archived,
      progressPercent,
    };
  }
}

export const inboxService = new InboxService();
