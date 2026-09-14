import React, { useState } from 'react';
import {
  BarChart3,
  LineChart as LineChartIcon,
  PieChart as PieChartIcon,
} from 'lucide-react';
import { Card } from './Card';
import { DailyProductivityTrend } from '../types/database';

export interface AnalyticsChartsProps {
  trends: DailyProductivityTrend[];
  tierCounts?: Record<string, number>;
  activityDurations?: Record<string, number>;
}

export const AnalyticsCharts: React.FC<AnalyticsChartsProps> = ({
  trends,
  tierCounts = {},
  activityDurations = {},
}) => {
  const [activeChartTab, setActiveChartTab] = useState<'focus_tasks' | 'mood_energy' | 'mastery'>('focus_tasks');

  // Max values for chart scaling
  const maxFocus = Math.max(60, ...trends.map((t) => t.focusMinutes));
  const maxTasks = Math.max(5, ...trends.map((t) => t.tasksCompleted));

  // Chart dimensions
  const svgWidth = 700;
  const svgHeight = 220;
  const paddingX = 40;
  const paddingY = 30;
  const chartWidth = svgWidth - paddingX * 2;
  const chartHeight = svgHeight - paddingY * 2;

  const pointsCount = Math.max(1, trends.length);
  const stepX = chartWidth / (pointsCount - 1 || 1);

  // Generate SVG path for focus area
  const focusPoints = trends.map((t, idx) => {
    const x = paddingX + idx * stepX;
    const y = paddingY + chartHeight - (t.focusMinutes / maxFocus) * chartHeight;
    return { x, y, data: t };
  });

  const focusAreaPath =
    focusPoints.length > 0
      ? `M ${focusPoints[0].x} ${paddingY + chartHeight} ` +
        focusPoints.map((p) => `L ${p.x} ${p.y}`).join(' ') +
        ` L ${focusPoints[focusPoints.length - 1].x} ${paddingY + chartHeight} Z`
      : '';

  const focusLinePath =
    focusPoints.length > 0 ? focusPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ') : '';

  // Generate SVG path for Mood (1 to 5)
  const moodPoints = trends.map((t, idx) => {
    const x = paddingX + idx * stepX;
    const moodVal = t.avgMood || 3;
    const y = paddingY + chartHeight - ((moodVal - 1) / 4) * chartHeight;
    return { x, y, data: t };
  });
  const moodLinePath =
    moodPoints.length > 0 ? moodPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ') : '';

  // Generate SVG path for Energy (1 to 5)
  const energyPoints = trends.map((t, idx) => {
    const x = paddingX + idx * stepX;
    const energyVal = t.avgEnergy || 3;
    const y = paddingY + chartHeight - ((energyVal - 1) / 4) * chartHeight;
    return { x, y, data: t };
  });
  const energyLinePath =
    energyPoints.length > 0 ? energyPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ') : '';

  // Mastery tier total
  const totalTierTopics = Object.values(tierCounts).reduce((acc, c) => acc + c, 0) || 1;

  return (
    <Card variant="acrylic" className="p-5 space-y-4 text-start select-none border border-black/8 dark:border-white/8">
      {/* Chart Tabs Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-black/8 dark:border-white/8 pb-3">
        <div className="flex items-center gap-1.5 p-1 bg-black/5 dark:bg-white/5 rounded-xl border border-black/5 dark:border-white/5">
          <button
            onClick={() => setActiveChartTab('focus_tasks')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition-all ${
              activeChartTab === 'focus_tasks'
                ? 'bg-white dark:bg-[#333] text-[#0078d4] dark:text-[#60a5fa] font-bold shadow-sm'
                : 'text-[#616161] hover:text-black dark:hover:text-white'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>تمرکز و وظایف</span>
          </button>

          <button
            onClick={() => setActiveChartTab('mood_energy')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition-all ${
              activeChartTab === 'mood_energy'
                ? 'bg-white dark:bg-[#333] text-[#0078d4] dark:text-[#60a5fa] font-bold shadow-sm'
                : 'text-[#616161] hover:text-black dark:hover:text-white'
            }`}
          >
            <LineChartIcon className="w-3.5 h-3.5" />
            <span>خلق‌وخو و سطح انرژی</span>
          </button>

          <button
            onClick={() => setActiveChartTab('mastery')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition-all ${
              activeChartTab === 'mastery'
                ? 'bg-white dark:bg-[#333] text-[#0078d4] dark:text-[#60a5fa] font-bold shadow-sm'
                : 'text-[#616161] hover:text-black dark:hover:text-white'
            }`}
          >
            <PieChartIcon className="w-3.5 h-3.5" />
            <span>توزیع تسلط علمی</span>
          </button>
        </div>

        {/* Legend */}
        {activeChartTab === 'focus_tasks' && (
          <div className="flex items-center gap-4 text-xs text-[#8a8a8a]">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-[#0078d4]" />
              <span>دقایق تمرکز</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-emerald-500" />
              <span>وظایف تکمیل‌شده</span>
            </span>
          </div>
        )}

        {activeChartTab === 'mood_energy' && (
          <div className="flex items-center gap-4 text-xs text-[#8a8a8a]">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-blue-500" />
              <span>خلق‌وخو (Mood)</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-amber-500" />
              <span>انرژی (Energy)</span>
            </span>
          </div>
        )}
      </div>

      {/* Chart 1: Focus Minutes & Tasks Completed */}
      {activeChartTab === 'focus_tasks' && (
        <div className="overflow-x-auto">
          <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full h-56 font-sans">
            <defs>
              <linearGradient id="focusGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#0078d4" stopOpacity="0.3" />
                <stop offset="100%" stopColor="#0078d4" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Grid lines */}
            {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
              const y = paddingY + chartHeight * ratio;
              return (
                <line
                  key={ratio}
                  x1={paddingX}
                  y1={y}
                  x2={svgWidth - paddingX}
                  y2={y}
                  className="stroke-black/5 dark:stroke-white/5"
                  strokeDasharray="4 4"
                />
              );
            })}

            {/* Focus Area & Line */}
            {focusAreaPath && <path d={focusAreaPath} fill="url(#focusGradient)" />}
            {focusLinePath && (
              <path d={focusLinePath} fill="none" stroke="#0078d4" strokeWidth="2.5" strokeLinecap="round" />
            )}

            {/* Tasks Completed Bars */}
            {trends.map((t, idx) => {
              const x = paddingX + idx * stepX - 6;
              const barHeight = (t.tasksCompleted / maxTasks) * (chartHeight * 0.7);
              const y = paddingY + chartHeight - barHeight;

              return (
                <g key={t.date} className="group">
                  <rect
                    x={x}
                    y={y}
                    width="12"
                    height={Math.max(2, barHeight)}
                    rx="3"
                    className="fill-emerald-500/80 hover:fill-emerald-500 transition-colors cursor-pointer"
                  />
                  {/* Focus point circle */}
                  <circle
                    cx={paddingX + idx * stepX}
                    cy={paddingY + chartHeight - (t.focusMinutes / maxFocus) * chartHeight}
                    r="4"
                    className="fill-white dark:fill-[#202020] stroke-[#0078d4] stroke-2 hover:r-6 transition-all cursor-pointer"
                  >
                    <title>{`${t.date}: ${t.focusMinutes} دقیقه تمرکز | ${t.tasksCompleted} وظیفه تکمیل`}</title>
                  </circle>
                  {/* Date labels on bottom */}
                  {(idx === 0 || idx === Math.floor(pointsCount / 2) || idx === pointsCount - 1) && (
                    <text
                      x={paddingX + idx * stepX}
                      y={svgHeight - 8}
                      textAnchor="middle"
                      className="fill-[#8a8a8a] text-[10px] font-mono"
                    >
                      {t.date.slice(5)}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>
        </div>
      )}

      {/* Chart 2: Mood & Energy Overlay */}
      {activeChartTab === 'mood_energy' && (
        <div className="overflow-x-auto">
          <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full h-56 font-sans">
            {/* Grid lines for 1 to 5 ratings */}
            {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
              const y = paddingY + chartHeight * ratio;
              return (
                <line
                  key={ratio}
                  x1={paddingX}
                  y1={y}
                  x2={svgWidth - paddingX}
                  y2={y}
                  className="stroke-black/5 dark:stroke-white/5"
                  strokeDasharray="4 4"
                />
              );
            })}

            {/* Mood Line */}
            {moodLinePath && (
              <path d={moodLinePath} fill="none" stroke="#3b82f6" strokeWidth="2.5" strokeLinecap="round" />
            )}

            {/* Energy Line */}
            {energyLinePath && (
              <path
                d={energyLinePath}
                fill="none"
                stroke="#f59e0b"
                strokeWidth="2"
                strokeDasharray="3 3"
                strokeLinecap="round"
              />
            )}

            {/* Points */}
            {trends.map((t, idx) => {
              const x = paddingX + idx * stepX;
              const moodY = paddingY + chartHeight - (((t.avgMood || 3) - 1) / 4) * chartHeight;
              const energyY = paddingY + chartHeight - (((t.avgEnergy || 3) - 1) / 4) * chartHeight;

              return (
                <g key={t.date}>
                  {t.avgMood !== null && (
                    <circle cx={x} cy={moodY} r="4" className="fill-[#3b82f6] stroke-white stroke-2">
                      <title>{`${t.date}: خلق‌وخو ${t.avgMood}/5`}</title>
                    </circle>
                  )}
                  {t.avgEnergy !== null && (
                    <circle cx={x} cy={energyY} r="3" className="fill-[#f59e0b] stroke-white stroke-1">
                      <title>{`${t.date}: انرژی ${t.avgEnergy}/5`}</title>
                    </circle>
                  )}
                  {(idx === 0 || idx === Math.floor(pointsCount / 2) || idx === pointsCount - 1) && (
                    <text
                      x={x}
                      y={svgHeight - 8}
                      textAnchor="middle"
                      className="fill-[#8a8a8a] text-[10px] font-mono"
                    >
                      {t.date.slice(5)}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>
        </div>
      )}

      {/* Chart 3: Mastery Tier Distribution & Activity Breakdown */}
      {activeChartTab === 'mastery' && (
        <div className="space-y-6 py-2">
          {/* Tier Distribution Segmented Bar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-[#1f1f1f] dark:text-white">
                توزیع سطوح تسلط در سرفصل‌های درسی:
              </span>
              <span className="text-[#8a8a8a] font-mono">{totalTierTopics} سرفصل کل</span>
            </div>

            <div className="w-full h-4 rounded-xl overflow-hidden flex bg-black/5 dark:bg-white/5 border border-black/8 dark:border-white/8">
              <div
                title={`استاد (Mastered): ${tierCounts.mastered || 0}`}
                className="bg-emerald-500 h-full transition-all"
                style={{ width: `${((tierCounts.mastered || 0) / totalTierTopics) * 100}%` }}
              />
              <div
                title={`پیشرفته (Proficient): ${tierCounts.proficient || 0}`}
                className="bg-blue-500 h-full transition-all"
                style={{ width: `${((tierCounts.proficient || 0) / totalTierTopics) * 100}%` }}
              />
              <div
                title={`مسلط مقدماتی (Competent): ${tierCounts.competent || 0}`}
                className="bg-purple-500 h-full transition-all"
                style={{ width: `${((tierCounts.competent || 0) / totalTierTopics) * 100}%` }}
              />
              <div
                title={`مبتدی (Novice): ${tierCounts.novice || 0}`}
                className="bg-amber-500 h-full transition-all"
                style={{ width: `${((tierCounts.novice || 0) / totalTierTopics) * 100}%` }}
              />
              <div
                title={`مطالعه‌نشده (Unstudied): ${tierCounts.unstudied || 0}`}
                className="bg-black/10 dark:bg-white/10 h-full transition-all"
                style={{ width: `${((tierCounts.unstudied || 0) / totalTierTopics) * 100}%` }}
              />
            </div>

            {/* Legend for tiers */}
            <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] pt-1 text-[#8a8a8a]">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <span>استاد ({tierCounts.mastered || 0})</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                <span>پیشرفته ({tierCounts.proficient || 0})</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-purple-500" />
                <span>مسلط ({tierCounts.competent || 0})</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                <span>مبتدی ({tierCounts.novice || 0})</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-black/20 dark:bg-white/20" />
                <span>مطالعه‌نشده ({tierCounts.unstudied || 0})</span>
              </span>
            </div>
          </div>

          {/* Activity Durations Breakdown */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
            {[
              { id: 'study', label: 'مطالعه عمیق', mins: activityDurations.study || 0, color: 'text-[#0078d4]' },
              { id: 'practice', label: 'حل تمرین', mins: activityDurations.practice || 0, color: 'text-amber-500' },
              { id: 'review', label: 'مرور فعال SM-2', mins: activityDurations.review || 0, color: 'text-purple-500' },
              { id: 'teaching', label: 'تدریس فاینمن', mins: activityDurations.teaching || 0, color: 'text-emerald-500' },
            ].map((act) => (
              <div key={act.id} className="p-3 rounded-xl bg-black/3 dark:bg-white/3 border border-black/5 dark:border-white/5 text-center space-y-1">
                <span className="text-xs text-[#8a8a8a]">{act.label}</span>
                <div className={`text-base font-bold font-mono ${act.color}`}>
                  {act.mins} دقیقه
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
};
