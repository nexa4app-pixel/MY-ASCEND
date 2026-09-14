import React, { useState, useEffect } from 'react';
import { Sparkles } from 'lucide-react';
import { Card } from './Card';
import { journalService } from '../services/journalService';
import { JournalEntry } from '../types/database';

export const MoodHeatmap: React.FC = () => {
  const [entries, setEntries] = useState<JournalEntry[]>([]);

  useEffect(() => {
    // Load last 35 days entries
    const endDate = new Date().toISOString().split('T')[0];
    const startDateObj = new Date(Date.now() - 35 * 86400000);
    const startDate = startDateObj.toISOString().split('T')[0];

    journalService.getJournalEntries({ startDate, endDate }).then(setEntries).catch(console.error);
  }, []);

  // Generate list of the last 28 days
  const days: { dateStr: string; entry?: JournalEntry }[] = [];
  for (let i = 27; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000);
    const dateStr = d.toISOString().split('T')[0];
    const match = entries.find((e) => e.entry_date === dateStr);
    days.push({ dateStr, entry: match });
  }

  const getMoodColor = (score?: number | null) => {
    switch (score) {
      case 1:
        return 'bg-red-500 text-white';
      case 2:
        return 'bg-orange-500 text-white';
      case 3:
        return 'bg-amber-400 text-black';
      case 4:
        return 'bg-blue-500 text-white';
      case 5:
        return 'bg-emerald-500 text-white';
      default:
        return 'bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-transparent';
    }
  };

  return (
    <Card variant="acrylic" className="p-4 space-y-3 text-start select-none">
      <div className="flex items-center justify-between">
        <h4 className="font-bold text-xs text-[#1f1f1f] dark:text-white flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
          <span>نقشه خلق‌وخوی ۴ هفته اخیر</span>
        </h4>
        <span className="text-[10px] text-[#8a8a8a] font-mono">۲۸ روز اخیر</span>
      </div>

      {/* Grid of 28 squares (4 weeks x 7 days) */}
      <div className="grid grid-cols-7 gap-1.5">
        {days.map(({ dateStr, entry: dayEntry }) => {
          const mood = dayEntry?.mood_score;
          const tooltip = dayEntry
            ? `${dateStr}: خلق‌وخو ${mood}/5 | انرژی ${dayEntry.energy_level || '—'}/5`
            : `${dateStr}: بدون ثبت ژورنال`;

          return (
            <div
              key={dateStr}
              title={tooltip}
              className={`h-7 rounded-lg flex items-center justify-center text-[10px] font-bold font-mono transition-transform hover:scale-110 cursor-pointer ${getMoodColor(
                mood
              )}`}
            >
              {mood ? mood : ''}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-between pt-2 border-t border-black/5 dark:border-white/5 text-[10px] text-[#8a8a8a]">
        <span>خسته (۱)</span>
        <div className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded bg-red-500" />
          <span className="w-2.5 h-2.5 rounded bg-orange-500" />
          <span className="w-2.5 h-2.5 rounded bg-amber-400" />
          <span className="w-2.5 h-2.5 rounded bg-blue-500" />
          <span className="w-2.5 h-2.5 rounded bg-emerald-500" />
        </div>
        <span>عالی (۵)</span>
      </div>
    </Card>
  );
};
