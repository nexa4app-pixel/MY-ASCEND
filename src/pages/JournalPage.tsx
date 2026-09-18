import React, { useState, useEffect, useCallback } from 'react';
import {
  BookOpen,
  Trophy,
  History,
  Flame,
  Smile,
  Zap,
  RefreshCw,
  Search,
  Trash2,
} from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { Card } from '../components/Card';
import { Badge } from '../components/Badge';
import { Button } from '../components/Button';
import { JournalEditor } from '../components/JournalEditor';
import { MemoryVaultGrid } from '../components/MemoryVaultGrid';
import { MoodHeatmap } from '../components/MoodHeatmap';
import { journalService, MoodStats } from '../services/journalService';
import { JournalEntry } from '../types/database';
import { useTranslation } from '../store/useLocaleStore';

export type JournalTab = 'daily' | 'vault' | 'timeline';

export const JournalPage: React.FC = () => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<JournalTab>('daily');
  const [stats, setStats] = useState<MoodStats | null>(null);
  const [timelineEntries, setTimelineEntries] = useState<JournalEntry[]>([]);
  const [timelineSearch, setTimelineSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [moodStats, entries] = await Promise.all([
        journalService.getMoodStats(),
        journalService.getJournalEntries({ search: timelineSearch.trim() || undefined, limit: 50 }),
      ]);
      setStats(moodStats);
      setTimelineEntries(entries);
    } catch (err) {
      console.error('Failed to load journal page data:', err);
    } finally {
      setIsLoading(false);
    }
  }, [timelineSearch]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleDeleteEntry = async (id: string) => {
    if (!window.confirm('آیا از انتقال این یادداشت به زباله‌دان اطمینان دارید؟')) return;
    try {
      await journalService.deleteJournalEntry(id);
      loadData();
    } catch (err) {
      console.error('Failed to delete journal entry:', err);
    }
  };

  const TABS: { id: JournalTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'daily', label: t('journal.tabReflection'), icon: BookOpen },
    { id: 'vault', label: t('journal.tabVault'), icon: Trophy },
    { id: 'timeline', label: t('journal.tabTimeline'), icon: History },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-6 select-none">
      {/* Page Header */}
      <PageHeader
        title={t('journal.title')}
        description={t('journal.description')}
        badge={<Badge variant="accent" size="md">{t('journal.badge')}</Badge>}
        actions={
          <Button variant="subtle" size="sm" onClick={loadData} disabled={isLoading} aria-label="Refresh">
            <RefreshCw className="w-3.5 h-3.5" />
          </Button>
        }
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card variant="acrylic" className="p-3 text-center space-y-1">
          <span className="text-[11px] text-[#8a8a8a] flex items-center justify-center gap-1">
            <Flame className="w-3.5 h-3.5 text-orange-500" />
            <span>پیوستگی ژورنال</span>
          </span>
          <div className="text-xl font-bold text-orange-500 font-mono">
            {stats?.currentStreak ?? 0} روز
          </div>
        </Card>

        <Card variant="acrylic" className="p-3 text-center space-y-1">
          <span className="text-[11px] text-[#8a8a8a] flex items-center justify-center gap-1">
            <BookOpen className="w-3.5 h-3.5 text-[#0078d4]" />
            <span>کل یادداشت‌ها</span>
          </span>
          <div className="text-xl font-bold text-[#0078d4] dark:text-[#60a5fa] font-mono">
            {stats?.totalEntries ?? 0}
          </div>
        </Card>

        <Card variant="acrylic" className="p-3 text-center space-y-1">
          <span className="text-[11px] text-[#8a8a8a] flex items-center justify-center gap-1">
            <Smile className="w-3.5 h-3.5 text-emerald-500" />
            <span>میانگین خلق‌وخو</span>
          </span>
          <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400 font-mono">
            {stats?.averageMood ? `${stats.averageMood} / ۵` : '—'}
          </div>
        </Card>

        <Card variant="acrylic" className="p-3 text-center space-y-1">
          <span className="text-[11px] text-[#8a8a8a] flex items-center justify-center gap-1">
            <Zap className="w-3.5 h-3.5 text-amber-500" />
            <span>میانگین انرژی</span>
          </span>
          <div className="text-xl font-bold text-amber-500 font-mono">
            {stats?.averageEnergy ? `⚡ ${stats.averageEnergy} / ۵` : '—'}
          </div>
        </Card>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-1.5 p-1 bg-black/5 dark:bg-white/5 rounded-xl border border-black/5 dark:border-white/5 w-fit">
        {TABS.map((t) => {
          const Icon = t.icon;
          const isActive = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                isActive
                  ? 'bg-white dark:bg-[#333] text-[#0078d4] dark:text-[#60a5fa] font-bold shadow-sm'
                  : 'text-[#616161] dark:text-[#adadad] hover:text-black dark:hover:text-white'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab 1: Daily Journal & Reflection */}
      {activeTab === 'daily' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2">
            <JournalEditor onEntrySaved={loadData} />
          </div>
          <div className="space-y-4">
            <MoodHeatmap />
          </div>
        </div>
      )}

      {/* Tab 2: Memory Vault */}
      {activeTab === 'vault' && <MemoryVaultGrid />}

      {/* Tab 3: Timeline & Past Entries Archive */}
      {activeTab === 'timeline' && (
        <div className="space-y-4 text-start">
          <div className="flex items-center justify-between gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-3.5 h-3.5 absolute start-2.5 top-1/2 -translate-y-1/2 text-[#8a8a8a]" />
              <input
                type="text"
                value={timelineSearch}
                onChange={(e) => setTimelineSearch(e.target.value)}
                placeholder="جستجو در متن یا عنوان ژورنال‌ها..."
                className="w-full h-8 ps-8 pe-2.5 text-xs bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-lg text-[#1f1f1f] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0078d4]"
              />
            </div>
            <span className="text-xs text-[#8a8a8a] font-mono">
              {timelineEntries.length} یادداشت یافت شد
            </span>
          </div>

          {timelineEntries.length === 0 ? (
            <Card variant="acrylic" className="p-12 text-center text-[#8a8a8a] text-xs">
              هیچ یادداشتی با این مشخصات یافت نشد.
            </Card>
          ) : (
            <div className="space-y-3">
              {timelineEntries.map((e) => (
                <Card
                  key={e.id}
                  variant="acrylic"
                  className="p-4 space-y-2.5 border border-black/8 dark:border-white/8 hover:border-[#0078d4]/30 transition-all"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-[#1f1f1f] dark:text-white font-mono">
                        {e.entry_date}
                      </span>
                      {e.title && (
                        <span className="font-semibold text-xs text-[#0078d4] dark:text-[#60a5fa]">
                          — {e.title}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 text-xs">
                      {e.mood_score && (
                        <Badge variant="accent" size="sm">
                          خلق‌وخو: {e.mood_score}/۵
                        </Badge>
                      )}
                      {e.energy_level && (
                        <Badge variant="warning" size="sm">
                          انرژی: ⚡ {e.energy_level}/۵
                        </Badge>
                      )}
                      <button
                        onClick={() => handleDeleteEntry(e.id)}
                        className="p-1 text-[#8a8a8a] hover:text-red-500 rounded"
                        title="حذف"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <p className="text-xs text-[#616161] dark:text-[#adadad] whitespace-pre-wrap leading-relaxed line-clamp-5">
                    {e.content}
                  </p>

                  {e.tags && (
                    <div className="flex items-center gap-1.5 pt-1 flex-wrap">
                      {e.tags.split(',').map((tag, idx) => (
                        <span
                          key={idx}
                          className="text-[10px] px-2 py-0.5 rounded-md bg-black/5 dark:bg-white/5 text-[#8a8a8a]"
                        >
                          #{tag.trim()}
                        </span>
                      ))}
                    </div>
                  )}
                </Card>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
