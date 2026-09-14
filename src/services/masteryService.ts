/**
 * Mastery Score & Spaced Repetition (SM-2) Engine Service
 * Implements 5-tier mastery progression, Ebbinghaus retention decay, and SuperMemo-2 scheduling.
 */
import { db } from '../db/client';
import {
  MasteryRecord,
  MasteryTier,
  LearningSession,
} from '../types/database';
import { getCurrentUtcIsoString } from '../lib/date/utc';
import { settingsService } from './settingsService';
import { logger } from './logger';

export interface DueTopicItem {
  masteryRecord: MasteryRecord;
  topicId: string;
  topicTitle: string;
  subjectId: string;
  subjectName: string;
  subjectColor: string;
  importanceLevel: string;
  overdueDays: number;
  retentionPercent: number;
}

export interface MasteryDistributionStats {
  totalAssessed: number;
  unstudiedCount: number;
  noviceCount: number;
  competentCount: number;
  proficientCount: number;
  masteredCount: number;
  averageLevel: number;
  averageRetention: number;
}

class MasteryService {
  private generateId(prefix: string): string {
    const rand = Math.random().toString(36).substring(2, 8);
    return `${prefix}_${Date.now()}_${rand}`;
  }

  /**
   * Maps a numerical mastery score (0 to 100) to one of the 5 tiers.
   */
  public getTierFromLevel(level: number): MasteryTier {
    if (level <= 0) return 'unstudied';
    if (level < 40) return 'novice';
    if (level < 70) return 'competent';
    if (level < 90) return 'proficient';
    return 'mastered';
  }

  /**
   * Calculates Ebbinghaus retention multiplier R(t) = e^(-t / S)
   * where t is days elapsed and S is memory stability.
   */
  public calculateRetentionRate(
    lastAssessedAt: string | null | undefined,
    repetitions: number,
    easeFactor: number,
    nowIso: string = getCurrentUtcIsoString()
  ): number {
    if (!lastAssessedAt) return 1.0;

    const lastTime = new Date(lastAssessedAt).getTime();
    const currentTime = new Date(nowIso).getTime();
    const elapsedMs = Math.max(0, currentTime - lastTime);
    const elapsedDays = elapsedMs / (1000 * 60 * 60 * 24);

    if (elapsedDays <= 0.05) return 1.0;

    // Stability S increases with successful repetitions and ease factor
    const stability = 2.0 + Math.max(0, repetitions) * Math.max(1.3, easeFactor) * 1.5;
    const decayMultiplier = Math.exp(-elapsedDays / stability);

    // Floor at 0.25 so learned knowledge doesn't completely vanish overnight
    return Math.max(0.25, Math.min(1.0, decayMultiplier));
  }

  /**
   * Retrieves or initializes a topic's mastery record.
   */
  public async getOrCreateMasteryRecord(topicId: string): Promise<MasteryRecord> {
    const rows = await db.query<MasteryRecord>(
      'SELECT * FROM mastery_records WHERE topic_id = ? AND is_deleted = 0',
      [topicId]
    );

    if (rows.length > 0) {
      const record = rows[0];
      const retention = this.calculateRetentionRate(
        record.last_assessed_at,
        record.repetitions,
        record.ease_factor
      );
      record.retention_decay_rate = Math.round(retention * 100);

      const todayStr = new Date().toISOString().split('T')[0];
      record.is_due_today =
        !record.next_review_at || record.next_review_at.split('T')[0] <= todayStr;

      return record;
    }

    const id = this.generateId('mast');
    const now = getCurrentUtcIsoString();
    const deviceId = settingsService.getDeviceId();

    await db.execute(
      `INSERT INTO mastery_records (
        id, created_at, updated_at, version, device_id, is_deleted, deleted_at,
        topic_id, level, tier, confidence_score, repetitions, ease_factor,
        interval_days, next_review_at, last_assessed_at
      ) VALUES (?, ?, ?, 1, ?, 0, NULL, ?, 0.0, 'unstudied', 0.0, 0, 2.5, 0, NULL, NULL)`,
      [id, now, now, deviceId, topicId]
    );

    return {
      id,
      created_at: now,
      updated_at: now,
      version: 1,
      device_id: deviceId,
      is_deleted: 0,
      deleted_at: null,
      topic_id: topicId,
      level: 0.0,
      tier: 'unstudied',
      confidence_score: 0.0,
      repetitions: 0,
      ease_factor: 2.5,
      interval_days: 0,
      next_review_at: null,
      last_assessed_at: null,
      retention_decay_rate: 100,
      is_due_today: true,
    };
  }

