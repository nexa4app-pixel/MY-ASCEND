/**
 * Learning Sessions & Evidence Engine Service
 * Manages tracking of deep study, practice, active review, and Feynman teaching sessions.
 */
import { db } from '../db/client';
import {
  LearningSession,
  LearningEvidence,
  LearningActivityType,
  EvidenceType,
} from '../types/database';
import { getCurrentUtcIsoString } from '../lib/date/utc';
import { settingsService } from './settingsService';
import { logger } from './logger';
import { masteryService } from './masteryService';

export interface LogSessionInput {
  topicId?: string | null;
  subjectId?: string | null;
  activityType?: LearningActivityType;
  startedAt?: string;
  endedAt?: string | null;
  durationMinutes?: number | null;
  comprehensionRating?: number | null; // 1 to 5
  summary?: string | null;
}

export interface AddEvidenceInput {
  learningSessionId?: string | null;
  topicId?: string | null;
  evidenceType?: EvidenceType;
  description?: string | null;
  score?: number | null;
}

export interface SessionFilter {
  topicId?: string | null;
  subjectId?: string | null;
  activityType?: LearningActivityType;
  limit?: number;
}

class LearningService {
  private generateId(prefix: string): string {
    const rand = Math.random().toString(36).substring(2, 8);
    return `${prefix}_${Date.now()}_${rand}`;
  }

