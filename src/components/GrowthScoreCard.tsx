import React from 'react';
import {
  Sparkles,
  CheckCircle2,
  BookOpen,
  Smile,
  TrendingUp,
} from 'lucide-react';
import { Card } from './Card';
import { Badge } from './Badge';
import { AscendGrowthScore } from '../types/database';

export interface GrowthScoreCardProps {
  scoreData: AscendGrowthScore;
}

export const GrowthScoreCard: React.FC<GrowthScoreCardProps> = ({ scoreData }) => {
  const { totalScore, tier, tierLabel, subScores } = scoreData;

  // SVG Gauge calculations
  const radius = 64;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (totalScore / 100) * circumference;

  const getBadgeVariant = (t: string): 'success' | 'accent' | 'warning' | 'neutral' => {
    switch (t) {
      case 'exceptional':
        return 'success';
      case 'balanced':
        return 'accent';
      case 'developing':
        return 'warning';
      default:
        return 'neutral';
    }
  };

  return (
    <Card variant="acrylic" className="p-6 text-start select-none relative overflow-hidden border border-black/8 dark:border-white/8">
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
        {/* Left: Circular SVG Score Gauge (5 Cols) */}
        <div className="md:col-span-5 flex flex-col items-center justify-center text-center space-y-3">
          <div className="relative w-40 h-40 flex items-center justify-center">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 160 160">
              {/* Background track circle */}
              <circle
                cx="80"
                cy="80"
                r={radius}
                className="stroke-black/5 dark:stroke-white/5"
                strokeWidth="12"
                fill="transparent"
              />
              {/* Animated progress circle */}
              <circle
                cx="80"
                cy="80"
                r={radius}
                className="transition-all duration-1000 ease-out"
                stroke="currentColor"
                strokeWidth="12"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                fill="transparent"
                style={{
                  stroke:
                    tier === 'exceptional'
                      ? '#107c41'
                      : tier === 'balanced'
                      ? '#0078d4'
                      : tier === 'developing'
                      ? '#f59e0b'
                      : '#e11d48',
                }}
              />
            </svg>

            {/* Centered digits inside gauge */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-4xl font-extrabold font-mono text-[#1f1f1f] dark:text-white tracking-tight">
                {totalScore}
              </span>
              <span className="text-[10px] text-[#8a8a8a] font-semibold tracking-wide uppercase">
                از ۱۰۰
              </span>
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-center gap-1.5">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <h3 className="font-bold text-sm text-[#1f1f1f] dark:text-white">
                شاخص جامع رشد اسند (AGS)
              </h3>
            </div>
            <Badge variant={getBadgeVariant(tier)} size="sm" className="font-bold">
              {tierLabel}
            </Badge>
          </div>
        </div>

        {/* Right: 3 Core Pillars Sub-Scores (7 Cols) */}
        <div className="md:col-span-7 space-y-4 border-t md:border-t-0 md:border-s border-black/8 dark:border-white/8 pt-4 md:pt-0 md:ps-6">
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-xs text-[#8a8a8a] flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-[#0078d4]" />
              <span>مؤلفه‌های تشکیل‌دهنده شاخص رشد:</span>
            </h4>
            <span className="text-[10px] text-[#8a8a8a] font-mono">وزن‌دهی فرمول</span>
          </div>

          {/* 1. Productivity Pillar */}
          <div className="space-y-1.5 p-3 rounded-xl bg-black/3 dark:bg-white/3 border border-black/5 dark:border-white/5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-[#1f1f1f] dark:text-white flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#0078d4]" />
                <span>اقدام و بهره‌وری (وزن ۳۵٪)</span>
              </span>
              <span className="font-bold font-mono text-[#0078d4] dark:text-[#60a5fa]">
                {subScores.productivity.score}٪
              </span>
            </div>
            <div className="w-full h-2 rounded-full bg-black/5 dark:bg-white/5 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#0078d4] to-[#60a5fa] rounded-full transition-all duration-700"
                style={{ width: `${subScores.productivity.score}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[11px] text-[#8a8a8a]">
              <span>تکمیل وظایف: {subScores.productivity.completedTasks} از {subScores.productivity.totalTasks}</span>
              <span className="font-mono">تمرکز: {subScores.productivity.focusMinutes} دقیقه</span>
            </div>
          </div>

          {/* 2. Learning Pillar */}
          <div className="space-y-1.5 p-3 rounded-xl bg-black/3 dark:bg-white/3 border border-black/5 dark:border-white/5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-[#1f1f1f] dark:text-white flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-purple-500" />
                <span>یادگیری و تسلط علمی (وزن ۳۵٪)</span>
              </span>
              <span className="font-bold font-mono text-purple-600 dark:text-purple-400">
                {subScores.learning.score}٪
              </span>
            </div>
            <div className="w-full h-2 rounded-full bg-black/5 dark:bg-white/5 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-purple-500 to-indigo-400 rounded-full transition-all duration-700"
                style={{ width: `${subScores.learning.score}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[11px] text-[#8a8a8a]">
              <span>میانگین تسلط سرفصل‌ها: {subScores.learning.averageMastery}٪</span>
              <span className="font-mono">{subScores.learning.totalSessions} جلسه مطالعه</span>
            </div>
          </div>

          {/* 3. Well-Being Pillar */}
          <div className="space-y-1.5 p-3 rounded-xl bg-black/3 dark:bg-white/3 border border-black/5 dark:border-white/5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-[#1f1f1f] dark:text-white flex items-center gap-1.5">
                <Smile className="w-3.5 h-3.5 text-emerald-500" />
                <span>تأمل و سلامت روانی (وزن ۳۰٪)</span>
              </span>
              <span className="font-bold font-mono text-emerald-600 dark:text-emerald-400">
                {subScores.wellBeing.score}٪
              </span>
            </div>
            <div className="w-full h-2 rounded-full bg-black/5 dark:bg-white/5 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-700"
                style={{ width: `${subScores.wellBeing.score}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[11px] text-[#8a8a8a]">
              <span>میانگین خلق‌وخو: {subScores.wellBeing.averageMood} از ۵</span>
              <span className="font-mono">استریک: 🔥 {subScores.wellBeing.journalStreak} روز</span>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};
