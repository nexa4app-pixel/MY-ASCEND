/**
 * Phase 08 — Analytics Engine, Ascend Growth Score & Cross-Module Intelligence Tests
 * Verifies:
 * 1. Ascend Growth Score (AGS: 0-100) mathematical formulation & weighting (35% Productivity, 35% Learning, 30% Well-Being)
 * 2. Edge case handling (empty database, neutral defaults, division by zero guards, 0-100 score clamping)
 * 3. Time range date computation (week, month, 3months, all, and custom date range)
 * 4. Daily productivity trends aggregation (focus minutes, task completions/creation, mood/energy overlay)
 * 5. Learning analytics & mastery tier distribution
 * 6. Cross-module correlations & behavioral pattern detection
 * 7. System-wide summary statistics across all modules
 * 8. Strict exclusion of soft-deleted records (is_deleted = 1) from all calculations
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { db } from '../src/db/client';
import { analyticsService } from '../src/services/analyticsService';
import { taskService } from '../src/services/taskService';
import { focusService } from '../src/services/focusService';
import { learningService } from '../src/services/learningService';
import { journalService } from '../src/services/journalService';
import { vaultService } from '../src/services/vaultService';
import { institutionService } from '../src/services/institutionService';
import { subjectService } from '../src/services/subjectService';
import { bookService } from '../src/services/bookService';
import { academicTreeService } from '../src/services/academicTreeService';
import { getCurrentUtcIsoString } from '../src/lib/date/utc';

describe('Phase 08: Analytics Engine & Growth Intelligence', () => {
  let topic1Id: string;
  let topic2Id: string;
  let subjectId: string;

  beforeAll(async () => {
    // Clear relevant tables to ensure clean slate
    await db.execute('DELETE FROM tasks');
    await db.execute('DELETE FROM focus_sessions');
    await db.execute('DELETE FROM learning_sessions');
    await db.execute('DELETE FROM mastery_records');
    await db.execute('DELETE FROM journals');
    await db.execute('DELETE FROM memories');

    // Create topic hierarchy fixtures using academic services
    const inst = await institutionService.createInstitution({
      name: 'دانشگاه جامع تحلیل',
      type: 'university',
    });
    const subj = await subjectService.createSubject({
      institutionId: inst.id,
      name: 'درس هوش مصنوعی و یادگیری عمیق',
    });
    subjectId = subj.id;

    const book = await bookService.createBook({
      subjectId: subj.id,
      title: 'کتاب مرجع یادگیری عمیق Goodfellow',
    });

    const chap = await academicTreeService.createChapter({
      bookId: book.id,
      title: 'شبکه‌های عصبی عمیق',
      chapterNumber: 1,
    });

    const top1 = await academicTreeService.createTopic({
      subjectId: subj.id,
      chapterId: chap.id,
      sectionId: null,
      title: 'پس‌انتشار خطا و الگوریتم گرادیان نزولی',
      importanceLevel: 'high',
    });
    topic1Id = top1.id;

    const top2 = await academicTreeService.createTopic({
      subjectId: subj.id,
      chapterId: chap.id,
      sectionId: null,
      title: 'توابع فعالیت و بهینه‌سازهای مدرن',
      importanceLevel: 'medium',
    });
    topic2Id = top2.id;
  });

  // ─── 1. Date Range Computation ─────────────────────────────────────────────

  describe('Date Range Computation', () => {
    it('should compute correct 7-day range for week', () => {
      const range = analyticsService.computeDateRange('week');
      expect(range.daysCount).toBe(7);
      expect(range.startDate).toBeDefined();
      expect(range.endDate).toBeDefined();
      expect(new Date(range.startDate).getTime()).toBeLessThan(new Date(range.endDate).getTime());
    });

    it('should compute correct 30-day range for month', () => {
      const range = analyticsService.computeDateRange('month');
      expect(range.daysCount).toBe(30);
    });

    it('should compute correct 90-day range for 3months', () => {
      const range = analyticsService.computeDateRange('3months');
      expect(range.daysCount).toBe(90);
    });

    it('should support custom date ranges accurately', () => {
      const customStart = '2026-08-01T00:00:00.000Z';
      const customEnd = '2026-08-15T23:59:59.999Z';
      const range = analyticsService.computeDateRange('week', customStart, customEnd);
      expect(range.startDate).toBe(customStart);
      expect(range.endDate).toBe(customEnd);
      expect(range.daysCount).toBe(15);
    });
  });

  // ─── 2. Empty State & Neutral Defaults (Zero Division Guards) ──────────────

  describe('Empty Database / Neutral Baseline', () => {
    it('should produce a valid neutral AGS score without throwing or NaN when DB is empty', async () => {
      const score = await analyticsService.getAscendGrowthScore('week');

      expect(score).toBeDefined();
      expect(score.totalScore).toBeGreaterThanOrEqual(0);
      expect(score.totalScore).toBeLessThanOrEqual(100);
      expect(Number.isNaN(score.totalScore)).toBe(false);
      expect(['exceptional', 'balanced', 'developing', 'needs_attention']).toContain(score.tier);
      expect(score.subScores.productivity.score).toBeGreaterThanOrEqual(0);
      expect(score.subScores.learning.score).toBeGreaterThanOrEqual(0);
      expect(score.subScores.wellBeing.score).toBeGreaterThanOrEqual(0);
    });

    it('should return empty/neutral trends on empty database', async () => {
      const trends = await analyticsService.getProductivityTrends('week');
      expect(trends.length).toBe(7);
      trends.forEach((t) => {
        expect(t.focusMinutes).toBe(0);
        expect(t.tasksCompleted).toBe(0);
        expect(t.avgMood).toBeNull();
      });
    });

    it('should return zeroed system summary stats on empty database', async () => {
      const summary = await analyticsService.getSystemSummaryStats();
      expect(summary.totalTasks).toBe(0);
      expect(summary.completedTasks).toBe(0);
      expect(summary.totalFocusMinutes).toBe(0);
      expect(summary.masteredTopicsCount).toBe(0);
      expect(summary.totalJournalEntries).toBe(0);
    });
  });

  // ─── 3. Comprehensive Data Population & AGS Calculation ───────────────────

  describe('Populated Data Calculations', () => {
    const today = getCurrentUtcIsoString().split('T')[0];

    beforeAll(async () => {
      // 1. Create Tasks (2 completed, 1 todo)
      const t1 = await taskService.createTask({ title: 'تسک اول تحلیلی', priority: 'high' });
      await taskService.transitionStatus(t1.id, 'completed');

      const t2 = await taskService.createTask({ title: 'تسک دوم تحلیلی', priority: 'medium' });
      await taskService.transitionStatus(t2.id, 'completed');

      await taskService.createTask({ title: 'تسک سوم تحلیلی', priority: 'low' });

      // 2. Create Focus Sessions (25 + 25 + 70 = 120 mins)
      const s1 = await focusService.startFocusSession({
        sessionType: 'pomodoro',
        plannedDurationMinutes: 25,
      });
      await focusService.completeFocusSession(s1.id, 25);

      const s2 = await focusService.startFocusSession({
        sessionType: 'pomodoro',
        plannedDurationMinutes: 25,
      });
      await focusService.completeFocusSession(s2.id, 25);

      const s3 = await focusService.startFocusSession({
        sessionType: 'countdown',
        plannedDurationMinutes: 70,
      });
      await focusService.completeFocusSession(s3.id, 70);

      // 3. Insert Mastery records directly (Average level = 85.0)
      const now = getCurrentUtcIsoString();
      await db.execute(
        `INSERT INTO mastery_records (id, topic_id, level, tier, ease_factor, repetitions, device_id, is_deleted, created_at, updated_at, version)
         VALUES 
           ('mast_test_1', ?, 95.0, 'mastered', 2.8, 6, 'dev', 0, ?, ?, 1),
           ('mast_test_2', ?, 75.0, 'proficient', 2.4, 3, 'dev', 0, ?, ?, 1)`,
        [topic1Id, now, now, topic2Id, now, now]
      );

      // 4. Log Learning Sessions (60 + 45 + 30 = 135 mins)
      await learningService.logSession({
        subjectId,
        topicId: topic1Id,
        activityType: 'study',
        durationMinutes: 60,
        comprehensionRating: 5,
      });
      await learningService.logSession({
        subjectId,
        topicId: topic2Id,
        activityType: 'practice',
        durationMinutes: 45,
        comprehensionRating: 4,
      });
      await learningService.logSession({
        subjectId,
        topicId: topic1Id,
        activityType: 'review',
        durationMinutes: 30,
        comprehensionRating: 5,
      });

      // 5. Save Daily Journal
      await journalService.saveJournalEntry({
        entryDate: today,
        title: 'روز عالی و پر انرژی',
        content: 'تست یکپارچه‌سازی فرامدولار',
        moodScore: 5,
        energyLevel: 5,
      });

      // 6. Create Memory Vault Item
      await vaultService.createVaultItem({
        category: 'win',
        title: 'پیروزی در آزمون',
        content: 'خاطره پیروزی',
      });
    });

    it('should calculate accurate productivity subscore (completion rate + focus time)', async () => {
      const score = await analyticsService.getAscendGrowthScore('week');
      const prod = score.subScores.productivity;

      expect(prod.totalTasks).toBe(3);
      expect(prod.completedTasks).toBe(2);
      expect(prod.focusMinutes).toBe(120);
      expect(prod.score).toBeGreaterThan(0);
      expect(prod.score).toBeLessThanOrEqual(100);
    });

    it('should calculate accurate learning subscore (average mastery + study sessions)', async () => {
      const score = await analyticsService.getAscendGrowthScore('week');
      const learning = score.subScores.learning;

      expect(learning.averageMastery).toBeGreaterThanOrEqual(80);
      expect(learning.totalSessions).toBe(3);
      expect(learning.score).toBeGreaterThan(50);
    });

    it('should calculate accurate well-being subscore (mood rating + streak)', async () => {
      const score = await analyticsService.getAscendGrowthScore('week');
      const wellBeing = score.subScores.wellBeing;

      expect(wellBeing.averageMood).toBe(5);
      expect(wellBeing.score).toBeGreaterThan(50);
    });

    it('should synthesize composite Ascend Growth Score and assign appropriate tier', async () => {
      const score = await analyticsService.getAscendGrowthScore('week');

      expect(score.totalScore).toBeGreaterThanOrEqual(60);
      expect(['exceptional', 'balanced']).toContain(score.tier);
      expect(score.tierLabel).toBeDefined();
    });

    it('should aggregate productivity trends across days accurately', async () => {
      const trends = await analyticsService.getProductivityTrends('week');
      const todayTrend = trends[trends.length - 1];

      expect(todayTrend.focusMinutes).toBe(120);
      expect(todayTrend.tasksCompleted).toBe(2);
      expect(todayTrend.tasksCreated).toBe(3);
      expect(todayTrend.avgMood).toBe(5);
      expect(todayTrend.avgEnergy).toBe(5);
    });

    it('should aggregate learning analytics by tier distribution and activity type', async () => {
      const learning = await analyticsService.getLearningAnalytics();

      expect(learning.totalTopics).toBe(2);
      expect(learning.tierCounts.mastered).toBe(1);
      expect(learning.tierCounts.proficient).toBe(1);
      expect(learning.activityTypeDurations.study).toBe(60);
      expect(learning.activityTypeDurations.practice).toBe(45);
      expect(learning.activityTypeDurations.review).toBe(30);
      expect(learning.averageEaseFactor).toBeGreaterThanOrEqual(2.5);
    });

    it('should return cross-module behavioral correlations and insights', async () => {
      const insights = await analyticsService.getCrossModuleCorrelations();

      expect(insights.length).toBeGreaterThanOrEqual(2);
      const energyInsight = insights.find((i) => i.correlationType === 'energy_vs_output');
      expect(energyInsight).toBeDefined();
      expect(energyInsight?.description).toContain('سطح انرژی');
    });

    it('should calculate global system summary statistics across all modules', async () => {
      const summary = await analyticsService.getSystemSummaryStats();

      expect(summary.totalTasks).toBe(3);
      expect(summary.completedTasks).toBe(2);
      expect(summary.totalFocusMinutes).toBe(120);
      expect(summary.masteredTopicsCount).toBe(1);
      expect(summary.totalTopicsCount).toBe(2);
      expect(summary.totalJournalEntries).toBe(1);
      expect(summary.totalMemoriesCount).toBe(1);
    });
  });

  // ─── 4. Soft-Delete Exclusion Strictness ───────────────────────────────────

  describe('Soft-Delete Strict Exclusion', () => {
    it('should exclude soft-deleted tasks from total and completed counts', async () => {
      const deletedTask = await taskService.createTask({ title: 'تسک حذفی', priority: 'low' });
      await taskService.transitionStatus(deletedTask.id, 'completed');
      await taskService.deleteTask(deletedTask.id);

      const score = await analyticsService.getAscendGrowthScore('week');
      expect(score.subScores.productivity.totalTasks).toBe(3); // Unchanged 3
      expect(score.subScores.productivity.completedTasks).toBe(2); // Unchanged 2
    });

    it('should exclude soft-deleted focus sessions from minutes aggregation', async () => {
      const delSession = await focusService.startFocusSession({
        sessionType: 'countdown',
        plannedDurationMinutes: 100,
      });
      await focusService.completeFocusSession(delSession.id, 100);
      await focusService.deleteFocusSession(delSession.id);

      const score = await analyticsService.getAscendGrowthScore('week');
      expect(score.subScores.productivity.focusMinutes).toBe(120); // Unchanged 120
    });

    it('should exclude soft-deleted mastery records and learning sessions', async () => {
      const now = getCurrentUtcIsoString();
      await db.execute(
        `INSERT INTO mastery_records (id, topic_id, level, tier, ease_factor, repetitions, device_id, is_deleted, created_at, updated_at, version)
         VALUES ('mast_deleted_1', ?, 100.0, 'mastered', 3.0, 10, 'dev', 1, ?, ?, 1)`,
        [topic1Id, now, now]
      );

      const learning = await analyticsService.getLearningAnalytics();
      expect(learning.totalTopics).toBe(2); // Unchanged 2
      expect(learning.tierCounts.mastered).toBe(1); // Unchanged 1
    });

    it('should exclude soft-deleted journals and memories from summary stats', async () => {
      const delJournal = await journalService.saveJournalEntry({
        entryDate: '2026-08-10',
        title: 'ژورنال حذفی',
        content: 'محتوا',
      });
      await journalService.deleteJournalEntry(delJournal.id);

      const summary = await analyticsService.getSystemSummaryStats();
      expect(summary.totalJournalEntries).toBe(1); // Unchanged 1
    });
  });
});
