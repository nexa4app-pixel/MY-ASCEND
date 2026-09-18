import React from 'react';
import { Heart, Clock, ShieldAlert } from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { Card } from '../components/Card';
import { Badge } from '../components/Badge';
import { useTranslation } from '../store/useLocaleStore';

export const LifePage: React.FC = () => {
  const { t, isRtl } = useTranslation();

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <PageHeader
        title={t('routes.life')}
        description={isRtl ? 'سبک زندگی، ژورنال روزانه و صندوقچه خاطرات' : 'Daily Reflections, Memories & Personal Vault'}
        badge={<Badge variant="neutral" size="md">Phase 07</Badge>}
      />

      <Card variant="acrylic" className="flex flex-col items-center justify-center p-12 text-center">
        <div className="w-16 h-16 rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center mb-4 shadow-sm">
          <Heart className="w-8 h-8" />
        </div>

        <h3 className="text-lg font-bold text-[#1f1f1f] dark:text-[#f5f6f8] mb-2">
          {isRtl ? 'ماژول یادداشت‌های روزانه و خاطرات در فاز ۰۷ فعال خواهد شد' : 'Daily Reflections & Memory Vault Module Target: Phase 07'}
        </h3>

        <p className="text-sm text-[#5c6270] dark:text-[#9fa6b2] max-w-md mb-6 leading-relaxed">
          {isRtl
            ? 'جداول پایگاه داده شامل ژورنال‌های شخصی (journals) و خاطرات ارزشمند (memories) در ساختار دیتابیس تعبیه شده و ایزوله نگهداری می‌شوند.'
            : 'Database tables for personal journals and valuable memories are structured and ready in Migration 002.'}
        </p>

        <div className="flex items-center gap-2 text-xs text-[#878e9c] bg-black/4 dark:bg-white/5 px-4 py-2 rounded-xl border border-black/5 dark:border-white/8">
          <ShieldAlert className="w-4 h-4 text-amber-500" />
          <span>Strict Phase Boundary: Phase 07 Target</span>
          <span className="text-black/20 dark:text-white/20">•</span>
          <Clock className="w-3.5 h-3.5" />
          <span>Database Schema Ready</span>
        </div>
      </Card>
    </div>
  );
};
