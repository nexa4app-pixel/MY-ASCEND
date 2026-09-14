import React, { useState, useEffect, useCallback } from 'react';
import {
  TrendingUp,
  RotateCcw,
  CheckCircle2,
  Clock,
  GraduationCap,
  BookHeart,
  Calendar,
  Layers,
} from 'lucide-react';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { GrowthScoreCard } from '../components/GrowthScoreCard';
import { AnalyticsCharts } from '../components/AnalyticsCharts';
import { InsightCards } from '../components/InsightCards';
import { analyticsService } from '../services/analyticsService';
import {
  AnalyticsTimeRange,
  AscendGrowthScore,
  DailyProductivityTrend,
  CrossModuleCorrelation,
  SystemSummaryStats,
} from '../types/database';

export const AnalyticsPage: React.FC = () => {
  const [timeRange, setTimeRange] = useState<AnalyticsTimeRange>('week');
  const [loading, setLoading] = useState<boolean>(true);
  const [growthScore, setGrowthScore] = useState<AscendGrowthScore | null>(null);
  const [trends, setTrends] = useState<DailyProductivityTrend[]>([]);
  const [tierCounts, setTierCounts] = useState<Record<string, number>>({});
  const [activityDurations, setActivityDurations] = useState<Record<string, number>>({});
  const [insights, setInsights] = useState<CrossModuleCorrelation[]>([]);
  const [summaryStats, setSummaryStats] = useState<SystemSummaryStats | null>(null);

  const loadAnalyticsData = useCallback(async () => {
    try {
      setLoading(true);
      const [scoreRes, trendsRes, learningRes, insightsRes, summaryRes] = await Promise.all([
        analyticsService.getAscendGrowthScore(timeRange),
        analyticsService.getProductivityTrends(timeRange),
        analyticsService.getLearningAnalytics(),
        analyticsService.getCrossModuleCorrelations(),
        analyticsService.getSystemSummaryStats(),
      ]);

      setGrowthScore(scoreRes);
      setTrends(trendsRes);
      setTierCounts(learningRes.tierCounts);
      setActivityDurations(learningRes.activityTypeDurations);
      setInsights(insightsRes);
      setSummaryStats(summaryRes);
    } catch (err) {
      console.error('Failed to load analytics data:', err);
    } finally {
      setLoading(false);
    }
  }, [timeRange]);

  useEffect(() => {
    loadAnalyticsData();
  }, [loadAnalyticsData]);

  const TIME_RANGE_OPTIONS: { id: AnalyticsTimeRange; label: string }[] = [
    { id: 'week', label: '۷ روز اخیر' },
    { id: 'month', label: '۳۰ روز اخیر' },
    { id: '3months', label: '۳ ماه گذشته' },
    { id: 'all', label: 'کل دوران' },
  ];

  return (
    <div className="space-y-6 pb-12 animate-fade-in select-none">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-black/8 dark:border-white/8 pb-4">
        <div>
          <h1 className="text-xl font-black text-[#1f1f1f] dark:text-white flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-[#0078d4]" />
            <span>موتور تحلیل و شاخص جامع رشد (AGS)</span>
          </h1>
          <p className="text-xs text-[#8a8a8a] mt-1">
            سنتز و تحلیل فرامدولار خروجی وظایف، تمرکز عمیق، تسلط آکادمیک و احوال روزانه
          </p>
        </div>

        {/* Time Range Selector & Refresh */}
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-black/5 dark:bg-white/5 p-1 rounded-xl border border-black/5 dark:border-white/5">
            {TIME_RANGE_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                onClick={() => setTimeRange(opt.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  timeRange === opt.id
                    ? 'bg-white dark:bg-[#333333] text-[#0078d4] dark:text-[#60a5fa] font-bold shadow-sm'
                    : 'text-[#8a8a8a] hover:text-[#1f1f1f] dark:hover:text-white'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <Button
            variant="subtle"
            size="sm"
            onClick={loadAnalyticsData}
            title="بروزرسانی داده‌ها"
            disabled={loading}
          >
            <RotateCcw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* High-level System Summary Stats */}
      {summaryStats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
          <Card variant="acrylic" className="p-3.5 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#0078d4]/10 text-[#0078d4] flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[10px] text-[#8a8a8a] font-medium">وظایف تکمیل‌شده</div>
              <div className="text-lg font-black text-[#1f1f1f] dark:text-white">
                {summaryStats.completedTasks}{' '}
                <span className="text-[10px] font-normal text-[#8a8a8a]">/ {summaryStats.totalTasks}</span>
              </div>
            </div>
          </Card>

          <Card variant="acrylic" className="p-3.5 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-orange-500/10 text-orange-500 flex items-center justify-center shrink-0">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[10px] text-[#8a8a8a] font-medium">تمرکز عمیق ثبت‌شده</div>
              <div className="text-lg font-black text-[#1f1f1f] dark:text-white">
                {Math.round(summaryStats.totalFocusMinutes / 60)}{' '}
                <span className="text-[10px] font-normal text-[#8a8a8a]">ساعت ({summaryStats.totalFocusMinutes} د)</span>
              </div>
            </div>
          </Card>

          <Card variant="acrylic" className="p-3.5 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center shrink-0">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[10px] text-[#8a8a8a] font-medium">مباحث تسلط‌یافته (۹۰٪+)</div>
              <div className="text-lg font-black text-[#1f1f1f] dark:text-white">
                {summaryStats.masteredTopicsCount}{' '}
                <span className="text-[10px] font-normal text-[#8a8a8a]">/ {summaryStats.totalTopicsCount}</span>
              </div>
            </div>
          </Card>

          <Card variant="acrylic" className="p-3.5 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-pink-500/10 text-pink-500 flex items-center justify-center shrink-0">
              <BookHeart className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[10px] text-[#8a8a8a] font-medium">ثبت ژورنال و خاطرات</div>
              <div className="text-lg font-black text-[#1f1f1f] dark:text-white">
                {summaryStats.totalJournalEntries}{' '}
                <span className="text-[10px] font-normal text-[#8a8a8a]">یادداشت</span>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Hero Growth Score Card */}
      {growthScore && (
        <div>
          <GrowthScoreCard scoreData={growthScore} />
        </div>
      )}

      {/* Visual Analytics Charts Section */}
      <div className="space-y-4">
        <AnalyticsCharts
          trends={trends}
          tierCounts={tierCounts}
          activityDurations={activityDurations}
        />
      </div>

      {/* Algorithmic Correlation Takeaways */}
      <div>
        <InsightCards insights={insights} />
      </div>

      {/* Bottom Metadata Info */}
      <div className="p-3 rounded-xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 text-[11px] text-[#8a8a8a] flex flex-col sm:flex-row items-center justify-between gap-2">
        <span className="flex items-center gap-1.5">
          <Layers className="w-3.5 h-3.5 text-[#0078d4]" />
          <span>فرمول‌بندی شاخص AGS: بهره‌وری ۳۵٪ + یادگیری ۳۵٪ + بهزیستی و استمرار ۳۰٪</span>
        </span>
        <span className="font-mono text-[10px] flex items-center gap-1">
          <Calendar className="w-3 h-3" />
          <span>محدوده فعال: {TIME_RANGE_OPTIONS.find((t) => t.id === timeRange)?.label}</span>
        </span>
      </div>
    </div>
  );
};
