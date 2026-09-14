import React from 'react';
import { Target, Clock, ShieldAlert } from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { Card } from '../components/Card';
import { Badge } from '../components/Badge';

export const ManagementPage: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <PageHeader
        title="مدیریت، چشم‌انداز، اهداف و پروژه‌ها"
        description="Visions, Goals, Projects, Tasks & Habits"
        badge={<Badge variant="neutral" size="md">Phase 03 Module</Badge>}
      />

      <Card variant="acrylic" className="flex flex-col items-center justify-center p-12 text-center">
        <div className="w-16 h-16 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center mb-4 shadow-sm">
          <Target className="w-8 h-8" />
        </div>

        <h3 className="text-lg font-bold text-[#1f1f1f] dark:text-white mb-2">
          ماژول مدیریت اهداف و پروژه‌ها در فاز ۰۳ فعال خواهد شد
        </h3>

        <p className="text-sm text-[#616161] dark:text-[#adadad] max-w-md mb-6 leading-relaxed">
          جداول پایگاه داده شامل <code>visions</code>, <code>goals</code>, <code>projects</code>, <code>tasks</code> و <code>habits</code> در مایگریشن شماره ۰۰۲ تعبیه شده و به صورت ایزوله منتظر فاز بعدی هستند.
        </p>

        <div className="flex items-center gap-2 text-xs text-[#8a8a8a] bg-black/5 dark:bg-white/5 px-4 py-2 rounded-md border border-black/5 dark:border-white/5">
          <ShieldAlert className="w-4 h-4 text-amber-500" />
          <span>Strict Phase Boundary: Phase 03 Target</span>
          <span className="text-black/20 dark:text-white/20">•</span>
          <Clock className="w-3.5 h-3.5" />
          <span>Database Schema Ready</span>
        </div>
      </Card>
    </div>
  );
};
