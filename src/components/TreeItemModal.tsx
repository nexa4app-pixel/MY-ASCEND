import React, { useState, useEffect } from 'react';
import { Layers, Bookmark, FileText, CheckCircle2 } from 'lucide-react';
import { Modal } from './Modal';
import { Button } from './Button';
import { Input } from './Input';
import { Chapter, Section, Topic, TopicImportance } from '../types/database';
import { academicTreeService } from '../services/academicTreeService';

export type TreeItemType = 'chapter' | 'section' | 'topic';

export interface TreeItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: TreeItemType;
  // Context IDs for creation
  bookId?: string;
  chapterId?: string;
  sectionId?: string | null;
  subjectId?: string;
  // Item to edit if editing
  itemToEdit?: Chapter | Section | Topic | null;
  onSaved?: () => void;
}

const IMPORTANCE_OPTIONS: { value: TopicImportance; label: string }[] = [
  { value: 'critical', label: 'بحرانی و مبنایی (Critical)' },
  { value: 'high', label: 'مهم و اساسی (High)' },
  { value: 'medium', label: 'متوسط و استاندارد (Medium)' },
  { value: 'low', label: 'تکمیلی یا ساده (Low)' },
];

export const TreeItemModal: React.FC<TreeItemModalProps> = ({
  isOpen,
  onClose,
  type,
  bookId,
  chapterId,
  sectionId,
  subjectId,
  itemToEdit,
  onSaved,
}) => {
  const [title, setTitle] = useState('');
  // Chapter fields
  const [chapterNumber, setChapterNumber] = useState<number | ''>('');
  const [startPage, setStartPage] = useState<number | ''>('');
  const [endPage, setEndPage] = useState<number | ''>('');
  // Section fields
  const [sectionNumber, setSectionNumber] = useState('');
  const [page, setPage] = useState<number | ''>('');
  // Topic fields
  const [importance, setImportance] = useState<TopicImportance>('medium');

  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setError(null);
      if (itemToEdit) {
        setTitle(itemToEdit.title);
        if (type === 'chapter') {
          const chap = itemToEdit as Chapter;
          setChapterNumber(chap.chapter_number);
          setStartPage(chap.start_page ?? '');
          setEndPage(chap.end_page ?? '');
        } else if (type === 'section') {
          const sec = itemToEdit as Section;
          setSectionNumber(sec.section_number || '');
          setPage(sec.page ?? '');
        } else if (type === 'topic') {
          const top = itemToEdit as Topic;
          setImportance(top.importance_level);
        }
      } else {
        setTitle('');
        setChapterNumber('');
        setStartPage('');
        setEndPage('');
        setSectionNumber('');
        setPage('');
        setImportance('medium');
      }
    }
  }, [isOpen, itemToEdit, type]);

  const handleSave = async () => {
    if (!title.trim() || isSaving) {
      setError('عنوان نمی‌تواند خالی باشد.');
      return;
    }

    setIsSaving(true);
    setError(null);
    try {
      if (type === 'chapter') {
        if (itemToEdit) {
          await academicTreeService.updateChapter(itemToEdit.id, {
            title: title.trim(),
            chapterNumber: chapterNumber === '' ? undefined : Number(chapterNumber),
            startPage: startPage === '' ? null : Number(startPage),
            endPage: endPage === '' ? null : Number(endPage),
          });
        } else {
          if (!bookId) throw new Error('شناسه کتاب الزامی است.');
          await academicTreeService.createChapter({
            bookId,
            title: title.trim(),
            chapterNumber: chapterNumber === '' ? undefined : Number(chapterNumber),
            startPage: startPage === '' ? null : Number(startPage),
            endPage: endPage === '' ? null : Number(endPage),
          });
        }
      } else if (type === 'section') {
        if (itemToEdit) {
          await academicTreeService.updateSection(itemToEdit.id, {
            title: title.trim(),
            sectionNumber: sectionNumber.trim() || null,
            page: page === '' ? null : Number(page),
          });
        } else {
          if (!chapterId) throw new Error('شناسه فصل الزامی است.');
          await academicTreeService.createSection({
            chapterId,
            title: title.trim(),
            sectionNumber: sectionNumber.trim() || null,
            page: page === '' ? null : Number(page),
          });
        }
      } else if (type === 'topic') {
        if (itemToEdit) {
          await academicTreeService.updateTopic(itemToEdit.id, {
            title: title.trim(),
            importanceLevel: importance,
          });
        } else {
          if (!chapterId) throw new Error('شناسه فصل الزامی است.');
          if (!subjectId) throw new Error('شناسه درس الزامی است.');
          await academicTreeService.createTopic({
            subjectId,
            chapterId,
            sectionId: sectionId || null,
            title: title.trim(),
            importanceLevel: importance,
          });
        }
      }

      onSaved?.();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'خطا در ذخیره‌سازی سرفصل');
    } finally {
      setIsSaving(false);
    }
  };

  const getModalTitle = () => {
    const action = itemToEdit ? 'ویرایش' : 'افزودن';
    switch (type) {
      case 'chapter':
        return `${action} فصل کتاب`;
      case 'section':
        return `${action} بخش / زیرفصل`;
      case 'topic':
        return `${action} مبحث آموزشی (Topic)`;
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={getModalTitle()} size="md">
      <div className="space-y-4 text-start">
        {error && (
          <div className="p-2.5 text-xs text-red-600 bg-red-500/10 border border-red-500/20 rounded-lg">
            {error}
          </div>
        )}

        {/* Title */}
        <div>
          <label className="block text-xs font-semibold text-[#1f1f1f] dark:text-white mb-1.5">
            عنوان {type === 'chapter' ? 'فصل' : type === 'section' ? 'بخش' : 'مبحث'}{' '}
            <span className="text-red-500">*</span>
          </label>
          <Input
            placeholder={
              type === 'chapter'
                ? 'مثال: فصل ۱: سری‌های فوریه و تبدیلات انتگرالی'
                : type === 'section'
                  ? 'مثال: بخش ۱-۲: همگرایی سری فوریه'
                  : 'مثال: محاسبه ضرایب An و Bn در بازه متقارن'
            }
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            prefixIcon={<Layers className="w-4 h-4" />}
            autoFocus
          />
        </div>

        {/* Chapter specific fields */}
        {type === 'chapter' && (
          <div className="grid grid-cols-3 gap-2.5">
            <div>
              <label className="block text-xs font-semibold text-[#1f1f1f] dark:text-white mb-1.5">
                شماره فصل
              </label>
              <Input
                type="number"
                min="1"
                placeholder="1"
                value={chapterNumber}
                onChange={(e) => setChapterNumber(e.target.value === '' ? '' : Number(e.target.value))}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#1f1f1f] dark:text-white mb-1.5">
                صفحه شروع
              </label>
              <Input
                type="number"
                min="1"
                placeholder="15"
                value={startPage}
                onChange={(e) => setStartPage(e.target.value === '' ? '' : Number(e.target.value))}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#1f1f1f] dark:text-white mb-1.5">
                صفحه پایان
              </label>
              <Input
                type="number"
                min="1"
                placeholder="68"
                value={endPage}
                onChange={(e) => setEndPage(e.target.value === '' ? '' : Number(e.target.value))}
              />
            </div>
          </div>
        )}

        {/* Section specific fields */}
        {type === 'section' && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#1f1f1f] dark:text-white mb-1.5">
                شماره / برچسب بخش
              </label>
              <Input
                placeholder="مثال: ۱-۲ یا A"
                value={sectionNumber}
                onChange={(e) => setSectionNumber(e.target.value)}
                prefixIcon={<Bookmark className="w-4 h-4" />}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#1f1f1f] dark:text-white mb-1.5">
                صفحه
              </label>
              <Input
                type="number"
                min="1"
                placeholder="صفحه در کتاب"
                value={page}
                onChange={(e) => setPage(e.target.value === '' ? '' : Number(e.target.value))}
                prefixIcon={<FileText className="w-4 h-4" />}
              />
            </div>
          </div>
        )}

        {/* Topic specific fields */}
        {type === 'topic' && (
          <div>
            <label className="block text-xs font-semibold text-[#1f1f1f] dark:text-white mb-1.5 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-blue-500" />
              <span>میزان اهمیت مبحث در آزمون / یادگیری</span>
            </label>
            <select
              value={importance}
              onChange={(e) => setImportance(e.target.value as TopicImportance)}
              className="w-full h-9 text-xs bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-lg px-3 text-[#1f1f1f] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0078d4]"
            >
              {IMPORTANCE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t border-black/10 dark:border-white/10">
          <Button variant="secondary" size="sm" onClick={onClose} disabled={isSaving}>
            انصراف
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleSave}
            disabled={!title.trim() || isSaving}
            isLoading={isSaving}
          >
            {itemToEdit ? 'بروزرسانی' : 'افزودن'}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
