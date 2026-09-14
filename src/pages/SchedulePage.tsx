import React from 'react';
import { PageHeader } from '../components/PageHeader';
import { Badge } from '../components/Badge';
import { ScheduleCalendar } from '../components/ScheduleCalendar';

export const SchedulePage: React.FC = () => {
  return (
    <div className="max-w-6xl mx-auto space-y-5 select-none">
      {/* Page Header */}
      <PageHeader
        title="تقویم و بلوک‌های زمانی (Time-Blocking)"
        description="برنامه‌ریزی زمانی روزانه و هفتگی متصل به وظایف و سرفصل‌های درسی"
        badge={<Badge variant="accent" size="md">Phase 06 Active</Badge>}
      />

      {/* Schedule Calendar View */}
      <ScheduleCalendar />
    </div>
  );
};
