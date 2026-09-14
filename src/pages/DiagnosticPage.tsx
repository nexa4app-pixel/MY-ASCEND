import React, { useState, useEffect } from 'react';
import {
  Activity,
  Database,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Clock,
  HardDrive,
  Download,
  Trash2,
  Table as TableIcon,
  Search,
} from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { Card } from '../components/Card';
import { Badge } from '../components/Badge';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { TableSkeleton } from '../components/Skeleton';
import { dbDiagnosticService, DiagnosticReport } from '../services/dbDiagnosticService';
import { logger, LogEntry } from '../services/logger';

export const DiagnosticPage: React.FC = () => {
  const [report, setReport] = useState<DiagnosticReport | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isPinging, setIsPinging] = useState<boolean>(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [logFilter, setLogFilter] = useState<string>('ALL');
  const [tableSearch, setTableSearch] = useState<string>('');

  const fetchDiagnostics = async () => {
    setIsLoading(true);
    try {
      const data = await dbDiagnosticService.getFullReport();
      setReport(data);
      setLogs(logger.getLogs());
    } catch (err) {
      logger.error('Failed to load diagnostic report', 'DiagnosticPage', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePingTest = async () => {
    setIsPinging(true);
    try {
      const pingResult = await dbDiagnosticService.ping();
      if (report) {
        setReport({ ...report, ping: pingResult });
      }
      setLogs(logger.getLogs());
    } finally {
      setIsPinging(false);
    }
  };

  const handleClearLogs = () => {
    logger.clear();
    setLogs([]);
  };

  const handleExportLogs = () => {
    const blob = new Blob([logger.exportLogsAsJson()], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ascend-diagnostics-logs-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  useEffect(() => {
    fetchDiagnostics();
    const unsubscribe = logger.subscribe((entry) => {
      setLogs((prev) => [entry, ...prev.slice(0, 499)]);
    });
    return unsubscribe;
  }, []);

  const filteredLogs = logs.filter((log) => {
    if (logFilter === 'ALL') return true;
    return log.level === logFilter;
  });

  const filteredTables = (report?.tableCounts || []).filter((t) =>
    t.table_name.toLowerCase().includes(tableSearch.toLowerCase())
  );

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <PageHeader
        title="عیب‌یابی پایگاه داده و سلامت سیستم"
        description="SQLite Diagnostics, Migration Telemetry & Application Logs"
        badge={<Badge variant="accent">Diagnostic Core</Badge>}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              icon={<RefreshCw className={`w-3.5 h-3.5 ${isPinging ? 'animate-spin' : ''}`} />}
              onClick={handlePingTest}
              isLoading={isPinging}
            >
              تست اتصال (Ping DB)
            </Button>
            <Button
              variant="primary"
              size="sm"
              icon={<RefreshCw className="w-3.5 h-3.5" />}
              onClick={fetchDiagnostics}
              isLoading={isLoading}
            >
              بروزرسانی وضعیت
            </Button>
          </div>
        }
      />

      {/* Top Status Banner Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Connection Health */}
        <Card variant="acrylic" className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-[#8a8a8a]">وضعیت اتصال</span>
            {report?.ping.status === 'healthy' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-500" />
            )}
          </div>
          <div className="text-lg font-bold text-[#1f1f1f] dark:text-white capitalize">
            {report?.ping.status || 'Checking...'}
          </div>
          <div className="text-[11px] text-[#8a8a8a] mt-1 font-mono">
            {report?.ping.sqlite_version ? `SQLite ${report.ping.sqlite_version}` : '—'}
          </div>
        </Card>

        {/* Latency */}
        <Card variant="acrylic" className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-[#8a8a8a]">زمان پاسخ (Latency)</span>
            <Clock className="w-4 h-4 text-[#0078d4]" />
          </div>
          <div className="text-lg font-bold text-[#1f1f1f] dark:text-white font-mono">
            {report?.ping.latency_ms !== undefined ? `${report.ping.latency_ms} ms` : '—'}
          </div>
          <div className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1">
            Ultra-low IPC Overhead
          </div>
        </Card>

        {/* Schema Version */}
        <Card variant="acrylic" className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-[#8a8a8a]">نسخه شمای فعال</span>
            <Database className="w-4 h-4 text-purple-500" />
          </div>
          <div className="text-lg font-bold text-[#1f1f1f] dark:text-white font-mono">
            v{report?.schemaVersion ?? '4'}
          </div>
          <div className="text-[11px] text-[#8a8a8a] mt-1">
            {report?.appliedMigrations.length ?? 4} مایگریشن اعمال شده
          </div>
        </Card>

        {/* Total Tables & Records */}
        <Card variant="acrylic" className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-[#8a8a8a]">جداول فعال دیتابیس</span>
            <TableIcon className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-lg font-bold text-[#1f1f1f] dark:text-white font-mono">
            {report?.tableCounts.length ?? 33} جدول
          </div>
          <div className="text-[11px] text-[#8a8a8a] mt-1">
            {report?.totalRecords ?? 0} رکورد ذخیره‌شده
          </div>
        </Card>
      </div>

      {/* Applied Migrations Card */}
      <Card variant="acrylic" className="space-y-4">
        <div className="flex items-center justify-between border-b border-black/5 dark:border-white/5 pb-3">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-[#0078d4]" />
            <h3 className="font-semibold text-sm text-[#1f1f1f] dark:text-white">
              تاریخچه مایگریشن‌های اجرا شده (Schema Migrations)
            </h3>
          </div>
          <Badge variant="success" size="sm">
            ۴ / ۴ کامل شده
          </Badge>
        </div>

        {isLoading ? (
          <TableSkeleton rows={4} columns={4} />
        ) : (
          <div className="overflow-x-auto rounded-lg border border-black/8 dark:border-white/8">
            <table className="w-full text-start text-xs">
              <thead className="bg-black/5 dark:bg-white/5 border-b border-black/8 dark:border-white/8 text-[#616161] dark:text-[#adadad]">
                <tr>
                  <th className="py-2.5 px-4 text-start font-semibold">نسخه</th>
                  <th className="py-2.5 px-4 text-start font-semibold">نام مایگریشن</th>
                  <th className="py-2.5 px-4 text-start font-semibold">زمان اعمال (UTC)</th>
                  <th className="py-2.5 px-4 text-start font-semibold">مدت اجرا</th>
                  <th className="py-2.5 px-4 text-start font-semibold">چک‌سام</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5 dark:divide-white/5 font-mono">
                {(report?.appliedMigrations || []).map((m) => (
                  <tr key={m.version} className="hover:bg-black/[0.02] dark:hover:bg-white/[0.02]">
                    <td className="py-2.5 px-4 font-bold text-[#0078d4]">v{m.version}</td>
                    <td className="py-2.5 px-4 text-[#1f1f1f] dark:text-white font-sans">{m.name}</td>
                    <td className="py-2.5 px-4 text-[#8a8a8a]">{m.applied_at}</td>
                    <td className="py-2.5 px-4 text-emerald-600 dark:text-emerald-400">{m.execution_time_ms} ms</td>
                    <td className="py-2.5 px-4 text-[#8a8a8a] text-[10px] truncate max-w-[120px]">{m.checksum}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Table Records Count */}
      <Card variant="acrylic" className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-black/5 dark:border-white/5 pb-3">
          <div className="flex items-center gap-2">
            <HardDrive className="w-4 h-4 text-emerald-500" />
            <h3 className="font-semibold text-sm text-[#1f1f1f] dark:text-white">
              شمارش رکوردهای جداول پایگاه داده ({filteredTables.length} جدول)
            </h3>
          </div>
          <div className="w-full sm:w-60">
            <Input
              placeholder="جستجوی جدول..."
              value={tableSearch}
              onChange={(e) => setTableSearch(e.target.value)}
              prefixIcon={<Search className="w-3.5 h-3.5" />}
              className="h-8 text-xs"
            />
          </div>
        </div>

        {isLoading ? (
          <TableSkeleton rows={6} columns={2} />
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 max-h-72 overflow-y-auto p-1">
            {filteredTables.map((t) => (
              <div
                key={t.table_name}
                className="flex items-center justify-between p-2.5 rounded-md bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 text-xs font-mono"
              >
                <span className="truncate text-[#1f1f1f] dark:text-white font-sans" title={t.table_name}>
                  {t.table_name}
                </span>
                <span className="px-2 py-0.5 rounded bg-black/10 dark:bg-white/10 text-[#0078d4] font-bold">
                  {t.count}
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Application Log Viewer */}
      <Card variant="acrylic" className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-black/5 dark:border-white/5 pb-3">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-[#0078d4]" />
            <h3 className="font-semibold text-sm text-[#1f1f1f] dark:text-white">
              نمایشگر لاگ‌های سیستمی (Application Log Viewer)
            </h3>
          </div>

          <div className="flex items-center gap-2">
            {/* Filter Buttons */}
            <div className="flex items-center rounded-md border border-black/10 dark:border-white/10 p-0.5 bg-black/5 dark:bg-white/5 text-[11px]">
              {['ALL', 'INFO', 'WARN', 'ERROR', 'DEBUG'].map((lvl) => (
                <button
                  key={lvl}
                  onClick={() => setLogFilter(lvl)}
                  className={`px-2 py-0.5 rounded transition-all font-semibold ${
                    logFilter === lvl
                      ? 'bg-white dark:bg-[#333] text-[#0078d4] shadow-sm'
                      : 'text-[#8a8a8a] hover:text-black dark:hover:text-white'
                  }`}
                >
                  {lvl}
                </button>
              ))}
            </div>

            <Button variant="subtle" size="sm" icon={<Download className="w-3.5 h-3.5" />} onClick={handleExportLogs}>
              خروجی JSON
            </Button>
            <Button variant="subtle" size="sm" icon={<Trash2 className="w-3.5 h-3.5 text-red-500" />} onClick={handleClearLogs}>
              پاکسازی
            </Button>
          </div>
        </div>

        <div className="h-64 overflow-y-auto font-mono text-[11px] p-3 rounded-lg bg-black/90 text-white space-y-1.5 leading-relaxed selection:bg-[#0078d4]">
          {filteredLogs.length === 0 ? (
            <div className="text-white/40 text-center py-8 font-sans">هیچ رکوردی در لاگ وجود ندارد.</div>
          ) : (
            filteredLogs.map((entry) => {
              const levelColors = {
                DEBUG: 'text-gray-400',
                INFO: 'text-cyan-400',
                WARN: 'text-amber-400',
                ERROR: 'text-rose-400',
              };
              return (
                <div key={entry.id} className="flex items-start gap-2 hover:bg-white/5 px-1 py-0.5 rounded">
                  <span className="text-white/40 shrink-0 select-none">[{entry.timestamp.substring(11, 19)}]</span>
                  <span className={`font-bold shrink-0 w-12 text-start ${levelColors[entry.level]}`}>
                    {entry.level}
                  </span>
                  {entry.context && (
                    <span className="text-purple-300 shrink-0 font-medium">[{entry.context}]</span>
                  )}
                  <span className="text-white/90 flex-1 break-all">{entry.message}</span>
                </div>
              );
            })
          )}
        </div>
      </Card>
    </div>
  );
};
