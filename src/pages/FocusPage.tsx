import React, { useState, useEffect, useCallback } from 'react';
import {
  Flame,
  Clock,
  CheckCircle2,
  AlertTriangle,
  History,
  Trash2,
  RefreshCw,
} from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { Card } from '../components/Card';
import { Badge } from '../components/Badge';
import { Button } from '../components/Button';
import { FocusTimer } from '../components/FocusTimer';
import { focusService, FocusStats } from '../services/focusService';
import { FocusSession } from '../types/database';

export const FocusPage: React.FC = () => {
  const [stats, setStats] = useState<FocusStats | null>(null);
  const [sessions, setSessions] = useState<FocusSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [statData, sessionList] = await Promise.all([
        focusService.getFocusStats(),
        focusService.getFocusSessions({ limit: 30 }),
      ]);
      setStats(statData);
      setSessions(sessionList);
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
    if (!window.confirm('آیا از انتقال این جلسه تمرکز به زباله‌دان اطمینان دارید؟')) return;
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
        title="موتور تمرکز و تایمر پومودورو"
        description="تایمرهای هوشمند تمرکز عمیق، مدیریت وقفه‌ها و ثبت پیشرفت روزانه"
        badge={<Badge variant="accent" size="md">Phase 06 Active</Badge>}
        actions={
          <Button variant="subtle" size="sm" onClick={loadData} disabled={isLoading} aria-label="بروزرسانی">
            <RefreshCw className="w-3.5 h-3.5" />
          </Button>
        }
      />

      {/* Focus Statistics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card variant="acrylic" className="p-3 text-center space-y-1">
          <span className="text-[11px] text-[#8a8a8a] flex items-center justify-center gap-1">
            <Clock className="w-3.5 h-3.5 text-[#0078d4]" />
            <span>تمرکز امروز</span>
          </span>
          <div className="text-xl font-bold text-[#0078d4] dark:text-[#60a5fa] font-mono">
            {stats ? `${Math.floor(stats.todayFocusedMinutes / 60)}س ${stats.todayFocusedMinutes % 60}د` : '۰د'}
          </div>
        </Card>

        <Card variant="acrylic" className="p-3 text-center space-y-1">
          <span className="text-[11px] text-[#8a8a8a] flex items-center justify-center gap-1">
            <Flame className="w-3.5 h-3.5 text-amber-500" />
            <span>جلسات تکمیل‌شده</span>
          </span>
          <div className="text-xl font-bold text-amber-500 font-mono">
            {stats?.completedSessionsCount ?? 0}
          </div>
        </Card>

        <Card variant="acrylic" className="p-3 text-center space-y-1">
          <span className="text-[11px] text-[#8a8a8a] flex items-center justify-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            <span>نرخ تکمیل</span>
          </span>
          <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400 font-mono">
            {stats?.completionRate ?? 100}٪
          </div>
        </Card>

        <Card variant="acrylic" className="p-3 text-center space-y-1">
          <span className="text-[11px] text-[#8a8a8a] flex items-center justify-center gap-1">
            <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
            <span>کل حواس‌پرتی‌ها</span>
          </span>
          <div className="text-xl font-bold text-red-500 font-mono">
            {stats?.totalInterruptionCount ?? 0}
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
            <span>تاریخچه جلسات تمرکز اخیر</span>
          </h3>
          <span className="text-xs text-[#8a8a8a] font-mono">{sessions.length} جلسه ثبت‌شده</span>
        </div>

        {sessions.length === 0 ? (
          <p className="text-xs text-[#8a8a8a] text-center py-8">
            هنوز جلسه تمرکزی ثبت نشده است. تایمر را شروع کنید تا رکورد شما ثبت شود.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-black/8 dark:border-white/8 text-[#8a8a8a]">
                  <th className="text-start py-2 font-medium">تاریخ و زمان</th>
                  <th className="text-start py-2 font-medium">نوع</th>
                  <th className="text-start py-2 font-medium">موضوع متصل</th>
                  <th className="text-center py-2 font-medium">مدت واقعی</th>
                  <th className="text-center py-2 font-medium">حواس‌پرتی</th>
                  <th className="text-center py-2 font-medium">وضعیت</th>
                  <th className="text-start py-2 font-medium">یادداشت</th>
                  <th className="text-center py-2 font-medium">عملیات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5 dark:divide-white/5">
                {sessions.map((s) => {
                  const typeLabels: Record<string, string> = {
                    pomodoro: 'پومودورو',
                    stopwatch: 'کرنومتر',
                    countdown: 'شمارش معکوس',
                  };
                  const isSuccess = s.completed_status === 'completed';
                  const entityLabel = s.task_title
                    ? `وظیفه: ${s.task_title}`
                    : s.topic_title
                    ? `مبحث: ${s.topic_title}`
                    : 'عمومی';

                  return (
                    <tr key={s.id} className="hover:bg-black/3 dark:hover:bg-white/3">
                      <td className="py-2.5 text-[#8a8a8a] font-mono">
                        {new Date(s.started_at).toLocaleTimeString('fa-IR', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}{' '}
                        - {new Date(s.started_at).toLocaleDateString('fa-IR')}
                      </td>
                      <td className="py-2.5 font-semibold text-[#1f1f1f] dark:text-white">
                        {typeLabels[s.session_type] || s.session_type}
                      </td>
                      <td className="py-2.5 text-[#0078d4] dark:text-[#60a5fa] truncate max-w-[160px]">
                        {entityLabel}
                      </td>
                      <td className="py-2.5 text-center font-mono font-bold">
                        {s.actual_duration_minutes} دقیقه
                      </td>
                      <td className="py-2.5 text-center font-mono">
                        {s.interruption_count > 0 ? (
                          <span className="text-amber-600 font-bold">{s.interruption_count}</span>
                        ) : (
                          '۰'
                        )}
                      </td>
                      <td className="py-2.5 text-center">
                        <Badge variant={isSuccess ? 'success' : 'neutral'} size="sm">
                          {isSuccess ? 'تکمیل‌شده' : 'انصراف'}
                        </Badge>
                      </td>
                      <td className="py-2.5 text-[#8a8a8a] max-w-[140px] truncate">
                        {s.notes || '—'}
                      </td>
                      <td className="py-2.5 text-center">
                        <button
                          onClick={() => handleDeleteSession(s.id)}
                          className="p-1 text-[#8a8a8a] hover:text-red-500 rounded"
                          title="حذف جلسه"
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
    </div>
  );
};
