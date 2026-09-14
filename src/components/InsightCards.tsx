import React from 'react';
import {
  Lightbulb,
  TrendingUp,
  Zap,
  Flame,
} from 'lucide-react';
import { Card } from './Card';
import { Badge } from './Badge';
import { CrossModuleCorrelation } from '../types/database';

export interface InsightCardsProps {
  insights: CrossModuleCorrelation[];
}

export const InsightCards: React.FC<InsightCardsProps> = ({ insights }) => {
  if (insights.length === 0) return null;

  return (
    <div className="space-y-3 text-start select-none">
      <div className="flex items-center justify-between">
        <h4 className="font-bold text-xs text-[#8a8a8a] flex items-center gap-1.5">
          <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
          <span>بینش‌های تحلیلی و الگوهای رفتاری هوشمند:</span>
        </h4>
        <span className="text-[10px] text-[#8a8a8a] font-mono">الگوریتم همبستگی فرامدولار</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
        {insights.map((ins, idx) => {
          const isHigh = ins.significance === 'high';

          return (
            <Card
              key={idx}
              variant="acrylic"
              className={`p-4 space-y-2.5 border transition-all hover:border-[#0078d4]/40 ${
                isHigh ? 'border-amber-500/20 bg-amber-500/5' : 'border-black/8 dark:border-white/8'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-bold text-xs text-[#1f1f1f] dark:text-white flex items-center gap-1.5 truncate">
                  {ins.correlationType === 'energy_vs_output' ? (
                    <Zap className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                  ) : ins.correlationType === 'focus_vs_mood' ? (
                    <Flame className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                  ) : (
                    <TrendingUp className="w-3.5 h-3.5 text-[#0078d4] shrink-0" />
                  )}
                  <span className="truncate">{ins.description}</span>
                </span>

                <Badge variant={isHigh ? 'warning' : 'neutral'} size="sm" className="shrink-0 text-[10px]">
                  {isHigh ? 'تاثیر بالا' : 'متعادل'}
                </Badge>
              </div>

              <p className="text-xs text-[#616161] dark:text-[#adadad] leading-relaxed">
                {ins.insightMessage}
              </p>
            </Card>
          );
        })}
      </div>
    </div>
  );
};
