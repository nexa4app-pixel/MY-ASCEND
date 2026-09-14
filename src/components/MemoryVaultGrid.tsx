import React, { useState, useEffect, useCallback } from 'react';
import {
  Trophy,
  Heart,
  Lightbulb,
  Compass,
  Flag,
  Plus,
  Search,
  Star,
  Trash2,
  Edit3,
} from 'lucide-react';
import { Card } from './Card';
import { Button } from './Button';
import { Badge } from './Badge';
import { VaultModal } from './VaultModal';
import { vaultService, VaultStats } from '../services/vaultService';
import { MemoryVaultItem, MemoryVaultCategory } from '../types/database';

const CATEGORY_META: Record<
  MemoryVaultCategory,
  { label: string; icon: React.ComponentType<{ className?: string }>; color: string; badgeVariant: 'accent' | 'warning' | 'success' | 'neutral' }
> = {
  win: { label: 'دستاورد', icon: Trophy, color: 'border-amber-500/30 bg-amber-500/5', badgeVariant: 'warning' },
  gratitude: { label: 'شکرگزاری', icon: Heart, color: 'border-rose-500/30 bg-rose-500/5', badgeVariant: 'accent' },
  lesson: { label: 'درس آموخته', icon: Lightbulb, color: 'border-blue-500/30 bg-blue-500/5', badgeVariant: 'accent' },
  insight: { label: 'بینش و کشف', icon: Compass, color: 'border-purple-500/30 bg-purple-500/5', badgeVariant: 'accent' },
  milestone: { label: 'نقطه عطف', icon: Flag, color: 'border-emerald-500/30 bg-emerald-500/5', badgeVariant: 'success' },
};

export const MemoryVaultGrid: React.FC = () => {
  const [items, setItems] = useState<MemoryVaultItem[]>([]);
  const [stats, setStats] = useState<VaultStats | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<MemoryVaultCategory | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [itemToEdit, setItemToEdit] = useState<MemoryVaultItem | null>(null);

  const loadData = useCallback(async () => {
    try {
      const [allStats, allItems] = await Promise.all([
        vaultService.getVaultStats(),
        vaultService.getVaultItems({
          category: selectedCategory === 'all' ? undefined : selectedCategory,
          search: searchQuery.trim() || undefined,
        }),
      ]);
      setStats(allStats);
      setItems(allItems);
    } catch (err) {
      console.error('Failed to load memory vault:', err);
    }
  }, [selectedCategory, searchQuery]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm('آیا از انتقال این مورد به زباله‌دان اطمینان دارید؟')) return;
    try {
      await vaultService.deleteVaultItem(id);
      loadData();
    } catch (err) {
      console.error('Failed to delete vault item:', err);
    }
  };

  const CATEGORY_TABS: { id: MemoryVaultCategory | 'all'; label: string; count: number }[] = [
    { id: 'all', label: 'همه تجارب', count: stats?.totalCount || 0 },
    { id: 'win', label: 'دستاوردها 🏆', count: stats?.winsCount || 0 },
    { id: 'gratitude', label: 'شکرگزاری 🙏', count: stats?.gratitudeCount || 0 },
    { id: 'lesson', label: 'درس‌ها 💡', count: stats?.lessonsCount || 0 },
    { id: 'insight', label: 'بینش‌ها 🔍', count: stats?.insightsCount || 0 },
    { id: 'milestone', label: 'نقاط عطف 🚩', count: stats?.milestonesCount || 0 },
  ];

  return (
    <div className="space-y-4 select-none text-start">
      {/* Controls & Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Category Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 p-1 bg-black/5 dark:bg-white/5 rounded-xl border border-black/5 dark:border-white/5">
          {CATEGORY_TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedCategory(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                selectedCategory === tab.id
                  ? 'bg-white dark:bg-[#333] text-[#0078d4] dark:text-[#60a5fa] font-bold shadow-sm'
                  : 'text-[#616161] dark:text-[#adadad] hover:text-black dark:hover:text-white'
              }`}
            >
              <span>{tab.label}</span>
              <span className="text-[10px] font-mono opacity-80">({tab.count})</span>
            </button>
          ))}
        </div>

        {/* Search & Add Action */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute start-2.5 top-1/2 -translate-y-1/2 text-[#8a8a8a]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="جستجو در تجارب..."
              className="h-8 ps-8 pe-2.5 text-xs bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-lg text-[#1f1f1f] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0078d4]"
            />
          </div>

          <Button
            variant="primary"
            size="sm"
            icon={<Plus className="w-3.5 h-3.5" />}
            onClick={() => {
              setItemToEdit(null);
              setIsModalOpen(true);
            }}
          >
            + ثبت تجربه
          </Button>
        </div>
      </div>

      {/* Cards Grid */}
      {items.length === 0 ? (
        <Card variant="acrylic" className="p-12 text-center space-y-2 text-[#8a8a8a]">
          <Trophy className="w-10 h-10 text-amber-500/40 mx-auto" />
          <p className="text-sm font-semibold">موردی در این دسته‌بندی یافت نشد.</p>
          <p className="text-xs">
            از دکمه «+ ثبت تجربه» استفاده کنید تا دستاوردها، درس‌ها و لحظات شکرگزاری خود را ماندگار کنید.
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {items.map((item) => {
            const meta = CATEGORY_META[item.category] || CATEGORY_META.win;
            const Icon = meta.icon;

            return (
              <Card
                key={item.id}
                variant="acrylic"
                className={`p-4 space-y-3 border flex flex-col justify-between transition-all hover:border-[#0078d4]/40 hover:shadow-md ${meta.color}`}
              >
                <div className="space-y-2">
                  {/* Category Badge & Significance Stars */}
                  <div className="flex items-center justify-between gap-2">
                    <Badge variant={meta.badgeVariant} size="sm" className="flex items-center gap-1">
                      <Icon className="w-3 h-3" />
                      <span>{meta.label}</span>
                    </Badge>

                    {/* Stars */}
                    <div className="flex items-center gap-0.5">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star
                          key={s}
                          className={`w-3 h-3 ${
                            s <= item.significance_rating
                              ? 'fill-amber-400 text-amber-400'
                              : 'text-black/10 dark:text-white/10'
                          }`}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Title & Body */}
                  <div>
                    <h4 className="font-bold text-sm text-[#1f1f1f] dark:text-white mb-1">
                      {item.title}
                    </h4>
                    <p className="text-xs text-[#616161] dark:text-[#adadad] whitespace-pre-wrap line-clamp-4 leading-relaxed">
                      {item.content}
                    </p>
                  </div>
                </div>

                {/* Footer: Date & Actions */}
                <div className="flex items-center justify-between pt-2 border-t border-black/5 dark:border-white/5 text-[11px] text-[#8a8a8a]">
                  <span className="font-mono">
                    {item.reflection_date ? item.reflection_date.split('T')[0] : item.created_at.split('T')[0]}
                  </span>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => {
                        setItemToEdit(item);
                        setIsModalOpen(true);
                      }}
                      className="p-1 hover:text-[#0078d4] rounded"
                      title="ویرایش"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={(e) => handleDelete(item.id, e)}
                      className="p-1 hover:text-red-500 rounded"
                      title="حذف"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Vault Modal */}
      <VaultModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        itemToEdit={itemToEdit}
        defaultCategory={selectedCategory === 'all' ? 'win' : selectedCategory}
        onSaved={loadData}
      />
    </div>
  );
};
