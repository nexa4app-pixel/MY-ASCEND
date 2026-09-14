/**
 * Analytics & Growth Intelligence Service — MY ASCEND
 * Cross-module synthesis for Tasks, Learning, Focus, and Journaling with Ascend Growth Score (AGS).
 */
import { db } from '../db/client';
import {
  AnalyticsTimeRange,
  AscendGrowthScore,
  DailyProductivityTrend,
  CrossModuleCorrelation,
  SystemSummaryStats,
} from '../types/database';
import { journalService } from './journalService';
import { logger } from './logger';

class AnalyticsService {
  /**
   * Computes ISO start and end timestamps based on selected time range.
   */
  public computeDateRange(
    timeRange: AnalyticsTimeRange,
    customStart?: string,
    customEnd?: string
  ): { startDate: string; endDate: string; daysCount: number } {
    if (customStart && customEnd) {
      const s = new Date(customStart);
      const e = new Date(customEnd);
      const days = Math.max(1, Math.round((e.getTime() - s.getTime()) / 86400000));
      return { startDate: customStart, endDate: customEnd, daysCount: days };
    }

    const end = new Date();
    end.setHours(23, 59, 59, 999);
    const start = new Date();
    start.setHours(0, 0, 0, 0);

    let daysCount = 7;
    if (timeRange === 'week') {
      daysCount = 7;
      start.setDate(end.getDate() - 6);
    } else if (timeRange === 'month') {
      daysCount = 30;
      start.setDate(end.getDate() - 29);
    } else if (timeRange === '3months') {
      daysCount = 90;
      start.setDate(end.getDate() - 89);
    } else if (timeRange === 'all') {
      daysCount = 365;
      start.setFullYear(2020, 0, 1);
    }

    return {
      startDate: start.toISOString(),
      endDate: end.toISOString(),
      daysCount,
    };
  }

  /**
   * Calculates the Ascend Growth Score (AGS: 0-100) composite index.
   */
  public async getAscendGrowthScore(
    timeRange: AnalyticsTimeRange = 'week',
    customStart?: string,
    customEnd?: string
  ): Promise<AscendGrowthScore> {
    const { startDate, endDate, daysCount } = this.computeDateRange(timeRange, customStart, customEnd);
    const startDayStr = startDate.split('T')[0];
    const endDayStr = endDate.split('T')[0];

    // 1. Productivity Component (35%)
    const taskRows = await db.query<{ total: number; completed: number }>(
      `SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed
      FROM tasks
      WHERE is_deleted = 0 AND created_at <= ?`,
      [endDate]
    );
    const totalTasks = Number(taskRows[0]?.total) || 0;
    const completedTasks = Number(taskRows[0]?.completed) || 0;

    const focusRows = await db.query<{ totalMinutes: number }>(
      `SELECT SUM(actual_duration_minutes) as totalMinutes
      FROM focus_sessions
      WHERE is_deleted = 0 AND completed_status = 'completed' AND started_at >= ? AND started_at <= ?`,
      [startDate, endDate]
    );
    const focusMinutes = Number(focusRows[0]?.totalMinutes) || 0;

    // Task Completion Rate
    const taskCompletionRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 50;
    // Focus target: expected 30 mins focus per day in the period
    const targetFocusMins = Math.max(30, daysCount * 30);
    const focusAchievementRate = Math.min(100, (focusMinutes / targetFocusMins) * 100);
    const productivityScore = Math.round(
      Math.max(0, Math.min(100, taskCompletionRate * 0.5 + focusAchievementRate * 0.5))
    );

    // 2. Learning Component (35%)
    const masteryRows = await db.query<{ avgLevel: number; count: number }>(
      `SELECT AVG(level) as avgLevel, COUNT(*) as count
      FROM mastery_records
      WHERE is_deleted = 0`
    );
    const averageMastery = Number(masteryRows[0]?.avgLevel) || 0;

    const sessionRows = await db.query<{ count: number }>(
      `SELECT COUNT(*) as count
      FROM learning_sessions
      WHERE is_deleted = 0 AND started_at >= ? AND started_at <= ?`,
      [startDate, endDate]
    );
    const totalLearningSessions = Number(sessionRows[0]?.count) || 0;

    // Target: 1 learning session every 2 days
    const targetLearningSessions = Math.max(1, Math.round(daysCount / 2));
    const learningVelocity = Math.min(100, (totalLearningSessions / targetLearningSessions) * 100);
    const learningScore = Math.round(
      Math.max(0, Math.min(100, averageMastery * 0.65 + learningVelocity * 0.35))
    );

    // 3. Well-Being Component (30%)
    const moodRows = await db.query<{ avgMood: number; count: number }>(
      `SELECT AVG(mood_score) as avgMood, COUNT(*) as count
      FROM journals
      WHERE is_deleted = 0 AND mood_score IS NOT NULL AND entry_date >= ? AND entry_date <= ?`,
      [startDayStr, endDayStr]
    );
    const avgMood = Number(moodRows[0]?.avgMood) || 0;

    const moodStats = await journalService.getMoodStats();
    const streak = moodStats.currentStreak;

    // Normalize mood 1-5 to 0-100 (1 -> 0%, 3 -> 50%, 5 -> 100%)
    const normalizedMood = avgMood > 0 ? Math.max(0, Math.min(100, ((avgMood - 1) / 4) * 100)) : 50;
    // Streak normalization (7 days streak = 100%)
    const normalizedStreak = Math.min(100, (streak / 7) * 100);
    const wellBeingScore = Math.round(
      Math.max(0, Math.min(100, normalizedMood * 0.6 + normalizedStreak * 0.4))
    );

    // Composite AGS Score (0-100)
    const totalScore = Math.round(
      Math.max(
        0,
        Math.min(
          100,
          productivityScore * 0.35 + learningScore * 0.35 + wellBeingScore * 0.30
        )
      )
    );

    let tier: 'exceptional' | 'balanced' | 'developing' | 'needs_attention' = 'developing';
    let tierLabel = 'در حال پیشرفت 🌱';

    if (totalScore >= 80) {
      tier = 'exceptional';
      tierLabel = 'رشد فوق‌العاده و درخشان 🚀';
    } else if (totalScore >= 60) {
      tier = 'balanced';
      tierLabel = 'رشد متعادل و پایدار ⚖️';
    } else if (totalScore >= 40) {
      tier = 'developing';
      tierLabel = 'در حال پیشرفت و شکل‌گیری 🌱';
    } else {
      tier = 'needs_attention';
      tierLabel = 'نیازمند تمرکز و توجه ⚠️';
    }

    logger.info(`Computed Ascend Growth Score: ${totalScore} (${tier})`, 'AnalyticsService');

    return {
      totalScore,
      tier,
      tierLabel,
      subScores: {
        productivity: {
          score: productivityScore,
          completedTasks,
          totalTasks,
          focusMinutes,
        },
        learning: {
          score: learningScore,
          averageMastery: Math.round(averageMastery * 10) / 10,
          totalSessions: totalLearningSessions,
        },
        wellBeing: {
          score: wellBeingScore,
          averageMood: Math.round(avgMood * 10) / 10,
          journalStreak: streak,
        },
      },
    };
  }

