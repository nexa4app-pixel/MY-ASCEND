/**
 * Phase 05 — Active Learning & Mastery Engine Tests
 * Covers: session logging, evidence, SM-2 scheduling, Ebbinghaus decay, mastery tiers, spaced repetition queue.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { db } from '../src/db/client';
import { learningService } from '../src/services/learningService';
import { masteryService } from '../src/services/masteryService';
import { isValidUtcIso } from '../src/lib/date/utc';

// ─── Shared Test Fixtures ──────────────────────────────────────────────────────

let testTopicId: string;
let testSubjectId: string;
let testBookId: string;

describe('Phase 05: Active Learning & Mastery Engine', () => {
  beforeAll(async () => {
    // Clean all learning-related data before each test suite run
    await db.execute('DELETE FROM mastery_records');
    await db.execute('DELETE FROM learning_evidence');
    await db.execute('DELETE FROM learning_sessions');
    await db.execute("DELETE FROM trash WHERE entity_type IN ('learning_sessions', 'mastery_records')");

    // Create minimal fixture data: institution → subject → book → chapter → topic
    // (Phase 04 tables are already set up in the shared DB)

    // Ensure a profile exists
    const profiles = await db.query<{ id: string }>('SELECT id FROM profiles LIMIT 1');
    const profileId = profiles[0]?.id ?? 'profile_default';

    // Insert a dummy institution if needed
    const insts = await db.query<{ id: string }>("SELECT id FROM institutions LIMIT 1");
    let instId = insts[0]?.id;
    if (!instId) {
      instId = `inst_fixture_${Date.now()}`;
      await db.execute(
        `INSERT INTO institutions (id, created_at, updated_at, version, device_id, is_deleted, deleted_at, name, type, profile_id)
         VALUES (?, datetime('now'), datetime('now'), 1, 'dev', 0, NULL, 'Fixture Inst', 'university', ?)`,
        [instId, profileId]
      );
    }

    // Insert a dummy subject
    testSubjectId = `subj_fixture_${Date.now()}`;
    await db.execute(
      `INSERT INTO subjects (id, created_at, updated_at, version, device_id, is_deleted, deleted_at, name, institution_id)
       VALUES (?, datetime('now'), datetime('now'), 1, 'dev', 0, NULL, 'ریاضی تحلیلی ۱', ?)`,
      [testSubjectId, instId]
    );

    // Insert a dummy book
    testBookId = `book_fixture_${Date.now()}`;
    await db.execute(
      `INSERT INTO books (id, created_at, updated_at, version, device_id, is_deleted, deleted_at, title, subject_id)
       VALUES (?, datetime('now'), datetime('now'), 1, 'dev', 0, NULL, 'اصول حسابان', ?)`,
      [testBookId, testSubjectId]
    );

    // Insert a dummy chapter
    const chapId = `chap_fixture_${Date.now()}`;
    await db.execute(
      `INSERT INTO chapters (id, created_at, updated_at, version, device_id, is_deleted, deleted_at, title, book_id, chapter_number)
       VALUES (?, datetime('now'), datetime('now'), 1, 'dev', 0, NULL, 'فصل اول: مشتق', ?, 1)`,
      [chapId, testBookId]
    );

    // Insert a dummy topic
    testTopicId = `topic_fixture_${Date.now()}`;
    await db.execute(
      `INSERT INTO topics (id, created_at, updated_at, version, device_id, is_deleted, deleted_at, title, chapter_id, subject_id, importance_level, is_completed)
       VALUES (?, datetime('now'), datetime('now'), 1, 'dev', 0, NULL, 'تعریف مشتق', ?, ?, 'high', 0)`,
      [testTopicId, chapId, testSubjectId]
    );
  });

  // ─── 1. Session Logging ─────────────────────────────────────────────────────

  describe('Session Logging', () => {
    it('should log a study session with all required fields', async () => {
      const session = await learningService.logSession({
        topicId: testTopicId,
        subjectId: testSubjectId,
        activityType: 'study',
        durationMinutes: 45,
        comprehensionRating: 4,
        summary: 'مرور تعریف مشتق از اول اصول',
      });

      expect(session.id).toMatch(/^lsess_\d+_[a-z0-9]{6}$/);
      expect(session.activity_type).toBe('study');
      expect(session.topic_id).toBe(testTopicId);
      expect(session.subject_id).toBe(testSubjectId);
      expect(session.duration_minutes).toBe(45);
      expect(session.comprehension_rating).toBe(4);
      expect(session.summary).toBe('مرور تعریف مشتق از اول اصول');
      expect(session.is_deleted).toBe(0);
      expect(session.deleted_at).toBeNull();
      expect(session.version).toBe(1);
      expect(isValidUtcIso(session.created_at)).toBe(true);
      expect(isValidUtcIso(session.started_at)).toBe(true);
    });

    it('should log a review session without topic_id (subject-level)', async () => {
      const session = await learningService.logSession({
        subjectId: testSubjectId,
        activityType: 'review',
        durationMinutes: 20,
        comprehensionRating: 3,
      });

      expect(session.id).toMatch(/^lsess_\d+_[a-z0-9]{6}$/);
      expect(session.activity_type).toBe('review');
      expect(session.topic_id).toBeNull();
      expect(session.subject_id).toBe(testSubjectId);
      expect(session.duration_minutes).toBe(20);
    });

    it('should clamp comprehension_rating to [1, 5]', async () => {
      const s1 = await learningService.logSession({ comprehensionRating: 0 });
      expect(s1.comprehension_rating).toBe(1);

      const s2 = await learningService.logSession({ comprehensionRating: 99 });
      expect(s2.comprehension_rating).toBe(5);
    });

    it('should store null comprehension_rating when not provided', async () => {
      const session = await learningService.logSession({ activityType: 'study', durationMinutes: 10 });
      expect(session.comprehension_rating).toBeNull();
    });

    it('should retrieve recent sessions via getRecentSessions', async () => {
      const sessions = await learningService.getRecentSessions(10);
      expect(sessions.length).toBeGreaterThan(0);
      // Most recent first
      if (sessions.length > 1) {
        expect(sessions[0].started_at >= sessions[1].started_at).toBe(true);
      }
    });

    it('should filter sessions by topic', async () => {
      const sessions = await learningService.getSessions({ topicId: testTopicId });
      expect(sessions.every((s) => s.topic_id === testTopicId)).toBe(true);
    });

    it('should soft-delete a session (is_deleted=1, moves to trash)', async () => {
      const session = await learningService.logSession({
        activityType: 'practice',
        durationMinutes: 15,
      });

      await learningService.deleteSession(session.id);

      const remaining = await learningService.getSessions();
      expect(remaining.find((s) => s.id === session.id)).toBeUndefined();

      const trash = await db.query<{ id: string; entity_id: string }>(
        "SELECT id, entity_id FROM trash WHERE entity_type = 'learning_sessions' AND entity_id = ?",
        [session.id]
      );
      expect(trash.length).toBe(1);
    });
  });

  // ─── 2. Learning Evidence ───────────────────────────────────────────────────

  describe('Learning Evidence', () => {
    it('should add evidence linked to a topic', async () => {
      const evidence = await learningService.addEvidence({
        topicId: testTopicId,
        evidenceType: 'quiz_score',
        score: 85,
        description: 'آزمون پایان فصل ۱',
      });

      expect(evidence.id).toMatch(/^levid_\d+_[a-z0-9]{6}$/);
      expect(evidence.topic_id).toBe(testTopicId);
      expect(evidence.evidence_type).toBe('quiz_score');
      expect(evidence.score).toBe(85);
      expect(evidence.is_deleted).toBe(0);
    });

    it('should clamp evidence score to [0, 100]', async () => {
      const e1 = await learningService.addEvidence({ topicId: testTopicId, score: -5 });
      expect(e1.score).toBe(0);

      const e2 = await learningService.addEvidence({ topicId: testTopicId, score: 150 });
      expect(e2.score).toBe(100);
    });

    it('should retrieve evidence by topicId', async () => {
      const evidence = await learningService.getEvidence({ topicId: testTopicId });
      expect(evidence.length).toBeGreaterThan(0);
      expect(evidence.every((e) => e.topic_id === testTopicId)).toBe(true);
    });
  });

  // ─── 3. Mastery Record CRUD & Tier Calculation ─────────────────────────────

  describe('Mastery Tier Calculation', () => {
    it('should initialize a mastery record as unstudied', async () => {
      const newTopicId = `topic_new_${Date.now()}`;
      // Create a minimal topic row
      const chapRows = await db.query<{ id: string }>('SELECT id FROM chapters LIMIT 1');
      const chapId = chapRows[0]?.id ?? 'chap_stub';
      await db.execute(
        `INSERT INTO topics (id, created_at, updated_at, version, device_id, is_deleted, deleted_at, title, chapter_id, subject_id, importance_level, is_completed)
         VALUES (?, datetime('now'), datetime('now'), 1, 'dev', 0, NULL, 'مبحث جدید', ?, ?, 'medium', 0)`,
        [newTopicId, chapId, testSubjectId]
      );

      const record = await masteryService.getOrCreateMasteryRecord(newTopicId);
      expect(record.tier).toBe('unstudied');
      expect(record.level).toBe(0.0);
      expect(record.repetitions).toBe(0);
      expect(record.ease_factor).toBe(2.5);
    });

    it('should map level 0 to unstudied tier', () => {
      expect(masteryService.getTierFromLevel(0)).toBe('unstudied');
    });

    it('should map level 1–39 to novice tier', () => {
      expect(masteryService.getTierFromLevel(1)).toBe('novice');
      expect(masteryService.getTierFromLevel(39)).toBe('novice');
    });

    it('should map level 40–69 to competent tier', () => {
      expect(masteryService.getTierFromLevel(40)).toBe('competent');
      expect(masteryService.getTierFromLevel(69)).toBe('competent');
    });

    it('should map level 70–89 to proficient tier', () => {
      expect(masteryService.getTierFromLevel(70)).toBe('proficient');
      expect(masteryService.getTierFromLevel(89)).toBe('proficient');
    });

    it('should map level 90–100 to mastered tier', () => {
      expect(masteryService.getTierFromLevel(90)).toBe('mastered');
      expect(masteryService.getTierFromLevel(100)).toBe('mastered');
    });
  });

  // ─── 4. SM-2 Algorithm ──────────────────────────────────────────────────────

  describe('SM-2 Spaced Repetition Algorithm', () => {
    it('should schedule next review after first successful recall (q=4)', async () => {
      // Clean slate for this topic's mastery
      await db.execute('DELETE FROM mastery_records WHERE topic_id = ?', [testTopicId]);

      const record = await masteryService.processReviewSM2(testTopicId, 4);
      // First successful review: reps goes to 1, interval = 1 day
      expect(record.repetitions).toBe(1);
      expect(record.interval_days).toBe(1);
      expect(record.next_review_at).not.toBeNull();
      expect(record.ease_factor).toBeGreaterThan(1.3);
    });

    it('should set interval to 6 days on second successful review (q=4)', async () => {
      const record = await masteryService.processReviewSM2(testTopicId, 4);
      // Second successful review
      expect(record.repetitions).toBe(2);
      expect(record.interval_days).toBe(6);
    });

    it('should apply ease factor multiplier on third review', async () => {
      const before = await masteryService.getOrCreateMasteryRecord(testTopicId);
      const ef = before.ease_factor;
      const prevInterval = before.interval_days;

      const record = await masteryService.processReviewSM2(testTopicId, 5);
      // Third review: interval = round(prevInterval * ef)
      expect(record.interval_days).toBe(Math.max(1, Math.round(prevInterval * ef)));
      expect(record.repetitions).toBe(3);
    });

    it('should reset repetitions to 0 on failed recall (q=1)', async () => {
      const record = await masteryService.processReviewSM2(testTopicId, 1);
      expect(record.repetitions).toBe(0);
      expect(record.interval_days).toBe(1);
    });

    it('should reset repetitions on q=2 (near blackout)', async () => {
      // Start from 0 after the previous test
      const record = await masteryService.processReviewSM2(testTopicId, 2);
      expect(record.repetitions).toBe(0);
    });

    it('should clamp ease factor to minimum 1.3', async () => {
      // Repeated failures should drive EF toward 1.3 floor
      for (let i = 0; i < 5; i++) {
        await masteryService.processReviewSM2(testTopicId, 1);
      }
      const record = await masteryService.getOrCreateMasteryRecord(testTopicId);
      expect(record.ease_factor).toBeGreaterThanOrEqual(1.3);
    });

    it('should update next_review_at as a valid future ISO date', async () => {
      const record = await masteryService.processReviewSM2(testTopicId, 5);
      expect(record.next_review_at).not.toBeNull();
      const reviewDate = new Date(record.next_review_at!);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      expect(reviewDate.getTime()).toBeGreaterThanOrEqual(today.getTime());
    });
  });

  // ─── 5. Ebbinghaus Retention Decay ──────────────────────────────────────────

  describe('Ebbinghaus Retention Decay', () => {
    it('should return 1.0 retention for no previous assessment', () => {
      const retention = masteryService.calculateRetentionRate(null, 0, 2.5);
      expect(retention).toBe(1.0);
    });

    it('should return 1.0 retention for a session logged just now', () => {
      const nowIso = new Date().toISOString();
      const retention = masteryService.calculateRetentionRate(nowIso, 0, 2.5);
      expect(retention).toBe(1.0);
    });

    it('should return less retention for older assessments', () => {
      const old = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(); // 30 days ago
      const recent = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(); // 1 day ago

      const retentionOld = masteryService.calculateRetentionRate(old, 0, 2.5);
      const retentionRecent = masteryService.calculateRetentionRate(recent, 0, 2.5);

      expect(retentionOld).toBeLessThan(retentionRecent);
    });

    it('should floor retention at 0.25 (knowledge never fully disappears)', () => {
      const veryOld = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString(); // 1 year ago
      const retention = masteryService.calculateRetentionRate(veryOld, 0, 1.3);
      expect(retention).toBeGreaterThanOrEqual(0.25);
    });

    it('should have higher retention with more repetitions (stable memory)', () => {
      const assessedAt = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(); // 1 week ago
      const retentionLowReps = masteryService.calculateRetentionRate(assessedAt, 0, 2.5);
      const retentionHighReps = masteryService.calculateRetentionRate(assessedAt, 10, 2.5);
      expect(retentionHighReps).toBeGreaterThan(retentionLowReps);
    });
  });

  // ─── 6. Full Mastery Calculation Pipeline ──────────────────────────────────

  describe('Full Mastery Calculation', () => {
    it('should increase mastery level after logging a high-rating session', async () => {
      // Clean slate
      await db.execute('DELETE FROM mastery_records WHERE topic_id = ?', [testTopicId]);
      await db.execute('DELETE FROM learning_sessions WHERE topic_id = ?', [testTopicId]);
      await db.execute('DELETE FROM learning_evidence WHERE topic_id = ?', [testTopicId]);

      // Log a high-comprehension session
      await learningService.logSession({
        topicId: testTopicId,
        activityType: 'review',
        comprehensionRating: 5,
        durationMinutes: 30,
      });

      const record = await masteryService.calculateMastery(testTopicId);
      expect(record.level).toBeGreaterThan(0);
      expect(record.tier).not.toBe('unstudied');
    });

    it('should return all mastery records via getAllMasteryRecords', async () => {
      const records = await masteryService.getAllMasteryRecords();
      expect(Array.isArray(records)).toBe(true);
      expect(records.some((r) => r.topic_id === testTopicId)).toBe(true);
    });

    it('should compute mastery stats with correct tier counts', async () => {
      const stats = await masteryService.getMasteryStats();
      expect(typeof stats.totalAssessed).toBe('number');
      expect(stats.totalAssessed).toBeGreaterThan(0);
      const tierSum =
        stats.unstudiedCount +
        stats.noviceCount +
        stats.competentCount +
        stats.proficientCount +
        stats.masteredCount;
      expect(tierSum).toBe(stats.totalAssessed);
    });
  });

  // ─── 7. Spaced Repetition Queue ─────────────────────────────────────────────

  describe('Spaced Repetition Queue', () => {
    it('should include topics with NULL next_review_at as due today', async () => {
      // Create a mastery record with no next_review_at to simulate "never reviewed"
      const newTopicId = `topic_due_${Date.now()}`;
      const chapRows = await db.query<{ id: string }>('SELECT id FROM chapters LIMIT 1');
      const chapId = chapRows[0]?.id ?? 'chap_stub';
      await db.execute(
        `INSERT INTO topics (id, created_at, updated_at, version, device_id, is_deleted, deleted_at, title, chapter_id, subject_id, importance_level, is_completed)
         VALUES (?, datetime('now'), datetime('now'), 1, 'dev', 0, NULL, 'مبحث صف مرور', ?, ?, 'critical', 0)`,
        [newTopicId, chapId, testSubjectId]
      );

      // Create mastery record with no next_review_at
      const masteryId = `mast_due_${Date.now()}`;
      const now = new Date().toISOString();
      await db.execute(
        `INSERT INTO mastery_records (id, created_at, updated_at, version, device_id, is_deleted, deleted_at,
          topic_id, level, tier, confidence_score, repetitions, ease_factor, interval_days, next_review_at, last_assessed_at)
         VALUES (?, ?, ?, 1, 'dev', 0, NULL, ?, 30.0, 'novice', 0.4, 2, 2.5, 3, NULL, ?)`,
        [masteryId, now, now, newTopicId, new Date(Date.now() - 3 * 86400000).toISOString()]
      );

      const queue = await masteryService.getDueForReviewToday();
      expect(queue.some((item) => item.topicId === newTopicId)).toBe(true);
    });

    it('should sort queue by overdue days descending', async () => {
      const queue = await masteryService.getDueForReviewToday();
      if (queue.length > 1) {
        for (let i = 0; i < queue.length - 1; i++) {
          expect(queue[i].overdueDays).toBeGreaterThanOrEqual(queue[i + 1].overdueDays);
        }
      }
    });

    it('should include retention percent in each queue item', async () => {
      const queue = await masteryService.getDueForReviewToday();
      for (const item of queue) {
        expect(item.retentionPercent).toBeGreaterThanOrEqual(0);
        expect(item.retentionPercent).toBeLessThanOrEqual(100);
      }
    });

    it('should remove topic from queue after a successful SM-2 review', async () => {
      const queue = await masteryService.getDueForReviewToday();
      if (queue.length === 0) return; // No items due, skip

      const topicId = queue[0].topicId;
      await masteryService.processReviewSM2(topicId, 5); // Perfect recall

      const queueAfter = await masteryService.getDueForReviewToday();
      // The topic should no longer be due today (next_review_at set to future)
      expect(queueAfter.find((item) => item.topicId === topicId)).toBeUndefined();
    });
  });

  // ─── 8. processSessionCompleted Auto-trigger ────────────────────────────────

  describe('Auto-trigger Mastery on Session Complete', () => {
    it('should auto-update mastery after logSession with comprehension_rating', async () => {
      // Clean mastery for topic
      await db.execute('DELETE FROM mastery_records WHERE topic_id = ?', [testTopicId]);

      await learningService.logSession({
        topicId: testTopicId,
        activityType: 'study',
        comprehensionRating: 5,
        durationMinutes: 25,
      });

      const records = await db.query<{ topic_id: string; tier: string }>(
        'SELECT topic_id, tier FROM mastery_records WHERE topic_id = ? AND is_deleted = 0',
        [testTopicId]
      );
      expect(records.length).toBe(1);
      expect(records[0].tier).not.toBe('unstudied');
    });
  });
});
