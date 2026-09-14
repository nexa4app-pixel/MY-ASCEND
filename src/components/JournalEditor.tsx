import React, { useState, useEffect, useCallback } from 'react';
import {
  ChevronRight,
  ChevronLeft,
  Save,
  Check,
  Zap,
  Tag,
  BookOpen,
} from 'lucide-react';
import { Card } from './Card';
import { Button } from './Button';
import { Badge } from './Badge';
import { journalService } from '../services/journalService';
import { JournalEntry } from '../types/database';
import { formatJalaliDisplay } from '../lib/date/jalali';

export interface JournalEditorProps {
  onEntrySaved?: () => void;
}

const MOODS = [
  { score: 1, label: 'خسته / بد', emoji: '😞', color: 'border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400' },
  { score: 2, label: 'بی‌حوصله', emoji: '😕', color: 'border-orange-500/30 bg-orange-500/10 text-orange-600 dark:text-orange-400' },
  { score: 3, label: 'معمولی', emoji: '😐', color: 'border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400' },
  { score: 4, label: 'خوب', emoji: '🙂', color: 'border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-400' },
  { score: 5, label: 'عالی', emoji: '🌟', color: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' },
];

export const JournalEditor: React.FC<JournalEditorProps> = ({ onEntrySaved }) => {
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [entry, setEntry] = useState<JournalEntry | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [moodScore, setMoodScore] = useState<number | null>(null);
  const [energyLevel, setEnergyLevel] = useState<number | null>(null);
  const [tags, setTags] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const dateStr = currentDate.toISOString().split('T')[0];

  const loadEntry = useCallback(async () => {
    try {
      const data = await journalService.getJournalEntryByDate(dateStr);
      setEntry(data);
      if (data) {
        setTitle(data.title || '');
        setContent(data.content || '');
        setMoodScore(data.mood_score ?? null);
        setEnergyLevel(data.energy_level ?? null);
        setTags(data.tags || '');
      } else {
        setTitle('');
        setContent('');
        setMoodScore(null);
        setEnergyLevel(null);
        setTags('');
      }
      setSavedSuccess(false);
    } catch (err) {
      console.error('Failed to load journal entry:', err);
    }
  }, [dateStr]);

  useEffect(() => {
    loadEntry();
  }, [loadEntry]);

  const handlePrevDay = () => {
    const d = new Date(currentDate);
    d.setDate(d.getDate() - 1);
    setCurrentDate(d);
  };

  const handleNextDay = () => {
    const d = new Date(currentDate);
    d.setDate(d.getDate() + 1);
    setCurrentDate(d);
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const saved = await journalService.saveJournalEntry({
        entryDate: dateStr,
        title: title.trim() || null,
        content: content.trim(),
        moodScore,
        energyLevel,
        tags: tags.trim() || null,
      });

      setEntry(saved);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2500);
      onEntrySaved?.();
    } catch (err) {
      console.error('Failed to save journal entry:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0;
  const isToday = dateStr === new Date().toISOString().split('T')[0];

  return (
    <Card variant="acrylic" className="p-6 space-y-6 text-start select-none">
      {/* Date Navigation Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-black/8 dark:border-white/8">
        <div className="flex items-center gap-2">
          <Button variant="subtle" size="sm" onClick={handleNextDay} aria-label="روز بعد">
            <ChevronRight className="w-4 h-4" />
          </Button>
          <Button variant={isToday ? 'primary' : 'secondary'} size="sm" onClick={handleToday}>
            امروز
          </Button>
          <Button variant="subtle" size="sm" onClick={handlePrevDay} aria-label="روز قبل">
            <ChevronLeft className="w-4 h-4" />
          </Button>

          <div className="ms-3 flex items-center gap-2">
            <span className="font-bold text-base text-[#1f1f1f] dark:text-white font-mono">
              {formatJalaliDisplay(currentDate)}
            </span>
            <span className="text-xs text-[#8a8a8a] font-mono">({dateStr})</span>
            {entry && (
              <Badge variant="success" size="sm">
                ثبت‌شده
              </Badge>
            )}
          </div>
        </div>

        {/* Save feedback & button */}
        <div className="flex items-center gap-3">
          {savedSuccess && (
            <span className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-semibold animate-pulse">
              <Check className="w-3.5 h-3.5" />
              ذخیره شد!
            </span>
          )}
          <Button
            variant="primary"
            size="sm"
            icon={<Save className="w-3.5 h-3.5" />}
            onClick={handleSave}
            disabled={isSaving}
            isLoading={isSaving}
          >
            ذخیره ژورنال
          </Button>
        </div>
      </div>

      {/* Mood and Energy Rating Selectors */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* 5-Tier Mood Selector */}
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-[#1f1f1f] dark:text-white">
            حالت روحی و خلق‌وخو (Mood Score)
          </label>
          <div className="grid grid-cols-5 gap-1.5">
            {MOODS.map((m) => {
              const isSelected = moodScore === m.score;
              return (
                <button
                  key={m.score}
                  type="button"
                  onClick={() => setMoodScore(m.score)}
                  className={`p-2 rounded-xl border text-center transition-all flex flex-col items-center gap-1 ${
                    isSelected
                      ? `${m.color} ring-2 ring-[#0078d4] font-bold shadow-sm scale-105`
                      : 'border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5 opacity-80 hover:opacity-100'
                  }`}
                >
                  <span className="text-xl">{m.emoji}</span>
                  <span className="text-[10px] text-[#1f1f1f] dark:text-white truncate">
                    {m.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 5-Tier Energy Level Selector */}
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-[#1f1f1f] dark:text-white flex items-center gap-1">
            <Zap className="w-3.5 h-3.5 text-amber-500" />
            <span>سطح انرژی و توانمندی (Energy Level)</span>
          </label>
          <div className="grid grid-cols-5 gap-1.5">
            {[
              { level: 1, label: 'خالی (۱)', desc: 'بسیار کم' },
              { level: 2, label: 'پایین (۲)', desc: 'کم‌انرژی' },
              { level: 3, label: 'متوسط (۳)', desc: 'نرمال' },
              { level: 4, label: 'بالا (۴)', desc: 'پرانرژی' },
              { level: 5, label: 'حداکثر (۵)', desc: 'فوق‌العاده' },
            ].map((e) => {
              const isSelected = energyLevel === e.level;
              return (
                <button
                  key={e.level}
                  type="button"
                  onClick={() => setEnergyLevel(e.level)}
                  className={`p-2 rounded-xl border text-center transition-all flex flex-col items-center justify-center gap-0.5 ${
                    isSelected
                      ? 'border-amber-500/40 bg-amber-500/15 text-amber-600 dark:text-amber-400 font-bold ring-2 ring-amber-500 scale-105 shadow-sm'
                      : 'border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5 text-[#616161]'
                  }`}
                >
                  <span className="text-xs font-bold font-mono">⚡ {e.level}</span>
                  <span className="text-[10px] text-[#8a8a8a]">{e.desc}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Title Input */}
      <div className="space-y-1">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="عنوان روز یا رویداد برجسته امروز (اختیاری)..."
          className="w-full text-sm font-bold bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-lg px-3 py-2 text-[#1f1f1f] dark:text-white placeholder-[#8a8a8a] focus:outline-none focus:ring-2 focus:ring-[#0078d4]"
        />
      </div>

      {/* Writing Canvas / Textarea */}
      <div className="space-y-1.5">
        <label className="block text-xs font-semibold text-[#1f1f1f] dark:text-white flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <BookOpen className="w-3.5 h-3.5 text-[#0078d4]" />
            <span>یادداشت‌ها، بازتاب روزانه و افکار شخصی</span>
          </span>
          <span className="text-[11px] text-[#8a8a8a] font-mono font-normal">
            تعداد کلمات: {wordCount}
          </span>
        </label>
        <textarea
          rows={10}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="امروز چه گذشت؟ چه دستاوردهایی داشتی، چه موانعی پیش آمد و برای فردا چه تصمیمی داری؟..."
          className="w-full text-sm bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-xl p-3.5 text-[#1f1f1f] dark:text-white placeholder-[#8a8a8a] focus:outline-none focus:ring-2 focus:ring-[#0078d4] resize-y leading-relaxed"
        />
      </div>

      {/* Tags Input */}
      <div className="flex items-center gap-2 pt-1">
        <Tag className="w-4 h-4 text-[#8a8a8a]" />
        <input
          type="text"
          value={tags}
          onChange={(e) => setTags(e.target.value)}
          placeholder="برچسب‌ها (با کاما جدا کنید: شکرگزاری, ورزش, مطالعه, رشد)..."
          className="flex-1 text-xs bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-lg px-2.5 py-1.5 text-[#1f1f1f] dark:text-white placeholder-[#8a8a8a] focus:outline-none focus:ring-2 focus:ring-[#0078d4]"
        />
      </div>
    </Card>
  );
};
