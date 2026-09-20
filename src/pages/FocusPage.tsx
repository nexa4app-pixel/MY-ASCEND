import React, { useState, useEffect, useCallback } from 'react';
import {
  Flame,
  Clock,
  CheckCircle2,
  History,
  Trash2,
  RefreshCw,
  Lightbulb,
} from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { Card } from '../components/Card';
import { Badge } from '../components/Badge';
import { Button } from '../components/Button';
import { FocusTimer } from '../components/FocusTimer';
import { focusService, FocusStats } from '../services/focusService';
import { FocusSession, FocusDistraction } from '../types/database';
import { useTranslation } from '../store/useLocaleStore';

export const FocusPage: React.FC = () => {
  const { t, isRtl } = useTranslation();
  const [stats, setStats] = useState<FocusStats | null>(null);
  const [sessions, setSessions] = useState<FocusSession[]>([]);
  const [distractions, setDistractions] = useState<FocusDistraction[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [statData, sessionList, distractList] = await Promise.all([
        focusService.getFocusStats(),
        focusService.getFocusSessions({ limit: 30 }),
        focusService.getDistractions(null, 30),
      ]);
      setStats(statData);
      setSessions(sessionList);
      setDistractions(distractList);
    } catch (err) {
      console.error('Failed to load focus data:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleDeleteSession = async (id: string) => {
    if (!window.confirm(isRtl ? 'آیا از حذف این جلسه تمرکز اطمینان دارید؟' : 'Are you sure you want to delete this session?')) return;
    try {
      await focusService.deleteFocusSession(id);
      loadData();
    } catch (err) {
      console.error('Failed to delete focus session:', err);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 select-none">
      {/* Page Header */}
      <PageHeader
        title={t('focus.title')}
        description={t('focus.description')}
        badge={<Badge variant="accent" size="md">{t('focus.badge')}</Badge>}
        actions={
          <Button variant="subtle" size="sm" onClick={loadData} disabled={isLoading} aria-label="Refresh">
            <RefreshCw className="w-3.5 h-3.5" />
          </Button>
        }
      />

      {/* Focus Statistics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card variant="acrylic" className="p-3 text-center space-y-1">
          <span className="text-[11px] text-[#8a8a8a] flex items-center justify-center gap-1">
            <Clock className="w-3.5 h-3.5 text-[#0078d4]" />
            <span>{t('focus.todayFocusTime')}</span>
          </span>
          <div className="text-xl font-bold text-[#0078d4] dark:text-[#60a5fa] font-mono">
            {stats
              ? isRtl
                ? `${Math.floor(stats.todayFocusedMinutes / 60)}س ${stats.todayFocusedMinutes % 60}د`
                : `${Math.floor(stats.todayFocusedMinutes / 60)}h ${stats.todayFocusedMinutes % 60}m`
              : '0m'}
          </div>
        </Card>

        <Card variant="acrylic" className="p-3 text-center space-y-1">
          <span className="text-[11px] text-[#8a8a8a] flex items-center justify-center gap-1">
            <Flame className="w-3.5 h-3.5 text-amber-500" />
            <span>{t('focus.completedRounds')}</span>
          </span>
          <div className="text-xl font-bold text-amber-500 font-mono">
            {stats?.completedSessionsCount ?? 0}
          </div>
        </Card>

        <Card variant="acrylic" className="p-3 text-center space-y-1">
          <span className="text-[11px] text-[#8a8a8a] flex items-center justify-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            <span>{isRtl ? 'نرخ تکمیل' : 'Completion'}</span>
          </span>
          <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400 font-mono">
            {stats?.completionRate ?? 100}%
          </div>
        </Card>

        <Card variant="acrylic" className="p-3 text-center space-y-1">
          <span className="text-[11px] text-[#8a8a8a] flex items-center justify-center gap-1">
            <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
            <span>{isRtl ? 'افکار مزاحم ثبت‌شده' : 'Distractions'}</span>
          </span>
          <div className="text-xl font-bold text-amber-500 font-mono">
            {stats?.totalDistractionCount ?? stats?.totalInterruptionCount ?? 0}
          </div>
        </Card>
      </div>

      {/* Hero Focus Timer */}
      <FocusTimer />

      {/* Recent Focus Sessions History */}
      <Card variant="acrylic" className="p-4 space-y-3 text-start">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-[#1f1f1f] dark:text-white flex items-center gap-2">
            <History className="w-4 h-4 text-[#0078d4]" />
            <span>{t('focus.historyTitle')}</span>
          </h3>
          <span className="text-xs text-[#8a8a8a] font-mono">
            {sessions.length} {isRtl ? 'جلسه ثبت‌شده' : 'recorded sessions'}
          </span>
        </div>

        {sessions.length === 0 ? (
          <p className="text-xs text-[#8a8a8a] text-center py-8">
            {t('focus.noHistory')}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-black/8 dark:border-white/8 text-[#8a8a8a]">
                  <th className="text-start py-2 font-medium">{isRtl ? 'تاریخ و زمان' : 'Date & Time'}</th>
                  <th className="text-start py-2 font-medium">{isRtl ? 'نوع' : 'Type'}</th>
                  <th className="text-start py-2 font-medium">{isRtl ? 'موضوع متصل' : 'Linked Entity'}</th>
                  <th className="text-center py-2 font-medium">{isRtl ? 'مدت واقعی' : 'Actual Duration'}</th>
                  <th className="text-center py-2 font-medium">{isRtl ? 'حواس‌پرتی' : 'Distractions'}</th>
                  <th className="text-center py-2 font-medium">{isRtl ? 'انرژی' : 'Energy'}</th>
                  <th className="text-center py-2 font-medium">{isRtl ? 'وضعیت' : 'Status'}</th>
                  <th className="text-start py-2 font-medium">{isRtl ? 'یادداشت' : 'Notes'}</th>
                  <th className="text-center py-2 font-medium">{isRtl ? 'عملیات' : 'Action'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5 dark:divide-white/5">
                {sessions.map((s) => {
                  const typeLabels: Record<string, string> = {
                    pomodoro: isRtl ? 'پومودورو' : 'Pomodoro',
                    deep_work_50: isRtl ? 'کار عمیق ۵۰د' : 'Deep Work 50m',
                    deep_work_90: isRtl ? 'کار عمیق ۹۰د' : 'Deep Work 90m',
                    custom: isRtl ? 'سفارشی' : 'Custom',
                    stopwatch: isRtl ? 'کرنومتر' : 'Stopwatch',
                    countdown: isRtl ? 'شمارش معکوس' : 'Countdown',
                  };
                  const isSuccess = s.completed_status === 'completed';
                  const entityLabel = s.task_title
                    ? `${isRtl ? 'وظیفه' : 'Task'}: ${s.task_title}`
                    : s.topic_title
                    ? `${isRtl ? 'مبحث' : 'Topic'}: ${s.topic_title}`
                    : isRtl ? 'عمومی' : 'General';

                  return (
                    <tr key={s.id} className="hover:bg-black/3 dark:hover:bg-white/3">
                      <td className="py-2.5 text-[#8a8a8a] font-mono">
                        {new Date(s.started_at).toLocaleTimeString(isRtl ? 'fa-IR' : 'en-US', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}{' '}
                        - {new Date(s.started_at).toLocaleDateString(isRtl ? 'fa-IR' : 'en-US')}
                      </td>
                      <td className="py-2.5 font-semibold text-[#1f1f1f] dark:text-white">
                        {typeLabels[s.session_type] || s.session_type}
                      </td>
                      <td className="py-2.5 text-[#0078d4] dark:text-[#60a5fa] truncate max-w-[160px]">
                        {entityLabel}
                      </td>
                      <td className="py-2.5 text-center font-mono font-bold">
                        {s.actual_duration_minutes} {isRtl ? 'دقیقه' : 'min'}
                      </td>
                      <td className="py-2.5 text-center font-mono">
                        {(s.distractions_count || s.interruption_count || 0) > 0 ? (
                          <span className="text-amber-600 font-bold">
                            {s.distractions_count || s.interruption_count}
                          </span>
                        ) : (
                          '0'
                        )}
                      </td>
                      <td className="py-2.5 text-center">
                        <span className="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-500 text-[10px] font-bold">
                          ⚡ {s.energy_level || 3}/4
                        </span>
                      </td>
                      <td className="py-2.5 text-center">
                        <Badge variant={isSuccess ? 'success' : 'neutral'} size="sm">
                          {isSuccess ? (isRtl ? 'تکمیل‌شده' : 'Completed') : (isRtl ? 'انصراف' : 'Abandoned')}
                        </Badge>
                      </td>
                      <td className="py-2.5 text-[#8a8a8a] max-w-[140px] truncate">
                        {s.notes || '—'}
                      </td>
                      <td className="py-2.5 text-center">
                        <button
                          onClick={() => handleDeleteSession(s.id)}
                          className="p-1 text-[#8a8a8a] hover:text-red-500 rounded transition-colors"
                          title={isRtl ? 'حذف جلسه' : 'Delete session'}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Distractions Journal Log */}
      {distractions.length > 0 && (
        <Card variant="acrylic" className="p-4 space-y-3 text-start">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-[#1f1f1f] dark:text-white flex items-center gap-2">
              <Lightbulb className="w-4 h-4 text-amber-500" />
              <span>{t('focus.distractionsHistory')}</span>
            </h3>
            <span className="text-xs text-[#8a8a8a] font-mono">
              {distractions.length} {isRtl ? 'مورد ثبت‌شده' : 'items'}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {distractions.map((d) => (
              <div
                key={d.id}
                className="p-2.5 rounded-xl bg-black/3 dark:bg-white/3 border border-black/5 dark:border-white/5 flex items-start justify-between gap-2"
              >
                <div className="space-y-1">
                  <p className="text-xs font-medium text-[#1f1f1f] dark:text-white">{d.thought}</p>
                  <span className="text-[10px] text-[#8a8a8a] font-mono">
                    {new Date(d.logged_at).toLocaleTimeString(isRtl ? 'fa-IR' : 'en-US', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
};
