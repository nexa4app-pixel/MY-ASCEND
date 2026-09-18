import React from 'react';
import { PageHeader } from '../components/PageHeader';
import { Badge } from '../components/Badge';
import { ScheduleCalendar } from '../components/ScheduleCalendar';
import { useTranslation } from '../store/useLocaleStore';

export const SchedulePage: React.FC = () => {
  const { t } = useTranslation();

  return (
    <div className="max-w-6xl mx-auto space-y-5 select-none">
      {/* Page Header */}
      <PageHeader
        title={t('schedule.title')}
        description={t('schedule.description')}
        badge={<Badge variant="accent" size="md">{t('schedule.badge')}</Badge>}
      />

      {/* Schedule Calendar View */}
      <ScheduleCalendar />
    </div>
  );
};
