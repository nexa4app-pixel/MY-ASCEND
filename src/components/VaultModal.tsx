import React, { useState, useEffect } from 'react';
import {
  Trophy,
  Heart,
  Lightbulb,
  Compass,
  Flag,
  Star,
  Calendar as CalendarIcon,
} from 'lucide-react';
import { Modal } from './Modal';
import { Button } from './Button';
import { Input } from './Input';
import { MemoryVaultItem, MemoryVaultCategory } from '../types/database';
import { vaultService } from '../services/vaultService';

export interface VaultModalProps {
  isOpen: boolean;
  onClose: () => void;
  itemToEdit?: MemoryVaultItem | null;
  defaultCategory?: MemoryVaultCategory;
  onSaved?: () => void;
}

const CATEGORIES: {
  id: MemoryVaultCategory;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}[] = [
  { id: 'win', label: 'دستاورد (Win)', icon: Trophy, color: 'text-amber-500 border-amber-500/40 bg-amber-500/10' },
  { id: 'gratitude', label: 'شکرگزاری (Gratitude)', icon: Heart, color: 'text-rose-500 border-rose-500/40 bg-rose-500/10' },
  { id: 'lesson', label: 'درس آموخته (Lesson)', icon: Lightbulb, color: 'text-blue-500 border-blue-500/40 bg-blue-500/10' },
  { id: 'insight', label: 'بینش و ایده (Insight)', icon: Compass, color: 'text-purple-500 border-purple-500/40 bg-purple-500/10' },
  { id: 'milestone', label: 'نقطه عطف (Milestone)', icon: Flag, color: 'text-emerald-500 border-emerald-500/40 bg-emerald-500/10' },
];

export const VaultModal: React.FC<VaultModalProps> = ({
  isOpen,
  onClose,
  itemToEdit,
  defaultCategory = 'win',
  onSaved,
}) => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState<MemoryVaultCategory>(defaultCategory);
  const [significanceRating, setSignificanceRating] = useState(3);
  const [reflectionDate, setReflectionDate] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setError(null);
      if (itemToEdit) {
        setTitle(itemToEdit.title);
        setContent(itemToEdit.content);
        setCategory(itemToEdit.category);
        setSignificanceRating(itemToEdit.significance_rating || 3);
        setReflectionDate(
          itemToEdit.reflection_date
            ? itemToEdit.reflection_date.split('T')[0]
            : new Date().toISOString().split('T')[0]
        );
      } else {
        setTitle('');
        setContent('');
        setCategory(defaultCategory);
        setSignificanceRating(3);
        setReflectionDate(new Date().toISOString().split('T')[0]);
      }
    }
  }, [isOpen, itemToEdit, defaultCategory]);

  const handleSave = async () => {
    if (!title.trim()) {
      setError('عنوان تجربه یا خاطره الزامی است.');
      return;
    }
    if (!content.trim()) {
      setError('متن خاطره یا دستاورد نمی‌تواند خالی باشد.');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const dateIso = reflectionDate ? `${reflectionDate}T12:00:00.000Z` : undefined;

      if (itemToEdit) {
        await vaultService.updateVaultItem(itemToEdit.id, {
          title: title.trim(),
          content: content.trim(),
          category,
          significanceRating,
          reflectionDate: dateIso,
        });
      } else {
        await vaultService.createVaultItem({
          title: title.trim(),
          content: content.trim(),
          category,
          significanceRating,
          reflectionDate: dateIso,
        });
      }

      onSaved?.();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'خطا در ذخیره رکورد');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={itemToEdit ? 'ویرایش خاطره / دستاورد' : 'ثبت در صندوق خاطرات و تجارب (Memory Vault)'}
      size="md"
    >
      <div className="space-y-4 text-start">
        {error && (
          <div className="p-2.5 text-xs text-red-600 bg-red-500/10 border border-red-500/20 rounded-lg">
            {error}
          </div>
        )}

        {/* Category Selector */}
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-[#1f1f1f] dark:text-white">
            دسته‌بندی موضوعی
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {CATEGORIES.map((cat) => {
              const Icon = cat.icon;
              const isSelected = category === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setCategory(cat.id)}
                  className={`p-2 rounded-xl border text-xs font-medium flex items-center gap-2 transition-all ${
                    isSelected
                      ? `${cat.color} font-bold ring-2 ring-[#0078d4] scale-[1.02] shadow-sm`
                      : 'border-black/10 dark:border-white/10 text-[#616161] hover:bg-black/5 dark:hover:bg-white/5'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="truncate">{cat.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Title Input */}
        <div>
          <label className="block text-xs font-semibold text-[#1f1f1f] dark:text-white mb-1">
            عنوان دستاورد / خاطره *
          </label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="مثال: قبولی در آزمون، شروع پروژه Ascend، یادگیری React..."
            autoFocus
          />
        </div>

        {/* Content Textarea */}
        <div>
          <label className="block text-xs font-semibold text-[#1f1f1f] dark:text-white mb-1">
            شرح جزئیات، احساسات و نکات کلیدی *
          </label>
          <textarea
            rows={4}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="دقیقاً چه اتفاقی افتاد و چه درسی از آن گرفتی؟..."
            className="w-full text-xs bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-lg p-2.5 text-[#1f1f1f] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0078d4] resize-none"
          />
        </div>

        {/* Date and Significance */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
          <div>
            <label className="block text-xs font-semibold text-[#1f1f1f] dark:text-white mb-1">
              تاریخ وقوع / ثبت
            </label>
            <Input
              type="date"
              value={reflectionDate}
              onChange={(e) => setReflectionDate(e.target.value)}
              prefixIcon={<CalendarIcon className="w-3.5 h-3.5" />}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#1f1f1f] dark:text-white mb-1">
              میزان اهمیت و تاثیر (۱ تا ۵)
            </label>
            <div className="flex items-center gap-1 bg-black/5 dark:bg-white/5 p-1.5 rounded-lg border border-black/10 dark:border-white/10 justify-center">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setSignificanceRating(star)}
                  className="p-1 hover:scale-125 transition-transform"
                >
                  <Star
                    className={`w-4 h-4 ${
                      star <= significanceRating
                        ? 'fill-amber-400 text-amber-400'
                        : 'text-[#8a8a8a]/40'
                    }`}
                  />
                </button>
              ))}
              <span className="text-xs font-mono font-bold ps-1 text-[#1f1f1f] dark:text-white">
                {significanceRating}/5
              </span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t border-black/10 dark:border-white/10">
          <Button variant="secondary" size="sm" onClick={onClose} disabled={isSaving}>
            انصراف
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleSave}
            disabled={isSaving}
            isLoading={isSaving}
          >
            {itemToEdit ? 'بروزرسانی' : 'ثبت در صندوق تجارب'}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
