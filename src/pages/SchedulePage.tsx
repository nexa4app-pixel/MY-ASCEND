import React from 'react';
import { PageHeader } from '../components/PageHeader';
import { Badge } from '../components/Badge';
import { UnifiedSchedulePage } from './UnifiedSchedulePage';
import { useTranslation } from '../store/useLocaleStore';

export const SchedulePage: React.FC = () => {
  const { t } = useTranslation();

  return (
    <div className="max-w-7xl mx-auto space-y-4 select-none">
      {/* Page Header */}
      <PageHeader
        title={t('schedule.title')}
        description={t('schedule.description')}
        badge={<Badge variant="accent" size="md">{t('schedule.badge')}</Badge>}
      />

      {/* Unified Schedule & Task Engine */}
      <UnifiedSchedulePage />
    </div>
  );
};