  /**
   * Daily trends for Focus Minutes, Completed Tasks, and Mood Ratings.
   */
  public async getProductivityTrends(
    timeRange: AnalyticsTimeRange = 'week',
    startDateParam?: string,
    endDateParam?: string
  ): Promise<DailyProductivityTrend[]> {
    const { startDate, endDate, daysCount } = this.computeDateRange(timeRange, startDateParam, endDateParam);
    const limitDays = Math.min(daysCount, 30); // Max 30 points for smooth charting

    // Generate date sequence
    const trends: DailyProductivityTrend[] = [];
    const end = new Date(endDate);

    for (let i = limitDays - 1; i >= 0; i--) {
      const d = new Date(end);
      d.setDate(end.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      trends.push({
        date: dateStr,
        focusMinutes: 0,
        tasksCompleted: 0,
        tasksCreated: 0,
        avgMood: null,
        avgEnergy: null,
      });
    }

    const trendMap = new Map(trends.map((t) => [t.date, t]));

    // Query Focus Sessions by day
    const focusRows = await db.query<{ day: string; mins: number }>(
      `SELECT
        substr(started_at, 1, 10) as day,
        SUM(actual_duration_minutes) as mins
      FROM focus_sessions
      WHERE is_deleted = 0 AND completed_status = 'completed' AND started_at >= ? AND started_at <= ?
      GROUP BY day`,
      [startDate, endDate]
    );
    for (const r of focusRows) {
      const item = trendMap.get(r.day);
      if (item) item.focusMinutes = Number(r.mins) || 0;
    }

    // Query Tasks Completed by day
    const taskCompletedRows = await db.query<{ day: string; count: number }>(
      `SELECT
        substr(updated_at, 1, 10) as day,
        COUNT(*) as count
      FROM tasks
      WHERE is_deleted = 0 AND status = 'completed' AND updated_at >= ? AND updated_at <= ?
      GROUP BY day`,
      [startDate, endDate]
    );
    for (const r of taskCompletedRows) {
      const item = trendMap.get(r.day);
      if (item) item.tasksCompleted = Number(r.count) || 0;
    }

    // Query Tasks Created by day
    const taskCreatedRows = await db.query<{ day: string; count: number }>(
      `SELECT
        substr(created_at, 1, 10) as day,
        COUNT(*) as count
      FROM tasks
      WHERE is_deleted = 0 AND created_at >= ? AND created_at <= ?
      GROUP BY day`,
      [startDate, endDate]
    );
    for (const r of taskCreatedRows) {
      const item = trendMap.get(r.day);
      if (item) item.tasksCreated = Number(r.count) || 0;
    }

    // Query Journal Mood & Energy by day
    const journalRows = await db.query<{ day: string; mood: number; energy: number }>(
      `SELECT
        entry_date as day,
        mood_score as mood,
        energy_level as energy
      FROM journals
      WHERE is_deleted = 0 AND entry_date >= ? AND entry_date <= ?`,
      [startDate.split('T')[0], endDate.split('T')[0]]
    );
    for (const r of journalRows) {
      const item = trendMap.get(r.day);
      if (item) {
        item.avgMood = r.mood !== null ? Number(r.mood) : null;
        item.avgEnergy = r.energy !== null ? Number(r.energy) : null;
      }
    }

    return trends;
  }

  /**
   * Learning analytics breakdown across tiers and study activities.
   */
  public async getLearningAnalytics(startDateParam?: string, endDateParam?: string): Promise<{
    tierCounts: Record<string, number>;
    totalTopics: number;
    activityTypeDurations: Record<string, number>;
    averageEaseFactor: number;
  }> {
    const tierRows = await db.query<{ tier: string; count: number }>(
      `SELECT tier, COUNT(*) as count
      FROM mastery_records
      WHERE is_deleted = 0
      GROUP BY tier`
    );
    const tierCounts: Record<string, number> = {
      unstudied: 0,
      novice: 0,
      competent: 0,
      proficient: 0,
      mastered: 0,
    };
    let totalTopics = 0;
    for (const r of tierRows) {
      tierCounts[r.tier] = Number(r.count) || 0;
      totalTopics += Number(r.count) || 0;
    }

    let actSql = `SELECT activity_type, SUM(COALESCE(duration_minutes, 0)) as totalMins
      FROM learning_sessions
      WHERE is_deleted = 0`;
    const actParams: unknown[] = [];
    if (startDateParam && endDateParam) {
      actSql += ` AND started_at >= ? AND started_at <= ?`;
      actParams.push(startDateParam, endDateParam);
    }
    actSql += ` GROUP BY activity_type`;

    const actRows = await db.query<{ activity_type: string; totalMins: number }>(actSql, actParams);
    const activityTypeDurations: Record<string, number> = {
      study: 0,
      practice: 0,
      review: 0,
      teaching: 0,
    };
    for (const r of actRows) {
      activityTypeDurations[r.activity_type] = Number(r.totalMins) || 0;
    }

    const efRow = await db.query<{ avgEf: number }>(
      `SELECT AVG(ease_factor) as avgEf FROM mastery_records WHERE is_deleted = 0`
    );
    const averageEaseFactor = Math.round((Number(efRow[0]?.avgEf) || 2.5) * 10) / 10;

    return {
      tierCounts,
      totalTopics,
      activityTypeDurations,
      averageEaseFactor,
    };
  }

  /**
   * Cross-module correlations & algorithmic insights.
   */
  public async getCrossModuleCorrelations(
    startDateParam?: string,
    endDateParam?: string
  ): Promise<CrossModuleCorrelation[]> {
    const trends = await this.getProductivityTrends('month', startDateParam, endDateParam);
    const insights: CrossModuleCorrelation[] = [];

    // 1. Energy vs. Tasks Output Correlation
    const daysWithEnergy = trends.filter((t) => t.avgEnergy !== null);
    if (daysWithEnergy.length >= 3) {
      const highEnergyDays = daysWithEnergy.filter((t) => t.avgEnergy! >= 4);
      const normalEnergyDays = daysWithEnergy.filter((t) => t.avgEnergy! < 4);

      const highEnergyAvgTasks =
        highEnergyDays.length > 0
          ? highEnergyDays.reduce((acc, d) => acc + d.tasksCompleted, 0) / highEnergyDays.length
          : 0;
      const normalEnergyAvgTasks =
        normalEnergyDays.length > 0
          ? normalEnergyDays.reduce((acc, d) => acc + d.tasksCompleted, 0) / normalEnergyDays.length
          : 0;

      const diffPercent =
        normalEnergyAvgTasks > 0
          ? Math.round(((highEnergyAvgTasks - normalEnergyAvgTasks) / normalEnergyAvgTasks) * 100)
          : highEnergyAvgTasks > 0
          ? 100
          : 0;

      insights.push({
        correlationType: 'energy_vs_output',
        description: 'ارتباط سطح انرژی روزانه با نرخ تکمیل وظایف',
        significance: diffPercent > 25 ? 'high' : 'moderate',
        insightMessage:
          diffPercent > 0
            ? `در روزهایی با سطح انرژی بالای ۴، خروجی انجام کارهای شما ${diffPercent}٪ افزایش داشته است.`
            : 'سطح انرژی پایدار به حفظ تعادل در انجام امور کمک کرده است.',
      });
    } else {
      insights.push({
        correlationType: 'energy_vs_output',
        description: 'ارتباط سطح انرژی روزانه با نرخ تکمیل وظایف',
        significance: 'low',
        insightMessage: 'با ثبت منظم سطح انرژی در ژورنال روزانه، همبستگی‌های دقیق‌تری در اینجا نمایش داده خواهد شد.',
      });
    }

    // 2. Focus Duration vs. Mood Correlation
    const daysWithMoodAndFocus = trends.filter((t) => t.avgMood !== null && t.focusMinutes > 0);
    if (daysWithMoodAndFocus.length >= 2) {
      const highFocusDays = daysWithMoodAndFocus.filter((t) => t.focusMinutes >= 45);
      const highFocusAvgMood =
        highFocusDays.length > 0
          ? highFocusDays.reduce((acc, d) => acc + d.avgMood!, 0) / highFocusDays.length
          : 3.5;

      insights.push({
        correlationType: 'focus_vs_mood',
        description: 'همبستگی ساعات تمرکز عمیق با حس رضایت و خلق‌وخو',
        significance: 'high',
        insightMessage:
          highFocusAvgMood >= 3.8
            ? `جلسات تمرکز بالای ۴۵ دقیقه با میانگین رضایت ${Math.round(highFocusAvgMood * 10) / 10} از ۵ همراه بوده است.`
            : 'حفظ استراحت‌های کوتاه بین جلسات تمرکز به ارتقای روحیه کمک می‌کند.',
      });
    } else {
      insights.push({
        correlationType: 'focus_vs_mood',
        description: 'همبستگی ساعات تمرکز عمیق با حس رضایت و خلق‌وخو',
        significance: 'moderate',
        insightMessage: 'ثبت منظم جلسات تمرکز پومودورو ارتباط مستقیمی با افزایش حس مفید بودن و آرامش ذهنی دارد.',
      });
    }

    // 3. Spaced Repetition Mastery Insight
    insights.push({
      correlationType: 'mastery_velocity',
      description: 'تاثیر مرورهای فاصله‌دار SM-2 بر ماندگاری یادگیری',
      significance: 'high',
      insightMessage: 'مرورهای به‌موقع در صف روزانه، نرخ ریزش ابینگهاوس را به حداقل می‌رساند و تسلط را دائمی می‌کند.',
    });

    return insights;
  }

  /**
   * System-wide statistics summary across all 7 operational modules.
   */
  public async getSystemSummaryStats(): Promise<SystemSummaryStats> {
    const taskRows = await db.query<{ total: number; completed: number }>(
      `SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed
      FROM tasks WHERE is_deleted = 0`
    );
    const totalTasks = Number(taskRows[0]?.total) || 0;
    const completedTasks = Number(taskRows[0]?.completed) || 0;

    const focusRows = await db.query<{ totalMins: number }>(
      `SELECT SUM(actual_duration_minutes) as totalMins
      FROM focus_sessions
      WHERE is_deleted = 0 AND completed_status = 'completed'`
    );
    const totalFocusMinutes = Number(focusRows[0]?.totalMins) || 0;

    const topicRows = await db.query<{ total: number; mastered: number }>(
      `SELECT
        COUNT(*) as total,
        SUM(CASE WHEN level >= 90.0 THEN 1 ELSE 0 END) as mastered
      FROM mastery_records WHERE is_deleted = 0`
    );
    const totalTopicsCount = Number(topicRows[0]?.total) || 0;
    const masteredTopicsCount = Number(topicRows[0]?.mastered) || 0;

    const journalRows = await db.query<{ count: number }>(
      `SELECT COUNT(*) as count FROM journals WHERE is_deleted = 0`
    );
    const totalJournalEntries = Number(journalRows[0]?.count) || 0;

    const memoryRows = await db.query<{ count: number }>(
      `SELECT COUNT(*) as count FROM memories WHERE is_deleted = 0`
    );
    const totalMemoriesCount = Number(memoryRows[0]?.count) || 0;

    const growth = await this.getAscendGrowthScore('week');

    return {
      totalTasks,
      completedTasks,
      totalFocusMinutes,
      masteredTopicsCount,
      totalTopicsCount,
      totalJournalEntries,
      totalMemoriesCount,
      ascendScore: growth.totalScore,
    };
  }
}

export const analyticsService = new AnalyticsService();
