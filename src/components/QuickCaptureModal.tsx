import React, { useState, useEffect, useRef } from 'react';
import {
  Zap,
  StickyNote,
  Link as LinkIcon,
  CheckSquare,
  Mic,
  X,
  Check,
  CornerDownLeft,
} from 'lucide-react';
import { useQuickCaptureStore } from '../store/useQuickCaptureStore';
import { inboxService } from '../services/inboxService';
import { InboxSource } from '../types/database';
import { Button } from './Button';

const SOURCE_OPTIONS: { id: InboxSource; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'quick_capture', label: 'ثبت سریع', icon: Zap },
  { id: 'note', label: 'یادداشت', icon: StickyNote },
  { id: 'link', label: 'پیوند / لینک', icon: LinkIcon },
  { id: 'task_candidate', label: 'پیش‌نویس کار', icon: CheckSquare },
  { id: 'voice', label: 'صوت (P06)', icon: Mic },
];

export const QuickCaptureModal: React.FC = () => {
  const { isOpen, defaultSource, closeModal } = useQuickCaptureStore();
  const [content, setContent] = useState('');
  const [selectedSource, setSelectedSource] = useState<InboxSource>(defaultSource);
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isOpen) {
      setSelectedSource(defaultSource);
      setContent('');
      setShowSuccessToast(false);
      // Auto-focus textarea immediately when opened
      const timer = setTimeout(() => {
        textareaRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen, defaultSource]);

  // Global escape and submit handlers
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === 'Escape') {
        e.preventDefault();
        closeModal();
      } else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        handleSubmit();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, content, selectedSource]);

  const handleSubmit = async () => {
    if (!content.trim() || isSaving) return;

    setIsSaving(true);
    try {
      await inboxService.createCapture({
        rawContent: content,
        source: selectedSource,
      });

      // Show zero-latency visual confirmation
      setShowSuccessToast(true);
      setContent('');

      setTimeout(() => {
        setShowSuccessToast(false);
        closeModal();
      }, 450);
    } catch (err) {
      console.error('Failed to save capture:', err);
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-150">
      <div
        className="w-full max-w-xl bg-white dark:bg-[#252525] rounded-2xl shadow-fluent-elevation-8 border border-black/10 dark:border-white/10 overflow-hidden flex flex-col transition-all text-start"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Bar */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-black/5 dark:border-white/5 bg-black/[0.02] dark:bg-white/[0.02]">
          <div className="flex items-center gap-2 text-sm font-bold text-[#1f1f1f] dark:text-white">
            <Zap className="w-4 h-4 text-[#0078d4]" />
            <span>ثبت سریع ورودی (Rapid Capture)</span>
            <span className="text-[10px] font-mono font-normal text-[#8a8a8a] bg-black/5 dark:bg-white/5 px-2 py-0.5 rounded">
              Ctrl+Shift+C
            </span>
          </div>

          <button
            onClick={closeModal}
            aria-label="بستن پنجره"
            className="p-1 rounded-md text-black/50 dark:text-white/50 hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Source Type Selector Chips */}
        <div className="flex items-center gap-1.5 px-5 pt-3 pb-1 overflow-x-auto select-none">
          {SOURCE_OPTIONS.map((opt) => {
            const Icon = opt.icon;
            const isSelected = selectedSource === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => setSelectedSource(opt.id)}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-all ${
                  isSelected
                    ? 'bg-[#0078d4] text-white shadow-sm'
                    : 'bg-black/5 dark:bg-white/5 text-[#616161] dark:text-[#adadad] hover:bg-black/10 dark:hover:bg-white/10 hover:text-black dark:hover:text-white'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{opt.label}</span>
              </button>
            );
          })}
        </div>

        {/* Auto-focused Textarea */}
        <div className="p-5 relative">
          <textarea
            ref={textareaRef}
            rows={4}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={
              selectedSource === 'link'
                ? 'آدرس پیوند یا متن وب را وارد کنید...'
                : selectedSource === 'task_candidate'
                ? 'کاری که باید بعداً پیگیری یا برنامه‌ریزی شود را یادداشت کنید...'
                : selectedSource === 'note'
                ? 'ایده، نکته یا فکر گذرا را اینجا بنویسید...'
                : 'چه چیزی در ذهن دارید؟ سریع ثبت کنید...'
            }
            className="w-full bg-transparent resize-none border-none text-[#1f1f1f] dark:text-white placeholder-[#8a8a8a] text-sm leading-relaxed focus:outline-none"
          />

          {/* Success Toast Overlay */}
          {showSuccessToast && (
            <div className="absolute inset-0 bg-white/90 dark:bg-[#252525]/90 flex items-center justify-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold text-sm animate-in fade-in zoom-in-95 duration-150">
              <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center">
                <Check className="w-5 h-5" />
              </div>
              <span>ورودی با موفقیت در صندوق ورودی ذخیره شد!</span>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between px-5 py-3 bg-black/[0.02] dark:bg-white/[0.02] border-t border-black/5 dark:border-white/5">
          <div className="flex items-center gap-2 text-xs text-[#8a8a8a]">
            <span className="hidden sm:inline">ارسال سریع:</span>
            <kbd className="px-1.5 py-0.5 rounded bg-black/5 dark:bg-white/10 text-[10px] font-mono">
              Ctrl + Enter
            </kbd>
            <span className="text-black/20 dark:text-white/20">|</span>
            <kbd className="px-1.5 py-0.5 rounded bg-black/5 dark:bg-white/10 text-[10px] font-mono">
              Esc جهت لغو
            </kbd>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="subtle" size="sm" onClick={closeModal}>
              انصراف
            </Button>
            <Button
              variant="primary"
              size="sm"
              disabled={!content.trim() || isSaving}
              isLoading={isSaving}
              onClick={handleSubmit}
              icon={<CornerDownLeft className="w-3.5 h-3.5" />}
            >
              ذخیره در صندوق
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
