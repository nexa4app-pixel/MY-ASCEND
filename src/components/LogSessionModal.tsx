import React, { useState, useEffect } from 'react';
import { Clock, Star, FileText, CheckCircle2 } from 'lucide-react';
import { Modal } from './Modal';
import { Button } from './Button';
import { Input } from './Input';
import {
  LearningActivityType,
  Subject,
  Topic,
} from '../types/database';
import { learningService } from '../services/learningService';
import { subjectService } from '../services/subjectService';
import { db } from '../db/client';

export interface LogSessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTopicId?: string | null;
  defaultSubjectId?: string | null;
  defaultActivityType?: LearningActivityType;
  onSessionSaved?: () => void;
}

const ACTIVITY_TYPES: {
  value: LearningActivityType;
  label: string;
  desc: string;
}[] = [
  { value: 'study', label: 'مطالعه عمیق (Study)', desc: 'خواندن سرفصل، جزوه یا مشاهده ویدیو' },
  { value: 'practice', label: 'حل تمرین و تست (Practice)', desc: 'حل مسئله، تمرین عملی و کدنویسی' },
  { value: 'review', label: 'مرور فعال (Active Recall)', desc: 'فلش‌کارت، بازخوانی مفهومی و مرور فاصله‌دار' },
  { value: 'teaching', label: 'روش فاینمن (Teaching)', desc: 'تدریس به زبان ساده به خود یا دیگران' },
];

export const LogSessionModal: React.FC<LogSessionModalProps> = ({
  isOpen,
  onClose,
  defaultTopicId,
  defaultSubjectId,
  defaultActivityType = 'study',
  onSessionSaved,
}) => {
  const [activityType, setActivityType] = useState<LearningActivityType>(defaultActivityType);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('');
  const [selectedTopicId, setSelectedTopicId] = useState<string>('');
  const [durationMinutes, setDurationMinutes] = useState<number | ''>(30);
  const [comprehensionRating, setComprehensionRating] = useState<number>(4);
  const [summary, setSummary] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setError(null);
      setActivityType(defaultActivityType);
      setDurationMinutes(30);
      setComprehensionRating(4);
      setSummary('');

      // Load subjects
      subjectService.getSubjects().then((subjs) => {
        setSubjects(subjs);
        if (defaultSubjectId) {
          setSelectedSubjectId(defaultSubjectId);
        } else if (subjs.length > 0) {
          setSelectedSubjectId(subjs[0].id);
        }
      }).catch(console.error);

      // Load topics
      db.query<Topic>('SELECT * FROM topics WHERE is_deleted = 0 ORDER BY title ASC')
        .then((tops) => {
          setTopics(tops);
          if (defaultTopicId) {
            setSelectedTopicId(defaultTopicId);
          }
        })
        .catch(console.error);
    }
  }, [isOpen, defaultTopicId, defaultSubjectId, defaultActivityType]);

  // Filter topics by selected subject
  const availableTopics = selectedSubjectId
    ? topics.filter((t) => t.subject_id === selectedSubjectId)
    : topics;

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);
    try {
      await learningService.logSession({
        topicId: selectedTopicId || null,
        subjectId: selectedSubjectId || null,
        activityType,
        durationMinutes: durationMinutes === '' ? null : Number(durationMinutes),
        comprehensionRating,
        summary: summary.trim() || null,
      });

      onSessionSaved?.();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'خطا در ثبت جلسه یادگیری');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="ثبت جلسه یادگیری فعال (Active Learning Session)"
      size="md"
    >
      <div className="space-y-4 text-start">
        {error && (
          <div className="p-2.5 text-xs text-red-600 bg-red-500/10 border border-red-500/20 rounded-lg">
            {error}
          </div>
        )}

        {/* Activity Type Segmented Control */}
        <div>
          <label className="block text-xs font-semibold text-[#1f1f1f] dark:text-white mb-1.5">
            نوع فعالیت یادگیری
          </label>
          <div className="grid grid-cols-2 gap-2">
            {ACTIVITY_TYPES.map((act) => {
              const isSelected = activityType === act.value;
              return (
                <button
                  key={act.value}
                  type="button"
                  onClick={() => setActivityType(act.value)}
                  className={`p-2 rounded-lg border text-start transition-all ${
                    isSelected
                      ? 'border-[#0078d4] bg-[#0078d4]/10 dark:bg-[#0078d4]/20'
                      : 'border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#1f1f1f] dark:text-white">
                      {act.label}
                    </span>
                    {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-[#0078d4]" />}
                  </div>
                  <p className="text-[10px] text-[#8a8a8a] mt-0.5">{act.desc}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Subject & Topic Selectors */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-[#1f1f1f] dark:text-white mb-1.5">
              درس مرتبط
            </label>
            <select
              value={selectedSubjectId}
              onChange={(e) => {
                setSelectedSubjectId(e.target.value);
                setSelectedTopicId('');
              }}
              className="w-full h-9 text-xs bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-lg px-2.5 text-[#1f1f1f] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0078d4]"
            >
              <option value="">(انتخاب درس)</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#1f1f1f] dark:text-white mb-1.5">
              مبحث اختصاصی (جهت محاسبه تسلط SM-2)
            </label>
            <select
              value={selectedTopicId}
              onChange={(e) => setSelectedTopicId(e.target.value)}
              className="w-full h-9 text-xs bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-lg px-2.5 text-[#1f1f1f] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0078d4]"
            >
              <option value="">(انتخاب مبحث)</option>
              {availableTopics.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.title}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Duration & Comprehension Rating */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
          <div>
            <label className="block text-xs font-semibold text-[#1f1f1f] dark:text-white mb-1.5">
              مدت زمان جلسه (دقیقه)
            </label>
            <Input
              type="number"
              min="1"
              placeholder="30"
              value={durationMinutes}
              onChange={(e) =>
                setDurationMinutes(e.target.value === '' ? '' : Math.max(0, Number(e.target.value)))
              }
              prefixIcon={<Clock className="w-4 h-4" />}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#1f1f1f] dark:text-white mb-1.5">
              میزان درک و کیفیت یادآوری (۱ تا ۵)
            </label>
            <div className="flex items-center gap-1 bg-black/5 dark:bg-white/5 p-1.5 rounded-lg border border-black/10 dark:border-white/10 justify-center">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setComprehensionRating(star)}
                  className="p-1 hover:scale-125 transition-transform"
                  title={`سطح ${star}`}
                >
                  <Star
                    className={`w-5 h-5 ${
                      star <= comprehensionRating
                        ? 'fill-amber-400 text-amber-400'
                        : 'text-[#8a8a8a]/40'
                    }`}
                  />
                </button>
              ))}
              <span className="text-xs font-mono font-bold ps-1 text-[#1f1f1f] dark:text-white">
                {comprehensionRating}/5
              </span>
            </div>
          </div>
        </div>

        {/* Notes / Summary */}
        <div>
          <label className="block text-xs font-semibold text-[#1f1f1f] dark:text-white mb-1.5 flex items-center gap-1">
            <FileText className="w-3.5 h-3.5 text-[#8a8a8a]" />
            <span>نکات کلیدی و خلاصه جلسه (اختیاری)</span>
          </label>
          <textarea
            rows={2}
            placeholder="نکات مهم، اشتباهات رایج یا فرمول‌های کلیدی مرور شده..."
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            className="w-full text-xs bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-lg p-2.5 text-[#1f1f1f] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0078d4] resize-none"
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
            disabled={isSaving}
            isLoading={isSaving}
          >
            ثبت جلسه و بروزرسانی تسلط
          </Button>
        </div>
      </div>
    </Modal>
  );
};