  /**
   * Evaluates evidence, session history, and retention decay to compute current mastery level.
   */
  public async calculateMastery(topicId: string): Promise<MasteryRecord> {
    const record = await this.getOrCreateMasteryRecord(topicId);

    // Fetch evidence scores
    const evidence = await db.query<{ score: number | null }>(
      'SELECT score FROM learning_evidence WHERE topic_id = ? AND is_deleted = 0 AND score IS NOT NULL',
      [topicId]
    );

    // Fetch session comprehension ratings
    const sessions = await db.query<{ comprehension_rating: number | null }>(
      'SELECT comprehension_rating FROM learning_sessions WHERE topic_id = ? AND is_deleted = 0 AND comprehension_rating IS NOT NULL',
      [topicId]
    );

    let baseScore = 0;
    let weightCount = 0;

    // Comprehension ratings (1 to 5 maps to 20% to 100%)
    if (sessions.length > 0) {
      let ratingSum = 0;
      for (const s of sessions) {
        ratingSum += (Number(s.comprehension_rating) / 5) * 100;
      }
      baseScore += (ratingSum / sessions.length) * 0.6;
      weightCount += 0.6;
    }

    // Evidence scores (0 to 100)
    if (evidence.length > 0) {
      let evSum = 0;
      for (const e of evidence) {
        evSum += Number(e.score);
      }
      baseScore += (evSum / evidence.length) * 0.4;
      weightCount += 0.4;
    }

    // Normalized base score before decay
    const rawMastery = weightCount > 0 ? baseScore / weightCount : 0;

    // Apply Ebbinghaus retention decay
    const retentionRate = this.calculateRetentionRate(
      record.last_assessed_at,
      record.repetitions,
      record.ease_factor
    );
    const effectiveLevel = Math.round(rawMastery * retentionRate * 10) / 10;
    const tier = this.getTierFromLevel(effectiveLevel);
    const confidenceScore = Math.min(1.0, Math.round((record.repetitions * 0.2 + retentionRate * 0.4) * 100) / 100);

    const now = getCurrentUtcIsoString();

    await db.execute(
      `UPDATE mastery_records SET
        level = ?,
        tier = ?,
        confidence_score = ?,
        updated_at = ?,
        version = version + 1
      WHERE id = ?`,
      [effectiveLevel, tier, confidenceScore, now, record.id]
    );

    logger.info(`Recalculated mastery for topic ${topicId}: level=${effectiveLevel}%, tier=${tier}`, 'MasteryService');

    return {
      ...record,
      level: effectiveLevel,
      tier,
      confidence_score: confidenceScore,
      updated_at: now,
      version: record.version + 1,
      retention_decay_rate: Math.round(retentionRate * 100),
    };
  }

