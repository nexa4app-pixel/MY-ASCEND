import React, { useState, useEffect } from 'react';
import { Book as BookIcon, Users, Bookmark, FileText, Link as LinkIcon } from 'lucide-react';
import { Modal } from './Modal';
import { Button } from './Button';
import { Input } from './Input';
import { Book, Subject } from '../types/database';
import { bookService } from '../services/bookService';
import { subjectService } from '../services/subjectService';

export interface BookModalProps {
  isOpen: boolean;
  onClose: () => void;
  bookToEdit?: Book | null;
  defaultSubjectId?: string | null;
  onSaved?: () => void;
}

export const BookModal: React.FC<BookModalProps> = ({
  isOpen,
  onClose,
  bookToEdit,
  defaultSubjectId,
  onSaved,
}) => {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [subjectId, setSubjectId] = useState<string>('');
  const [title, setTitle] = useState('');
  const [authors, setAuthors] = useState('');
  const [edition, setEdition] = useState('');
  const [totalPages, setTotalPages] = useState<number | ''>('');
  const [readPages, setReadPages] = useState<number | ''>(0);
  const [link, setLink] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setError(null);
      subjectService.getSubjects().then((list) => {
        setSubjects(list);
        if (!bookToEdit) {
          if (defaultSubjectId) {
            setSubjectId(defaultSubjectId);
          } else if (list.length > 0) {
            setSubjectId(list[0].id);
          }
        }
      }).catch(console.error);

      if (bookToEdit) {
        setSubjectId(bookToEdit.subject_id || '');
        setTitle(bookToEdit.title);
        setAuthors(bookToEdit.authors || '');
        setEdition(bookToEdit.edition || '');
        setTotalPages(bookToEdit.total_pages ?? '');
        setReadPages(bookToEdit.read_pages ?? 0);
        setLink(bookToEdit.link || '');
      } else {
        setTitle('');
        setAuthors('');
        setEdition('');
        setTotalPages('');
        setReadPages(0);
        setLink('');
      }
    }
  }, [isOpen, bookToEdit, defaultSubjectId]);

  const handleSave = async () => {
    if (!title.trim() || isSaving) {
      setError('عنوان کتاب نمی‌تواند خالی باشد.');
      return;
    }

    setIsSaving(true);
    setError(null);
    try {
      if (bookToEdit) {
        await bookService.updateBook(bookToEdit.id, {
          title: title.trim(),
          subjectId: subjectId || null,
          authors: authors.trim() || null,
          edition: edition.trim() || null,
          totalPages: totalPages === '' ? null : Number(totalPages),
          readPages: readPages === '' ? 0 : Number(readPages),
          link: link.trim() || null,
        });
      } else {
        await bookService.createBook({
          title: title.trim(),
          subjectId: subjectId || null,
          authors: authors.trim() || null,
          edition: edition.trim() || null,
          totalPages: totalPages === '' ? null : Number(totalPages),
          readPages: readPages === '' ? 0 : Number(readPages),
          link: link.trim() || null,
        });
      }
      onSaved?.();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'خطا در ذخیره‌سازی کتاب');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={bookToEdit ? 'ویرایش کتاب / منبع درسی' : 'افزودن کتاب مرجع / منبع درسی جدید'}
      size="md"
    >
      <div className="space-y-4 text-start">
        {error && (
          <div className="p-2.5 text-xs text-red-600 bg-red-500/10 border border-red-500/20 rounded-lg">
            {error}
          </div>
        )}

        {/* Subject Selector */}
        <div>
          <label className="block text-xs font-semibold text-[#1f1f1f] dark:text-white mb-1.5">
            درس مرتبط (اختیاری یا انتخاب مستقیم)
          </label>
          <select
            value={subjectId}
            onChange={(e) => setSubjectId(e.target.value)}
            className="w-full h-9 text-xs bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-lg px-3 text-[#1f1f1f] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0078d4]"
          >
            <option value="">بدون درس مستقیم (کتاب عمومی / مرجع)</option>
            {subjects.map((subj) => (
              <option key={subj.id} value={subj.id}>
                {subj.name} {subj.code ? `(${subj.code})` : ''}
              </option>
            ))}
          </select>
        </div>

        {/* Title */}
        <div>
          <label className="block text-xs font-semibold text-[#1f1f1f] dark:text-white mb-1.5">
            عنوان کتاب یا جزوه آموزشی <span className="text-red-500">*</span>
          </label>
          <Input
            placeholder="مثال: ریاضیات مهندسی پیشرفته، هوش مصنوعی راجر راسل..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            prefixIcon={<BookIcon className="w-4 h-4" />}
            autoFocus
          />
        </div>

        {/* Authors & Edition */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-[#1f1f1f] dark:text-white mb-1.5">
              نویسنده / مولفین
            </label>
            <Input
              placeholder="مثال: اروین کریزیگ"
              value={authors}
              onChange={(e) => setAuthors(e.target.value)}
              prefixIcon={<Users className="w-4 h-4" />}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#1f1f1f] dark:text-white mb-1.5">
              ویرایش یا سال چاپ
            </label>
            <Input
              placeholder="مثال: ویرایش دهم"
              value={edition}
              onChange={(e) => setEdition(e.target.value)}
              prefixIcon={<Bookmark className="w-4 h-4" />}
            />
          </div>
        </div>

        {/* Pages: Total & Read */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-[#1f1f1f] dark:text-white mb-1.5">
              تعداد کل صفحات
            </label>
            <Input
              type="number"
              min="1"
              placeholder="مثال: 650"
              value={totalPages}
              onChange={(e) => setTotalPages(e.target.value === '' ? '' : Math.max(0, Number(e.target.value)))}
              prefixIcon={<FileText className="w-4 h-4" />}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#1f1f1f] dark:text-white mb-1.5">
              صفحات خوانده‌شده
            </label>
            <Input
              type="number"
              min="0"
              placeholder="مثال: 120"
              value={readPages}
              onChange={(e) => setReadPages(e.target.value === '' ? 0 : Math.max(0, Number(e.target.value)))}
              prefixIcon={<FileText className="w-4 h-4" />}
            />
          </div>
        </div>

        {/* Link / ISBN */}
        <div>
          <label className="block text-xs font-semibold text-[#1f1f1f] dark:text-white mb-1.5">
            لینک دانلود، شابک (ISBN) یا یادداشت منبع
          </label>
          <Input
            placeholder="مثال: https://... یا ISBN: 978-0470458365"
            value={link}
            onChange={(e) => setLink(e.target.value)}
            prefixIcon={<LinkIcon className="w-4 h-4" />}
          />
        </div>

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
            {bookToEdit ? 'بروزرسانی کتاب' : 'افزودن کتاب'}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