  public async logSession(input: LogSessionInput): Promise<LearningSession> {
    const id = this.generateId('lsess');
    const now = getCurrentUtcIsoString();
    const deviceId = settingsService.getDeviceId();
    const activityType: LearningActivityType = input.activityType || 'study';
    const startedAt = input.startedAt || now;
    const durationMinutes =
      input.durationMinutes !== undefined && input.durationMinutes !== null
        ? Math.max(0, Math.round(input.durationMinutes))
        : null;

    let comprehensionRating = input.comprehensionRating;
    if (comprehensionRating !== undefined && comprehensionRating !== null) {
      comprehensionRating = Math.max(1, Math.min(5, Math.round(comprehensionRating)));
    } else {
      comprehensionRating = null;
    }

    await db.execute(
      `INSERT INTO learning_sessions (
        id, created_at, updated_at, version, device_id, is_deleted, deleted_at,
        topic_id, subject_id, activity_type, started_at, ended_at, duration_minutes,
        comprehension_rating, summary
      ) VALUES (?, ?, ?, 1, ?, 0, NULL, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        now,
        now,
        deviceId,
        input.topicId || null,
        input.subjectId || null,
        activityType,
        startedAt,
        input.endedAt || null,
        durationMinutes,
        comprehensionRating,
        input.summary?.trim() || null,
      ]
    );

    logger.info(`Logged learning session ${id} (activity=${activityType}, duration=${durationMinutes}m)`, 'LearningService');

    const session: LearningSession = {
      id,
      created_at: now,
      updated_at: now,
      version: 1,
      device_id: deviceId,
      is_deleted: 0,
      deleted_at: null,
      topic_id: input.topicId || null,
      subject_id: input.subjectId || null,
      activity_type: activityType,
      started_at: startedAt,
      ended_at: input.endedAt || null,
      duration_minutes: durationMinutes,
      comprehension_rating: comprehensionRating,
      summary: input.summary?.trim() || null,
    };

    // If linked to a topic, automatically update mastery and spaced repetition scheduling
    if (input.topicId) {
      try {
        await masteryService.processSessionCompleted(session);
      } catch (err) {
        logger.error(`Failed to update mastery for topic ${input.topicId}: ${err}`, 'LearningService');
      }
    }

    return session;
  }

  public async getSessions(filter?: SessionFilter): Promise<LearningSession[]> {
    let sql = 'SELECT * FROM learning_sessions WHERE is_deleted = 0';
    const params: unknown[] = [];

    if (filter?.topicId) {
      sql += ' AND topic_id = ?';
      params.push(filter.topicId);
    }
    if (filter?.subjectId) {
      sql += ' AND subject_id = ?';
      params.push(filter.subjectId);
    }
    if (filter?.activityType) {
      sql += ' AND activity_type = ?';
      params.push(filter.activityType);
    }

    sql += ' ORDER BY started_at DESC';

    if (filter?.limit) {
      sql += ` LIMIT ${Math.round(filter.limit)}`;
    }

    const sessions = await db.query<LearningSession>(sql, params);

    // Populate topic and subject names
    for (const s of sessions) {
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

    return sessions;
  }

  public async getSessionById(id: string): Promise<LearningSession | null> {
    const rows = await db.query<LearningSession>(
      'SELECT * FROM learning_sessions WHERE id = ? AND is_deleted = 0',
      [id]
    );
    if (rows.length === 0) return null;

    const s = rows[0];
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

  public async deleteSession(id: string): Promise<void> {
    const existing = await this.getSessionById(id);
    if (!existing) return;

    const now = getCurrentUtcIsoString();
    const deviceId = settingsService.getDeviceId();
    const trashId = this.generateId('trash');
    const payload = JSON.stringify(existing);

    await db.execute(
      `UPDATE learning_sessions SET
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
      ) VALUES (?, 'learning_sessions', ?, ?, ?, ?, 1)`,
      [trashId, id, now, deviceId, payload]
    );

    logger.info(`Soft-deleted learning session ${id}`, 'LearningService');
  }

  // ─── Evidence Methods ──────────────────────────────────────────────────────

  public async addEvidence(input: AddEvidenceInput): Promise<LearningEvidence> {
    const id = this.generateId('levid');
    const now = getCurrentUtcIsoString();
    const deviceId = settingsService.getDeviceId();
    const evidenceType: EvidenceType = input.evidenceType || 'problem_solved';

    let score = input.score;
    if (score !== undefined && score !== null) {
      score = Math.max(0, Math.min(100, Number(score)));
    } else {
      score = null;
    }

    await db.execute(
      `INSERT INTO learning_evidence (
        id, created_at, updated_at, version, device_id, is_deleted, deleted_at,
        learning_session_id, topic_id, evidence_type, description, score
      ) VALUES (?, ?, ?, 1, ?, 0, NULL, ?, ?, ?, ?, ?)`,
      [
        id,
        now,
        now,
        deviceId,
        input.learningSessionId || null,
        input.topicId || null,
        evidenceType,
        input.description?.trim() || null,
        score,
      ]
    );

    logger.info(`Added learning evidence ${id} (type=${evidenceType}, score=${score})`, 'LearningService');

    const evidence: LearningEvidence = {
      id,
      created_at: now,
      updated_at: now,
      version: 1,
      device_id: deviceId,
      is_deleted: 0,
      deleted_at: null,
      learning_session_id: input.learningSessionId || null,
      topic_id: input.topicId || null,
      evidence_type: evidenceType,
      description: input.description?.trim() || null,
      score,
    };

    if (input.topicId) {
      try {
        await masteryService.calculateMastery(input.topicId);
      } catch (err) {
        logger.error(`Failed to update mastery on evidence add: ${err}`, 'LearningService');
      }
    }

    return evidence;
  }

  public async getRecentSessions(limit: number = 20): Promise<LearningSession[]> {
    return this.getSessions({ limit });
  }

  public async getEvidence(filter: { topicId?: string; sessionId?: string }): Promise<LearningEvidence[]> {
    let sql = 'SELECT * FROM learning_evidence WHERE is_deleted = 0';
    const params: unknown[] = [];

    if (filter.topicId) {
      sql += ' AND topic_id = ?';
      params.push(filter.topicId);
    }
    if (filter.sessionId) {
      sql += ' AND learning_session_id = ?';
      params.push(filter.sessionId);
    }

    sql += ' ORDER BY created_at DESC';
    return await db.query<LearningEvidence>(sql, params);
  }
}

export const learningService = new LearningService();