  /**
   * SuperMemo-2 (SM-2) Spaced Repetition Scheduling Algorithm
   * Quality rating q ∈ [1, 5]:
   * - 1: Blackout / Failure
   * - 2: Incorrect response
   * - 3: Correct with serious difficulty
   * - 4: Correct with hesitation
   * - 5: Perfect recall
   */
  public async processReviewSM2(topicId: string, qualityRating: number): Promise<MasteryRecord> {
    const q = Math.max(1, Math.min(5, Math.round(qualityRating)));
    const record = await this.getOrCreateMasteryRecord(topicId);

    let reps = record.repetitions;
    let ef = record.ease_factor;
    let interval = record.interval_days;

    if (q < 3) {
      // Failed review: reset repetitions and schedule for tomorrow
      reps = 0;
      interval = 1;
    } else {
      // Successful review: advance repetition counter and intervals
      if (reps === 0) {
        interval = 1;
      } else if (reps === 1) {
        interval = 6;
      } else {
        interval = Math.max(1, Math.round(interval * ef));
      }
      reps += 1;
    }

    // Update Ease Factor: EF' = EF + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
    ef = ef + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02));
    ef = Math.max(1.3, Math.round(ef * 100) / 100);

    // Compute next_review_at
    const now = new Date();
    const nextDate = new Date(now.getTime() + interval * 24 * 60 * 60 * 1000);
    const nextReviewAt = nextDate.toISOString();
    const nowUtc = getCurrentUtcIsoString();

    await db.execute(
      `UPDATE mastery_records SET
        repetitions = ?,
        ease_factor = ?,
        interval_days = ?,
        next_review_at = ?,
        last_assessed_at = ?,
        updated_at = ?,
        version = version + 1
      WHERE id = ?`,
      [reps, ef, interval, nextReviewAt, nowUtc, nowUtc, record.id]
    );

    logger.info(
      `Processed SM-2 for topic ${topicId}: q=${q}, reps=${reps}, ef=${ef}, interval=${interval}d, next=${nextReviewAt.split('T')[0]}`,
      'MasteryService'
    );

    // Recalculate mastery level with fresh assessment timestamp
    return await this.calculateMastery(topicId);
  }

  /**
   * Invoked automatically when a learning session completes for a topic.
   */
  public async processSessionCompleted(session: LearningSession): Promise<void> {
    if (!session.topic_id) return;

    if (session.comprehension_rating) {
      await this.processReviewSM2(session.topic_id, session.comprehension_rating);
    } else {
      await this.calculateMastery(session.topic_id);
    }
  }

  /**
   * Retrieves all topics due for review today or overdue, sorted by priority.
   */
  public async getDueForReviewToday(): Promise<DueTopicItem[]> {
    const todayStr = new Date().toISOString().split('T')[0];

    const rows = await db.query<{
      mastery_id: string;
      topic_id: string;
      topic_title: string;
      subject_id: string;
      subject_name: string;
      subject_color: string;
      importance_level: string;
      level: number;
      tier: MasteryTier;
      confidence_score: number;
      repetitions: number;
      ease_factor: number;
      interval_days: number;
      next_review_at: string | null;
      last_assessed_at: string | null;
      created_at: string;
      updated_at: string;
      version: number;
      device_id: string;
    }>(
      `SELECT
        m.id as mastery_id,
        m.topic_id,
        t.title as topic_title,
        s.id as subject_id,
        s.name as subject_name,
        s.color as subject_color,
        t.importance_level,
        m.level,
        m.tier,
        m.confidence_score,
        m.repetitions,
        m.ease_factor,
        m.interval_days,
        m.next_review_at,
        m.last_assessed_at,
        m.created_at,
        m.updated_at,
        m.version,
        m.device_id
      FROM mastery_records m
      INNER JOIN topics t ON m.topic_id = t.id AND t.is_deleted = 0
      INNER JOIN subjects s ON t.subject_id = s.id AND s.is_deleted = 0
      WHERE m.is_deleted = 0
        AND (m.next_review_at IS NULL OR substr(m.next_review_at, 1, 10) <= ?)`
      , [todayStr]
    );

    const nowTime = Date.now();
    const dueItems: DueTopicItem[] = [];

    for (const r of rows) {
      let overdueDays = 0;
      if (r.next_review_at) {
        const reviewTime = new Date(r.next_review_at).getTime();
        overdueDays = Math.max(0, Math.floor((nowTime - reviewTime) / (1000 * 60 * 60 * 24)));
      }

      const retention = this.calculateRetentionRate(
        r.last_assessed_at,
        r.repetitions,
        r.ease_factor
      );

      dueItems.push({
        topicId: r.topic_id,
        topicTitle: r.topic_title,
        subjectId: r.subject_id,
        subjectName: r.subject_name || 'عمومی',
        subjectColor: r.subject_color || '#0078d4',
        importanceLevel: r.importance_level || 'medium',
        overdueDays,
        retentionPercent: Math.round(retention * 100),
        masteryRecord: {
          id: r.mastery_id,
          created_at: r.created_at,
          updated_at: r.updated_at,
          version: r.version,
          device_id: r.device_id,
          is_deleted: 0,
          deleted_at: null,
          topic_id: r.topic_id,
          level: Number(r.level),
          tier: r.tier,
          confidence_score: Number(r.confidence_score),
          repetitions: Number(r.repetitions),
          ease_factor: Number(r.ease_factor),
          interval_days: Number(r.interval_days),
          next_review_at: r.next_review_at,
          last_assessed_at: r.last_assessed_at,
          retention_decay_rate: Math.round(retention * 100),
          is_due_today: true,
        },
      });
    }

    // Sort by overdue days descending, then importance
    const importanceWeight: Record<string, number> = {
      critical: 4,
      high: 3,
      medium: 2,
      low: 1,
    };

    dueItems.sort((a, b) => {
      if (b.overdueDays !== a.overdueDays) return b.overdueDays - a.overdueDays;
      const wA = importanceWeight[a.importanceLevel] || 0;
      const wB = importanceWeight[b.importanceLevel] || 0;
      return wB - wA;
    });

    return dueItems;
  }

  /**
   * Overview statistics of mastery distribution across 5 tiers.
   */
  public async getMasteryStats(): Promise<MasteryDistributionStats> {
    const rows = await db.query<{
      tier: MasteryTier;
      level: number;
      last_assessed_at: string | null;
      repetitions: number;
      ease_factor: number;
      count: number;
    }>(
      `SELECT tier, level, last_assessed_at, repetitions, ease_factor, COUNT(*) as count
       FROM mastery_records
       WHERE is_deleted = 0
       GROUP BY tier, level, last_assessed_at, repetitions, ease_factor`
    );

    let totalAssessed = 0;
    let unstudiedCount = 0;
    let noviceCount = 0;
    let competentCount = 0;
    let proficientCount = 0;
    let masteredCount = 0;
    let levelSum = 0;
    let retentionSum = 0;

    for (const r of rows) {
      const c = Number(r.count);
      totalAssessed += c;
      const l = Number(r.level);
      levelSum += l * c;

      const ret = this.calculateRetentionRate(r.last_assessed_at, r.repetitions, r.ease_factor);
      retentionSum += ret * c;

      switch (r.tier) {
        case 'unstudied':
          unstudiedCount += c;
          break;
        case 'novice':
          noviceCount += c;
          break;
        case 'competent':
          competentCount += c;
          break;
        case 'proficient':
          proficientCount += c;
          break;
        case 'mastered':
          masteredCount += c;
          break;
      }
    }

    return {
      totalAssessed,
      unstudiedCount,
      noviceCount,
      competentCount,
      proficientCount,
      masteredCount,
      averageLevel: totalAssessed > 0 ? Math.round((levelSum / totalAssessed) * 10) / 10 : 0,
      averageRetention: totalAssessed > 0 ? Math.round((retentionSum / totalAssessed) * 100) : 100,
    };
  }
  public async getAllMasteryRecords(): Promise<MasteryRecord[]> {
    const rows = await db.query<MasteryRecord>(
      'SELECT * FROM mastery_records WHERE is_deleted = 0 ORDER BY updated_at DESC'
    );
    return rows;
  }
}

export const masteryService = new MasteryService();
