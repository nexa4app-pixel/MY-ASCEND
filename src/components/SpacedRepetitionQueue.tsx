import React, { useState, useEffect, useCallback } from 'react';
import {
  RotateCcw,
  Sparkles,
  AlertCircle,
  Clock,
} from 'lucide-react';
import { Card } from './Card';
import { Badge } from './Badge';
import { Button } from './Button';
import { MasteryBadge } from './MasteryBadge';
import {
  masteryService,
  DueTopicItem,
} from '../services/masteryService';

export interface SpacedRepetitionQueueProps {
  onOpenLogSession?: (topicId: string, subjectId: string) => void;
  onQueueUpdated?: () => void;
}

export const SpacedRepetitionQueue: React.FC<SpacedRepetitionQueueProps> = ({
  onOpenLogSession,
  onQueueUpdated,
}) => {
  const [dueItems, setDueItems] = useState<DueTopicItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [reviewingTopicId, setReviewingTopicId] = useState<string | null>(null);

  const loadQueue = useCallback(async () => {
    setIsLoading(true);
    try {
      const items = await masteryService.getDueForReviewToday();
      setDueItems(items);
    } catch (err) {
      console.error('Failed to load spaced repetition queue:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadQueue();
  }, [loadQueue]);

  const handleQuickGrade = async (topicId: string, grade: number) => {
    setReviewingTopicId(topicId);
    try {
      await masteryService.processReviewSM2(topicId, grade);
      await loadQueue();
      onQueueUpdated?.();
    } catch (err) {
      console.error('Failed to grade topic review:', err);
    } finally {
      setReviewingTopicId(null);
    }
  };

  return (
    <div className="space-y-3 select-none text-start">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-[#1f1f1f] dark:text-white flex items-center gap-2">
            <RotateCcw className="w-4 h-4 text-[#0078d4]" />
            <span>صف مرور فاصله‌دار امروز (Due for Review Today)</span>
            <Badge variant="accent" size="sm">
              {dueItems.length} مبحث
            </Badge>
          </h3>
          <p className="text-xs text-[#8a8a8a] mt-0.5">
            مباحثی که بر اساس منحنی فراموشی ابینگهاوس و الگوریتم SM-2 به موعد مرور رسیده‌اند.
          </p>
        </div>

        <Button
          variant="subtle"
          size="sm"
          onClick={loadQueue}
          disabled={isLoading}
          aria-label="بروزرسانی صف"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </Button>
      </div>

      {isLoading ? (
        <Card variant="acrylic" className="p-8 text-center text-xs text-[#8a8a8a]">
          در حال محاسبه فواصل زمانی مرور و ماندگاری حافظه...
        </Card>
      ) : dueItems.length === 0 ? (
        <Card variant="acrylic" className="p-8 text-center space-y-2 border-emerald-500/20 bg-emerald-500/5">
          <Sparkles className="w-10 h-10 text-emerald-500 mx-auto" />
          <h4 className="font-bold text-sm text-emerald-600 dark:text-emerald-400">
            صف مرور خالی است! 🎉
          </h4>
          <p className="text-xs text-[#8a8a8a] max-w-sm mx-auto">
            تمام سرفصل‌های برنامه‌ریزی‌شده برای امروز مرور شده‌اند. ماندگاری مفاهیم در حافظه بلندمدت در وضعیت مطلوبی قرار دارد.
          </p>
        </Card>
      ) : (
        <div className="space-y-2.5">
          {dueItems.map((item) => {
            const isProcessing = reviewingTopicId === item.topicId;

            return (
              <Card
                key={item.topicId}
                variant="acrylic"
                className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border border-black/8 dark:border-white/8 hover:border-black/15 dark:hover:border-white/15 transition-all"
              >
                {/* Topic info, subject tag & retention */}
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-sm text-[#1f1f1f] dark:text-white">
                      {item.topicTitle}
                    </span>

                    <span
                      className="px-2 py-0.5 rounded-full text-[10px] font-semibold text-white"
                      style={{ backgroundColor: item.subjectColor }}
                    >
                      {item.subjectName}
                    </span>

                    <MasteryBadge
                      level={item.masteryRecord.level}
                      tier={item.masteryRecord.tier}
                      retentionPercent={item.retentionPercent}
                    />

                    {item.overdueDays > 0 ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-red-600 dark:text-red-400 bg-red-500/10 px-2 py-0.5 rounded-full">
                        <AlertCircle className="w-2.5 h-2.5" />
                        <span>{item.overdueDays} روز تاخیر</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                        <Clock className="w-2.5 h-2.5" />
                        <span>امروز</span>
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-4 text-[11px] text-[#8a8a8a]">
                    <span>تکرارهای موفق: <strong className="font-mono text-[#1f1f1f] dark:text-white">{item.masteryRecord.repetitions}</strong></span>
                    <span>ضریب سهولت (EF): <strong className="font-mono text-[#1f1f1f] dark:text-white">{item.masteryRecord.ease_factor}</strong></span>
                    <span>ماندگاری تخمینی حافظه: <strong className="font-mono text-emerald-600 dark:text-emerald-400">{item.retentionPercent}٪</strong></span>
                  </div>
                </div>

                {/* Instant SM-2 Grading Action */}
                <div className="flex items-center gap-1.5 flex-wrap self-end sm:self-center">
                  <span className="text-[10px] text-[#8a8a8a] hidden md:inline">ثبت بازخورد:</span>

                  <div className="flex items-center gap-1">
                    {[
                      { grade: 1, label: 'فراموشی (۱)', bg: 'hover:bg-red-500/20 text-red-600' },
                      { grade: 3, label: 'دشوار (۳)', bg: 'hover:bg-amber-500/20 text-amber-600' },
                      { grade: 4, label: 'خوب (۴)', bg: 'hover:bg-blue-500/20 text-blue-600' },
                      { grade: 5, label: 'عالی (۵)', bg: 'hover:bg-emerald-500/20 text-emerald-600' },
                    ].map((g) => (
                      <Button
                        key={g.grade}
                        variant="subtle"
                        size="sm"
                        disabled={isProcessing}
                        onClick={() => handleQuickGrade(item.topicId, g.grade)}
                        className={`text-[10px] px-2 py-0.5 h-6 font-medium ${g.bg}`}
                        title={`ثبت امتیاز یادآوری ${g.grade}`}
                      >
                        {g.label}
                      </Button>
                    ))}
                  </div>

                  {onOpenLogSession && (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => onOpenLogSession(item.topicId, item.subjectId)}
                      className="text-[11px] h-6 px-2 ms-1"
                    >
                      جلسه تفصیلی
                    </Button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};
