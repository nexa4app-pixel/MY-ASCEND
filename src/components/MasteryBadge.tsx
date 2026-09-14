import React from 'react';
import { Sparkles, Brain, Award, CheckCircle2, Circle } from 'lucide-react';
import { MasteryTier } from '../types/database';

export interface MasteryBadgeProps {
  level: number;
  tier: MasteryTier;
  retentionPercent?: number;
  showPercent?: boolean;
  size?: 'sm' | 'md';
}

const TIER_CONFIG: Record<
  MasteryTier,
  {
    faLabel: string;
    icon: React.ComponentType<{ className?: string }>;
    bgClass: string;
    textClass: string;
    borderClass: string;
  }
> = {
  unstudied: {
    faLabel: 'مطالعه‌نشده',
    icon: Circle,
    bgClass: 'bg-neutral-500/10',
    textClass: 'text-neutral-500',
    borderClass: 'border-neutral-500/20',
  },
  novice: {
    faLabel: 'مبتدی',
    icon: Brain,
    bgClass: 'bg-amber-500/10',
    textClass: 'text-amber-600 dark:text-amber-400',
    borderClass: 'border-amber-500/25',
  },
  competent: {
    faLabel: 'مسلط',
    icon: CheckCircle2,
    bgClass: 'bg-blue-500/10',
    textClass: 'text-[#0078d4] dark:text-[#60a5fa]',
    borderClass: 'border-blue-500/25',
  },
  proficient: {
    faLabel: 'پیشرفته',
    icon: Award,
    bgClass: 'bg-purple-500/10',
    textClass: 'text-purple-600 dark:text-purple-400',
    borderClass: 'border-purple-500/25',
  },
  mastered: {
    faLabel: 'استاد',
    icon: Sparkles,
    bgClass: 'bg-emerald-500/10',
    textClass: 'text-emerald-600 dark:text-emerald-400',
    borderClass: 'border-emerald-500/25',
  },
};

export const MasteryBadge: React.FC<MasteryBadgeProps> = ({
  level,
  tier,
  retentionPercent,
  showPercent = true,
  size = 'sm',
}) => {
  const config = TIER_CONFIG[tier] || TIER_CONFIG.unstudied;
  const Icon = config.icon;

  const titleTooltip =
    retentionPercent !== undefined
      ? `سطح تسلط: ${level}% (${config.faLabel}) | ماندگاری حافظه: ${retentionPercent}%`
      : `سطح تسلط: ${level}% (${config.faLabel})`;

  return (
    <span
      title={titleTooltip}
      className={`inline-flex items-center gap-1 rounded-full font-medium border select-none transition-all ${
        config.bgClass
      } ${config.textClass} ${config.borderClass} ${
        size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs'
      }`}
    >
      <Icon className={size === 'sm' ? 'w-2.5 h-2.5' : 'w-3.5 h-3.5'} />
      <span>{config.faLabel}</span>
      {showPercent && (
        <span className="font-mono font-bold opacity-90">
          {Math.round(level)}٪
        </span>
      )}
    </span>
  );
};
