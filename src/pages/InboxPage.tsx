import React, { useState, useEffect, useCallback } from 'react';
import {
  Inbox,
  Plus,
  RefreshCw,
  Search,
  CheckSquare,
  StickyNote,
  BookOpen,
  Trash2,
  Check,
  CheckCircle2,
  Clock,
  Sparkles,
  Link as LinkIcon,
  Mic,
  Zap,
  Filter,
  Edit2,
} from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { Card } from '../components/Card';
import { Badge } from '../components/Badge';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Modal } from '../components/Modal';
import { TableSkeleton } from '../components/Skeleton';
import { inboxService, TriageStats } from '../services/inboxService';
import { InboxCapture, InboxSource, InboxStatus } from '../types/database';
import { useQuickCaptureStore } from '../store/useQuickCaptureStore';
import { useTranslation } from '../store/useLocaleStore';
import { formatJalaliDisplay } from '../lib/date/jalali';
import { parseUtcIso } from '../lib/date/utc';

export const InboxPage: React.FC = () => {
  const { t } = useTranslation();
  const openQuickCapture = useQuickCaptureStore((state) => state.openModal);

  const [captures, setCaptures] = useState<InboxCapture[]>([]);
  const [stats, setStats] = useState<TriageStats>({
    total: 0,
    unprocessed: 0,
    processed: 0,
    archived: 0,
    progressPercent: 100,
  });
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<InboxStatus | 'all'>('unprocessed');
  const [sourceFilter, setSourceFilter] = useState<InboxSource | 'all'>('all');

  // Multi-selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Edit Modal State
  const [editingCapture, setEditingCapture] = useState<InboxCapture | null>(null);
  const [editContent, setEditContent] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  // Success Feedback
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);

  const showFeedback = (message: string) => {
    setActionFeedback(message);
    setTimeout(() => setActionFeedback(null), 3000);
  };

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [list, triageStats] = await Promise.all([
        inboxService.getCaptures({
          status: statusFilter,
          source: sourceFilter,
          search: searchQuery,
        }),
        inboxService.getTriageStats(),
      ]);
      setCaptures(list);
      setStats(triageStats);
      setSelectedIds(new Set());
    } catch (err) {
      console.error('Failed to load inbox data:', err);
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter, sourceFilter, searchQuery]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Selection handlers
  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedIds.size === captures.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(captures.map((c) => c.id)));
    }
  };

  // 1-Click Promotions
  const handlePromoteToTask = async (capture: InboxCapture) => {
    try {
      await inboxService.promoteToTask(capture.id);
      showFeedback('ورودی به وظیفه برنامه‌ریزی‌نشده (inbox task) تبدیل شد.');
      await loadData();
    } catch (err) {
      console.error('Failed to promote to task:', err);
    }
  };

  const handlePromoteToNote = async (capture: InboxCapture) => {
    try {
      await inboxService.promoteToNote(capture.id);
      showFeedback('ورودی به یادداشت (Note) تبدیل شد.');
      await loadData();
    } catch (err) {
      console.error('Failed to promote to note:', err);
    }
  };

  const handlePromoteToJournal = async (capture: InboxCapture) => {
    try {
      await inboxService.promoteToJournal(capture.id);
      showFeedback('ورودی به ژورنال روزانه بر اساس تاریخ UTC منتقل شد.');
      await loadData();
    } catch (err) {
      console.error('Failed to promote to journal:', err);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await inboxService.deleteCapture(id);
      showFeedback('ورودی به زباله‌دان منتقل شد.');
      await loadData();
    } catch (err) {
      console.error('Failed to delete capture:', err);
    }
  };

  // Batch actions
  const handleBatchMarkProcessed = async () => {
    if (selectedIds.size === 0) return;
    try {
      await inboxService.batchUpdateStatus(Array.from(selectedIds), 'processed');
      showFeedback(`${selectedIds.size} ورودی بررسی و نهایی شدند.`);
      await loadData();
    } catch (err) {
      console.error('Batch update failed:', err);
    }
  };

  const handleBatchDelete = async () => {
    if (selectedIds.size === 0) return;
    try {
      await inboxService.batchDeleteCaptures(Array.from(selectedIds));
      showFeedback(`${selectedIds.size} ورودی به زباله‌دان منتقل شدند.`);
      await loadData();
    } catch (err) {
      console.error('Batch delete failed:', err);
    }
  };

  // Edit save
  const handleSaveEdit = async () => {
    if (!editingCapture || !editContent.trim()) return;
    setIsUpdating(true);
    try {
      await inboxService.updateCapture(editingCapture.id, {
        raw_content: editContent,
      });
      setEditingCapture(null);
      showFeedback('تغییرات ورودی با موفقیت ذخیره شد.');
      await loadData();
    } catch (err) {
      console.error('Failed to update capture:', err);
    } finally {
      setIsUpdating(false);
    }
  };

  const getSourceIcon = (source: InboxSource) => {
    switch (source) {
      case 'note':
        return <StickyNote className="w-3.5 h-3.5 text-amber-500" />;
      case 'link':
        return <LinkIcon className="w-3.5 h-3.5 text-blue-500" />;
      case 'task_candidate':
        return <CheckSquare className="w-3.5 h-3.5 text-emerald-500" />;
      case 'voice':
        return <Mic className="w-3.5 h-3.5 text-purple-500" />;
      default:
        return <Zap className="w-3.5 h-3.5 text-[#0078d4]" />;
    }
  };

  const getSourceLabel = (source: InboxSource) => {
    switch (source) {
      case 'note':
        return 'یادداشت';
      case 'link':
        return 'پیوند وب';
      case 'task_candidate':
        return 'پیش‌نویس کار';
      case 'voice':
        return 'صوت';
      default:
        return 'ثبت سریع';
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <PageHeader
        title={t('inbox.title')}
        description={t('inbox.description')}
        badge={<Badge variant="accent">{t('inbox.badge')}</Badge>}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              icon={<RefreshCw className="w-3.5 h-3.5" />}
              onClick={loadData}
            >
              {t('common.refresh')}
            </Button>
            <Button
              variant="primary"
              size="sm"
              icon={<Plus className="w-3.5 h-3.5" />}
              onClick={() => openQuickCapture()}
            >
              {t('inbox.newCapture')} (Ctrl+Shift+C)
            </Button>
          </div>
        }
      />

      {/* Success Toast */}
      {actionFeedback && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-lg text-xs font-medium flex items-center gap-2 animate-in fade-in duration-150">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{actionFeedback}</span>
        </div>
      )}

      {/* Triage Progress Overview Banner */}
      <Card variant="acrylic" className="p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#0078d4]/10 text-[#0078d4] flex items-center justify-center">
              <Inbox className="w-5 h-5" />
            </div>
            <div className="text-start">
              <h3 className="text-sm font-bold text-[#1f1f1f] dark:text-white">
                وضعیت پیشرفت تریاژ (Triage Progress)
              </h3>
              <p className="text-xs text-[#8a8a8a]">
                {stats.unprocessed} مورد بررسی‌نشده از مجموع {stats.total} ورودی
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Badge variant={stats.unprocessed === 0 ? 'success' : 'neutral'} size="md">
              {stats.progressPercent}٪ پاکسازی شده
            </Badge>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full h-2.5 bg-black/10 dark:bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-[#0078d4] to-emerald-500 transition-all duration-300 rounded-full"
            style={{ width: `${stats.progressPercent}%` }}
          />
        </div>
      </Card>

      {/* Search & Filter Bar */}
      <Card variant="acrylic" className="p-4 space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Status Tabs */}
          <div className="flex items-center rounded-lg border border-black/10 dark:border-white/10 p-1 bg-black/5 dark:bg-white/5 text-xs">
            {[
              { id: 'unprocessed', label: 'بررسی‌نشده', count: stats.unprocessed },
              { id: 'processed', label: 'پردازش‌شده', count: stats.processed },
              { id: 'all', label: 'همه ورودی‌ها', count: stats.total },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id as InboxStatus | 'all')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition-all ${
                  statusFilter === tab.id
                    ? 'bg-white dark:bg-[#323232] text-[#0078d4] dark:text-[#60a5fa] shadow-sm font-bold'
                    : 'text-[#616161] dark:text-[#adadad] hover:text-black dark:hover:text-white'
                }`}
              >
                <span>{tab.label}</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black/5 dark:bg-white/10">
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          {/* Search input & Source filter */}
          <div className="flex items-center gap-2 flex-1 max-w-md">
            <div className="flex-1">
              <Input
                placeholder="جستجو در متن ورودی‌ها..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                prefixIcon={<Search className="w-3.5 h-3.5" />}
                className="h-8 text-xs"
              />
            </div>

            <select
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value as InboxSource | 'all')}
              className="h-8 text-xs rounded-md bg-white dark:bg-[#2b2b2b] border border-black/15 dark:border-white/15 px-2 text-[#1f1f1f] dark:text-white focus:outline-none focus:ring-1 focus:ring-[#0078d4]"
            >
              <option value="all">همه انواع</option>
              <option value="quick_capture">ثبت سریع</option>
              <option value="note">یادداشت</option>
              <option value="link">پیوند</option>
              <option value="task_candidate">کار</option>
              <option value="voice">صوت</option>
            </select>
          </div>
        </div>

        {/* Batch Actions Toolbar */}
        {selectedIds.size > 0 && (
          <div className="flex items-center justify-between p-2.5 rounded-lg bg-[#0078d4]/10 border border-[#0078d4]/20 animate-in fade-in duration-150">
            <div className="flex items-center gap-2 text-xs font-semibold text-[#0078d4] dark:text-[#60a5fa]">
              <CheckSquare className="w-4 h-4" />
              <span>{selectedIds.size} مورد انتخاب شده</span>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                icon={<Check className="w-3 h-3 text-emerald-500" />}
                onClick={handleBatchMarkProcessed}
              >
                بررسی همه
              </Button>
              <Button
                variant="subtle"
                size="sm"
                icon={<Trash2 className="w-3 h-3 text-red-500" />}
                onClick={handleBatchDelete}
              >
                حذف گروهی
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Main List View */}
      {isLoading ? (
        <TableSkeleton rows={4} columns={3} />
      ) : captures.length === 0 ? (
        /* Empty State */
        <Card variant="acrylic" className="flex flex-col items-center justify-center p-12 text-center">
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center mb-4 shadow-sm">
            <Sparkles className="w-8 h-8" />
          </div>

          <h3 className="text-lg font-bold text-[#1f1f1f] dark:text-white mb-2">
            صندوق ورودی پاک و سازماندهی شده است!
          </h3>

          <p className="text-sm text-[#616161] dark:text-[#adadad] max-w-md mb-6 leading-relaxed">
            {statusFilter === 'unprocessed'
              ? 'هیچ ورودی بررسی‌نشده‌ای وجود ندارد. برای ثبت ایده یا یادداشت جدید کلیدهای Ctrl+Shift+C را فشار دهید.'
              : 'هیچ موردی با فیلترهای انتخابی یافت نشد.'}
          </p>

          <Button
            variant="primary"
            icon={<Plus className="w-4 h-4" />}
            onClick={() => openQuickCapture()}
          >
            افزودن ورودی جدید
          </Button>
        </Card>
      ) : (
        <div className="space-y-3">
          {/* Select All Row */}
          <div className="flex items-center justify-between px-2 text-xs text-[#8a8a8a]">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={selectedIds.size === captures.length && captures.length > 0}
                onChange={handleSelectAll}
                className="rounded text-[#0078d4] focus:ring-0"
              />
              <span>انتخاب همه ({captures.length} مورد)</span>
            </label>
            <span className="flex items-center gap-1">
              <Filter className="w-3 h-3" />
              <span>مرتب‌سازی بر اساس جدیدترین زمان ثبت</span>
            </span>
          </div>

          {/* Capture Item Cards */}
          {captures.map((capture) => {
            const isSelected = selectedIds.has(capture.id);
            let jalaliDateStr = '';
            try {
              jalaliDateStr = formatJalaliDisplay(parseUtcIso(capture.created_at), true);
            } catch {
              jalaliDateStr = capture.created_at.substring(0, 10);
            }

            return (
              <Card
                key={capture.id}
                variant="acrylic"
                className={`p-4 transition-all border ${
                  isSelected
                    ? 'border-[#0078d4] bg-[#0078d4]/5 shadow-sm'
                    : 'border-black/8 dark:border-white/8 hover:border-black/15 dark:hover:border-white/15'
                }`}
              >
                <div className="flex items-start gap-3">
                  {/* Select Checkbox */}
                  <div className="pt-1">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleToggleSelect(capture.id)}
                      className="rounded text-[#0078d4] focus:ring-0 cursor-pointer"
                    />
                  </div>

                  {/* Main Content Body */}
                  <div className="flex-1 overflow-hidden space-y-2 text-start">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="neutral" size="sm" className="gap-1 font-medium">
                          {getSourceIcon(capture.source)}
                          <span>{getSourceLabel(capture.source)}</span>
                        </Badge>

                        {capture.status === 'processed' ? (
                          <Badge variant="success" size="sm">
                            بررسی‌شده
                          </Badge>
                        ) : (
                          <Badge variant="warning" size="sm">
                            در انتظار
                          </Badge>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 text-[11px] text-[#8a8a8a] font-mono">
                        <Clock className="w-3 h-3" />
                        <span>{jalaliDateStr}</span>
                        <span className="opacity-50">
                          {capture.created_at.substring(11, 16)} UTC
                        </span>
                      </div>
                    </div>

                    {/* Raw Text Content */}
                    <div className="text-sm text-[#1f1f1f] dark:text-white leading-relaxed whitespace-pre-wrap break-words font-sans">
                      {capture.raw_content}
                    </div>

                    {/* 1-Click Action Promotions Toolbar */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-black/5 dark:border-white/5">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Button
                          variant="secondary"
                          size="sm"
                          className="h-7 text-xs px-2"
                          icon={<CheckSquare className="w-3.5 h-3.5 text-emerald-500" />}
                          onClick={() => handlePromoteToTask(capture)}
                        >
                          تبدیل به کار
                        </Button>

                        <Button
                          variant="secondary"
                          size="sm"
                          className="h-7 text-xs px-2"
                          icon={<StickyNote className="w-3.5 h-3.5 text-amber-500" />}
                          onClick={() => handlePromoteToNote(capture)}
                        >
                          تبدیل به یادداشت
                        </Button>

                        <Button
                          variant="secondary"
                          size="sm"
                          className="h-7 text-xs px-2"
                          icon={<BookOpen className="w-3.5 h-3.5 text-blue-500" />}
                          onClick={() => handlePromoteToJournal(capture)}
                        >
                          ثبت در ژورنال
                        </Button>
                      </div>

                      <div className="flex items-center gap-1">
                        <Button
                          variant="subtle"
                          size="sm"
                          className="h-7 w-7 p-0"
                          aria-label="ویرایش متن"
                          onClick={() => {
                            setEditingCapture(capture);
                            setEditContent(capture.raw_content);
                          }}
                        >
                          <Edit2 className="w-3.5 h-3.5 text-[#616161] dark:text-[#adadad]" />
                        </Button>

                        <Button
                          variant="subtle"
                          size="sm"
                          className="h-7 w-7 p-0 text-red-500 hover:text-red-600"
                          aria-label="حذف ورودی"
                          onClick={() => handleDelete(capture.id)}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Edit Modal */}
      <Modal
        isOpen={!!editingCapture}
        onClose={() => setEditingCapture(null)}
        title="ویرایش متن ورودی"
        description="متن خام ثبت‌شده در صندوق ورودی را اصلاح کنید"
        footer={
          <div className="flex items-center gap-2">
            <Button variant="subtle" onClick={() => setEditingCapture(null)}>
              انصراف
            </Button>
            <Button
              variant="primary"
              disabled={!editContent.trim() || isUpdating}
              isLoading={isUpdating}
              onClick={handleSaveEdit}
            >
              ذخیره تغییرات
            </Button>
          </div>
        }
      >
        <textarea
          rows={6}
          value={editContent}
          onChange={(e) => setEditContent(e.target.value)}
          className="w-full rounded-md border border-black/15 dark:border-white/15 bg-white dark:bg-[#2b2b2b] p-3 text-sm text-[#1f1f1f] dark:text-white leading-relaxed focus:outline-none focus:ring-1 focus:ring-[#0078d4]"
        />
      </Modal>
    </div>
  );
};
