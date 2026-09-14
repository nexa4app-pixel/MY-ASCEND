import React, { useState, useEffect, useCallback } from 'react';
import {
  ChevronRight,
  ChevronLeft,
  Plus,
  Clock,
  Trash2,
  Edit3,
} from 'lucide-react';
import { Card } from './Card';
import { Button } from './Button';
import { ScheduleModal } from './ScheduleModal';
import { scheduleService } from '../services/scheduleService';
import { Schedule } from '../types/database';
import { formatJalaliDisplay } from '../lib/date/jalali';

export type CalendarViewMode = 'day' | 'week';

export const ScheduleCalendar: React.FC = () => {
  const [viewMode, setViewMode] = useState<CalendarViewMode>('week');
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [schedules, setSchedules] = useState<Schedule[]>([]);


  const [isModalOpen, setIsModalOpen] = useState(false);
  const [scheduleToEdit, setScheduleToEdit] = useState<Schedule | null>(null);
  const [slotDate, setSlotDate] = useState<string>('');
  const [slotTime, setSlotTime] = useState<string>('09:00');

  // Compute view date range
  const getViewRange = useCallback(() => {
    if (viewMode === 'day') {
      const start = new Date(currentDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(currentDate);
      end.setHours(23, 59, 59, 999);
      return { start, end, days: [new Date(currentDate)] };
    } else {
      // Week starting from Saturday (for Jalali/Middle-Eastern standard) or Monday
      // In JS, 0 is Sunday, 6 is Saturday.
      const d = new Date(currentDate);
      const day = d.getDay(); // 0: Sun, 6: Sat
      const diffToSaturday = (day + 1) % 7; // days since Saturday
      const saturday = new Date(d);
      saturday.setDate(d.getDate() - diffToSaturday);
      saturday.setHours(0, 0, 0, 0);

      const days: Date[] = [];
      for (let i = 0; i < 7; i++) {
        const nextDay = new Date(saturday);
        nextDay.setDate(saturday.getDate() + i);
        days.push(nextDay);
      }

      const endOfWeek = new Date(days[6]);
      endOfWeek.setHours(23, 59, 59, 999);

      return { start: saturday, end: endOfWeek, days };
    }
  }, [viewMode, currentDate]);

  const loadSchedules = useCallback(async () => {
    try {
      const { start, end } = getViewRange();
      const items = await scheduleService.getSchedules({
        startDate: start.toISOString(),
        endDate: end.toISOString(),
      });
      setSchedules(items);
    } catch (err) {
      console.error('Failed to load schedules:', err);
    }
  }, [getViewRange]);

  useEffect(() => {
    loadSchedules();
  }, [loadSchedules]);

  // Navigation handlers
  const handlePrev = () => {
    const d = new Date(currentDate);
    if (viewMode === 'day') {
      d.setDate(d.getDate() - 1);
    } else {
      d.setDate(d.getDate() - 7);
    }
    setCurrentDate(d);
  };

  const handleNext = () => {
    const d = new Date(currentDate);
    if (viewMode === 'day') {
      d.setDate(d.getDate() + 1);
    } else {
      d.setDate(d.getDate() + 7);
    }
    setCurrentDate(d);
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  const handleSlotClick = (dateStr: string, hour: number) => {
    setScheduleToEdit(null);
    setSlotDate(dateStr);
    setSlotTime(`${String(hour).padStart(2, '0')}:00`);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm('آیا از حذف این زمان‌بندی اطمینان دارید؟')) return;
    try {
      await scheduleService.deleteSchedule(id);
      loadSchedules();
    } catch (err) {
      console.error('Failed to delete schedule:', err);
    }
  };

  const { days } = getViewRange();
  const hours = Array.from({ length: 16 }, (_, i) => i + 7); // 07:00 to 22:00

  return (
    <div className="space-y-4 select-none text-start">
      {/* Calendar Header Controls */}
      <Card variant="acrylic" className="p-3 flex flex-wrap items-center justify-between gap-3">
        {/* Navigation buttons */}
        <div className="flex items-center gap-1.5">
          <Button variant="subtle" size="sm" onClick={handleNext} aria-label="بعدی">
            <ChevronRight className="w-4 h-4" />
          </Button>
          <Button variant="secondary" size="sm" onClick={handleToday}>
            امروز
          </Button>
          <Button variant="subtle" size="sm" onClick={handlePrev} aria-label="قبلی">
            <ChevronLeft className="w-4 h-4" />
          </Button>

          <span className="font-bold text-sm text-[#1f1f1f] dark:text-white ms-2 font-mono">
            {formatJalaliDisplay(currentDate)}
          </span>
        </div>

        {/* View mode toggle & add button */}
        <div className="flex items-center gap-2">
          <div className="flex items-center p-0.5 bg-black/5 dark:bg-white/5 rounded-lg border border-black/5 dark:border-white/5 text-xs">
            <button
              onClick={() => setViewMode('day')}
              className={`px-3 py-1 rounded-md transition-all ${
                viewMode === 'day'
                  ? 'bg-white dark:bg-[#333] font-bold text-[#0078d4] dark:text-[#60a5fa] shadow-sm'
                  : 'text-[#8a8a8a] hover:text-black dark:hover:text-white'
              }`}
            >
              نمای روز
            </button>
            <button
              onClick={() => setViewMode('week')}
              className={`px-3 py-1 rounded-md transition-all ${
                viewMode === 'week'
                  ? 'bg-white dark:bg-[#333] font-bold text-[#0078d4] dark:text-[#60a5fa] shadow-sm'
                  : 'text-[#8a8a8a] hover:text-black dark:hover:text-white'
              }`}
            >
              نمای هفته
            </button>
          </div>

          <Button
            variant="primary"
            size="sm"
            icon={<Plus className="w-3.5 h-3.5" />}
            onClick={() => {
              setScheduleToEdit(null);
              setSlotDate(new Date().toISOString().split('T')[0]);
              setSlotTime('09:00');
              setIsModalOpen(true);
            }}
          >
            + زمان‌بندی
          </Button>
        </div>
      </Card>

      {/* Main Grid View */}
      <Card variant="acrylic" className="p-0 overflow-x-auto border border-black/8 dark:border-white/8">
        <div className="min-w-[700px]">
          {/* Days Header */}
          <div
            className="grid border-b border-black/10 dark:border-white/10 bg-black/3 dark:bg-white/3 text-xs font-semibold"
            style={{ gridTemplateColumns: `60px repeat(${days.length}, 1fr)` }}
          >
            <div className="p-2.5 text-center text-[#8a8a8a] border-e border-black/5 dark:border-white/5">
              <Clock className="w-3.5 h-3.5 mx-auto" />
            </div>
            {days.map((day) => {
              const isToday = day.toISOString().split('T')[0] === new Date().toISOString().split('T')[0];
              const dayNames = ['یک‌شنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنج‌شنبه', 'جمعه', 'شنبه'];
              const dayName = dayNames[day.getDay()];

              return (
                <div
                  key={day.toISOString()}
                  className={`p-2.5 text-center border-e border-black/5 dark:border-white/5 last:border-e-0 ${
                    isToday ? 'bg-[#0078d4]/10 text-[#0078d4] dark:text-[#60a5fa] font-bold' : 'text-[#1f1f1f] dark:text-white'
                  }`}
                >
                  <div>{dayName}</div>
                  <div className="text-[10px] text-[#8a8a8a] font-mono mt-0.5">
                    {day.toISOString().split('T')[0]}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Time Slot Rows */}
          <div className="divide-y divide-black/5 dark:divide-white/5">
            {hours.map((hour) => {
              const timeLabel = `${String(hour).padStart(2, '0')}:00`;

              return (
                <div
                  key={hour}
                  className="grid min-h-[56px]"
                  style={{ gridTemplateColumns: `60px repeat(${days.length}, 1fr)` }}
                >
                  {/* Hour label */}
                  <div className="p-2 text-center text-[10px] text-[#8a8a8a] font-mono border-e border-black/5 dark:border-white/5 bg-black/1 dark:bg-white/1">
                    {timeLabel}
                  </div>

                  {/* Day Columns */}
                  {days.map((day) => {
                    const dateStr = day.toISOString().split('T')[0];

                    // Find schedules intersecting this day and hour
                    const daySchedules = schedules.filter((s) => {
                      const start = new Date(s.start_time);
                      const sDate = start.toISOString().split('T')[0];
                      const sHour = start.getUTCHours();
                      return sDate === dateStr && sHour === hour;
                    });

                    return (
                      <div
                        key={dateStr}
                        onClick={() => handleSlotClick(dateStr, hour)}
                        className="p-1 border-e border-black/5 dark:border-white/5 last:border-e-0 hover:bg-black/3 dark:hover:bg-white/3 transition-colors cursor-pointer relative min-h-[56px] space-y-1"
                      >
                        {daySchedules.map((s) => (
                          <div
                            key={s.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              setScheduleToEdit(s);
                              setIsModalOpen(true);
                            }}
                            className="p-1.5 rounded-lg text-white text-[11px] shadow-sm flex items-start justify-between gap-1 group relative overflow-hidden transition-transform hover:scale-[1.02]"
                            style={{ backgroundColor: s.color_tag || '#0078d4' }}
                          >
                            <div className="space-y-0.5 truncate flex-1">
                              <div className="font-bold truncate">{s.title}</div>
                              {s.entity_title && (
                                <div className="text-[9px] opacity-90 truncate">
                                  🔗 {s.entity_title}
                                </div>
                              )}
                            </div>

                            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setScheduleToEdit(s);
                                  setIsModalOpen(true);
                                }}
                                className="p-0.5 hover:bg-black/20 rounded"
                                title="ویرایش"
                              >
                                <Edit3 className="w-2.5 h-2.5" />
                              </button>
                              <button
                                onClick={(e) => handleDelete(s.id, e)}
                                className="p-0.5 hover:bg-black/20 rounded"
                                title="حذف"
                              >
                                <Trash2 className="w-2.5 h-2.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </Card>

      {/* Schedule Create / Edit Modal */}
      <ScheduleModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        scheduleToEdit={scheduleToEdit}
        defaultDate={slotDate}
        defaultStartTime={slotTime}
        onSaved={loadSchedules}
      />
    </div>
  );
};
