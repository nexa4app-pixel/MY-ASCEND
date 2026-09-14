import React, { useState } from 'react';
import { Book as BookIcon, CheckCircle, Edit3, Trash2, ExternalLink, Plus } from 'lucide-react';
import { Card } from './Card';
import { Badge } from './Badge';
import { Button } from './Button';
import { Book } from '../types/database';
import { bookService } from '../services/bookService';

export interface BookProgressCardProps {
  book: Book;
  subjectName?: string | null;
  subjectColor?: string | null;
  onEdit?: (book: Book) => void;
  onDelete?: (book: Book) => void;
  onProgressUpdated?: () => void;
}

export const BookProgressCard: React.FC<BookProgressCardProps> = ({
  book,
  subjectName,
  subjectColor,
  onEdit,
  onDelete,
  onProgressUpdated,
}) => {
  const [readPagesInput, setReadPagesInput] = useState<number>(book.read_pages ?? 0);
  const [isUpdating, setIsUpdating] = useState(false);

  const totalPages = book.total_pages ?? 0;
  const readPages = book.read_pages ?? 0;
  const percent = totalPages > 0 ? Math.min(100, Math.round((readPages / totalPages) * 100)) : 0;

  const handleUpdatePages = async (newVal: number) => {
    const clamped = Math.max(0, Math.min(newVal, totalPages > 0 ? totalPages : 99999));
    setReadPagesInput(clamped);
    setIsUpdating(true);
    try {
      await bookService.updateReadingProgress(book.id, clamped);
      onProgressUpdated?.();
    } catch (err) {
      console.error('Failed to update reading progress:', err);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleQuickAddPages = (delta: number) => {
    handleUpdatePages(readPages + delta);
  };

  return (
    <Card variant="acrylic" className="p-4 space-y-3.5 border border-black/8 dark:border-white/8 hover:border-black/15 dark:hover:border-white/15 transition-all text-start">
      {/* Header: Title, Subject badge, Actions */}
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-sm text-[#1f1f1f] dark:text-white line-clamp-1">
              {book.title}
            </span>
            {subjectName && (
              <span
                className="px-2 py-0.5 rounded-full text-[10px] font-semibold text-white"
                style={{ backgroundColor: subjectColor || '#0078d4' }}
              >
                {subjectName}
              </span>
            )}
            {book.edition && (
              <Badge variant="neutral" size="sm">
                {book.edition}
              </Badge>
            )}
          </div>

          {book.authors && (
            <p className="text-xs text-[#616161] dark:text-[#adadad]">
              نویسنده: {book.authors}
            </p>
          )}
        </div>

        {/* Action icons */}
        <div className="flex items-center gap-1">
          {book.link && (
            <a
              href={book.link}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1 text-[#8a8a8a] hover:text-[#0078d4] dark:hover:text-[#60a5fa] transition-colors"
              title="مشاهده پیوند منبع"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
          {onEdit && (
            <button
              onClick={() => onEdit(book)}
              className="p-1 text-[#8a8a8a] hover:text-black dark:hover:text-white transition-colors"
              title="ویرایش کتاب"
            >
              <Edit3 className="w-3.5 h-3.5" />
            </button>
          )}
          {onDelete && (
            <button
              onClick={() => onDelete(book)}
              className="p-1 text-[#8a8a8a] hover:text-red-500 transition-colors"
              title="انتقال به زباله‌دان"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Progress Bar & Counters */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className="text-[#616161] dark:text-[#adadad] flex items-center gap-1">
            <BookIcon className="w-3.5 h-3.5" />
            <span>صفحات خوانده‌شده:</span>
            <strong className="text-[#1f1f1f] dark:text-white font-mono">
              {readPages} از {totalPages || 'نامشخص'}
            </strong>
          </span>

          <span className="font-mono font-bold text-xs text-[#0078d4] dark:text-[#60a5fa]">
            {percent}٪
          </span>
        </div>

        {/* Progress bar line */}
        <div className="w-full h-2 bg-black/10 dark:bg-white/10 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-300 rounded-full ${
              percent >= 100
                ? 'bg-emerald-500'
                : percent >= 50
                  ? 'bg-[#0078d4]'
                  : 'bg-amber-500'
            }`}
            style={{ width: `${percent}%` }}
          />
        </div>

        {/* Topic stats */}
        <div className="flex items-center justify-between text-[11px] text-[#8a8a8a] pt-1">
          <span className="flex items-center gap-1">
            <CheckCircle className="w-3 h-3 text-emerald-500" />
            <span>
              {book.completed_topic_count ?? 0} از {book.topic_count ?? 0} مبحث مطالعه‌شده
            </span>
          </span>
          <span>{book.chapter_count ?? 0} فصل</span>
        </div>
      </div>

      {/* Inline Reading Progress Updater */}
      <div className="pt-2 border-t border-black/5 dark:border-white/5 flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] text-[#8a8a8a]">بروزرسانی صفحه:</span>
          <input
            type="number"
            min="0"
            max={totalPages > 0 ? totalPages : 99999}
            value={readPagesInput}
            onChange={(e) => setReadPagesInput(Number(e.target.value))}
            onBlur={() => handleUpdatePages(readPagesInput)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleUpdatePages(readPagesInput);
            }}
            disabled={isUpdating}
            className="w-16 h-7 text-xs font-mono text-center bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded px-1 text-[#1f1f1f] dark:text-white focus:outline-none focus:ring-1 focus:ring-[#0078d4]"
          />
        </div>

        {/* Quick increment buttons */}
        <div className="flex items-center gap-1">
          {[5, 10, 20].map((delta) => (
            <Button
              key={delta}
              variant="subtle"
              size="sm"
              disabled={isUpdating || (totalPages > 0 && readPages >= totalPages)}
              onClick={() => handleQuickAddPages(delta)}
              className="text-[10px] px-2 py-0.5 h-6 font-mono"
            >
              <Plus className="w-2.5 h-2.5" />
              <span>{delta}</span>
            </Button>
          ))}
        </div>
      </div>
    </Card>
  );
};
