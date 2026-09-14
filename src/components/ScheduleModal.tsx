import React, { useState, useEffect } from 'react';
import {
  Calendar as CalendarIcon,
  Clock,
  Tag,
  CheckSquare,
  BookOpen,
} from 'lucide-react';
import { Modal } from './Modal';
import { Button } from './Button';
import { Input } from './Input';
import {
  Schedule,
  ScheduleEntityType,
  ScheduleStatus,
  Task,
  Topic,
} from '../types/database';
import { scheduleService } from '../services/scheduleService';
import { taskService } from '../services/taskService';
import { db } from '../db/client';

export interface ScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  scheduleToEdit?: Schedule | null;
  defaultDate?: string; // YYYY-MM-DD
  defaultStartTime?: string; // HH:mm
  onSaved?: () => void;
}

const COLOR_PRESETS = [
  '#0078d4', // Blue
  '#107c41', // Green
  '#d83b01', // Orange
  '#8764b8', // Purple
  '#e3008c', // Pink
  '#008272', // Teal
  '#5c2d91', // Indigo
  '#6b7280', // Gray
];

export const ScheduleModal: React.FC<ScheduleModalProps> = ({
  isOpen,
  onClose,
  scheduleToEdit,
  defaultDate,
  defaultStartTime,
  onSaved,
}) => {
  const [title, setTitle] = useState('');
  const [entityType, setEntityType] = useState<ScheduleEntityType>('general');
  const [entityId, setEntityId] = useState<string>('');
  const [startDate, setStartDate] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [endDate, setEndDate] = useState('');
  const [endTime, setEndTime] = useState('10:00');
  const [isAllDay, setIsAllDay] = useState(false);
  const [colorTag, setColorTag] = useState('#0078d4');
  const [status, setStatus] = useState<ScheduleStatus>('planned');

  const [tasks, setTasks] = useState<Task[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setError(null);

      // Load tasks and topics
      taskService.getTasks().then(setTasks).catch(console.error);
      db.query<Topic>('SELECT * FROM topics WHERE is_deleted = 0 ORDER BY title ASC')
        .then(setTopics)
        .catch(console.error);

      if (scheduleToEdit) {
        setTitle(scheduleToEdit.title);
        setEntityType(scheduleToEdit.entity_type);
        setEntityId(scheduleToEdit.entity_id || '');
        setColorTag(scheduleToEdit.color_tag || '#0078d4');
        setStatus(scheduleToEdit.status);
        setIsAllDay(scheduleToEdit.is_all_day === 1);

        const start = new Date(scheduleToEdit.start_time);
        const end = new Date(scheduleToEdit.end_time);

        setStartDate(start.toISOString().split('T')[0]);
        setStartTime(
          `${String(start.getUTCHours()).padStart(2, '0')}:${String(start.getUTCMinutes()).padStart(2, '0')}`
        );
        setEndDate(end.toISOString().split('T')[0]);
        setEndTime(
          `${String(end.getUTCHours()).padStart(2, '0')}:${String(end.getUTCMinutes()).padStart(2, '0')}`
        );
      } else {
        const todayStr = defaultDate || new Date().toISOString().split('T')[0];
        const sTime = defaultStartTime || '09:00';
        const eHour = String((Number(sTime.split(':')[0]) + 1) % 24).padStart(2, '0');
        const eTime = `${eHour}:${sTime.split(':')[1] || '00'}`;

        setTitle('');
        setEntityType('general');
        setEntityId('');
        setStartDate(todayStr);
        setStartTime(sTime);
        setEndDate(todayStr);
        setEndTime(eTime);
        setIsAllDay(false);
        setColorTag('#0078d4');
        setStatus('planned');
      }
    }
  }, [isOpen, scheduleToEdit, defaultDate, defaultStartTime]);

  const handleEntityChange = (type: ScheduleEntityType, id: string) => {
    setEntityType(type);
    setEntityId(id);
    if (!title) {
      if (type === 'task') {
        const t = tasks.find((item) => item.id === id);
        if (t) setTitle(t.title);
      } else if (type === 'topic') {
        const top = topics.find((item) => item.id === id);
        if (top) setTitle(top.title);
      }
    }
  };

  const handleSave = async () => {
    if (!title.trim()) {
      setError('لطفاً عنوان زمان‌بندی را وارد کنید.');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const startIso = isAllDay
        ? `${startDate}T00:00:00.000Z`
        : `${startDate}T${startTime}:00.000Z`;
      const endIso = isAllDay
        ? `${endDate}T23:59:59.999Z`
        : `${endDate}T${endTime}:00.000Z`;

      if (new Date(endIso) < new Date(startIso)) {
        throw new Error('زمان پایان نمی‌تواند قبل از زمان شروع باشد.');
      }

      if (scheduleToEdit) {
        await scheduleService.updateSchedule(scheduleToEdit.id, {
          title: title.trim(),
          entityType,
          entityId: entityId || null,
          startTime: startIso,
          endTime: endIso,
          isAllDay,
          colorTag,
          status,
        });
      } else {
        await scheduleService.createSchedule({
          title: title.trim(),
          entityType,
          entityId: entityId || null,
          startTime: startIso,
          endTime: endIso,
          isAllDay,
          colorTag,
          status,
        });
      }

      onSaved?.();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'خطا در ذخیره زمان‌بندی');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={scheduleToEdit ? 'ویرایش بلوک زمانی' : 'ثبت بلوک زمانی جدید (Time Block)'}
      size="md"
    >
      <div className="space-y-4 text-start">
        {error && (
          <div className="p-2.5 text-xs text-red-600 bg-red-500/10 border border-red-500/20 rounded-lg">
            {error}
          </div>
        )}

        {/* Title Input */}
        <div>
          <label className="block text-xs font-semibold text-[#1f1f1f] dark:text-white mb-1.5">
            عنوان رویداد / بلوک تمرکز *
          </label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="مثال: مطالعه فصل ۳ سیستم‌های عامل، حل تمرین..."
            prefixIcon={<CalendarIcon className="w-4 h-4" />}
            autoFocus
          />
        </div>

        {/* Entity Association Segment */}
        <div className="space-y-2">
          <label className="block text-xs font-semibold text-[#1f1f1f] dark:text-white">
            نوع بلوک زمانی
          </label>
          <div className="grid grid-cols-4 gap-1.5">
            {[
              { id: 'general' as ScheduleEntityType, label: 'عمومی / آزاد' },
              { id: 'task' as ScheduleEntityType, label: 'وظیفه (Task)' },
              { id: 'topic' as ScheduleEntityType, label: 'درس / مبحث' },
              { id: 'event' as ScheduleEntityType, label: 'رویداد ثابت' },
            ].map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setEntityType(t.id)}
                className={`py-1.5 px-2 text-xs rounded-lg border font-medium transition-all text-center ${
                  entityType === t.id
                    ? 'border-[#0078d4] bg-[#0078d4]/10 text-[#0078d4] dark:text-[#60a5fa] font-bold'
                    : 'border-black/10 dark:border-white/10 text-[#616161] hover:bg-black/5 dark:hover:bg-white/5'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {entityType === 'task' && (
            <div className="pt-1">
              <label className="block text-[11px] text-[#8a8a8a] mb-1 flex items-center gap-1">
                <CheckSquare className="w-3 h-3 text-[#0078d4]" />
                <span>انتخاب وظیفه مرتبط:</span>
              </label>
              <select
                value={entityId}
                onChange={(e) => handleEntityChange('task', e.target.value)}
                className="w-full h-8 text-xs bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-lg px-2 text-[#1f1f1f] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0078d4]"
              >
                <option value="">(انتخاب وظیفه)</option>
                {tasks.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.title}
                  </option>
                ))}
              </select>
            </div>
          )}

          {entityType === 'topic' && (
            <div className="pt-1">
              <label className="block text-[11px] text-[#8a8a8a] mb-1 flex items-center gap-1">
                <BookOpen className="w-3 h-3 text-purple-500" />
                <span>انتخاب مبحث درسی:</span>
              </label>
              <select
                value={entityId}
                onChange={(e) => handleEntityChange('topic', e.target.value)}
                className="w-full h-8 text-xs bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-lg px-2 text-[#1f1f1f] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0078d4]"
              >
                <option value="">(انتخاب مبحث)</option>
                {topics.map((top) => (
                  <option key={top.id} value={top.id}>
                    {top.title}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Date and Time Pickers */}
        <div className="grid grid-cols-2 gap-3 pt-1">
          <div>
            <label className="block text-xs font-semibold text-[#1f1f1f] dark:text-white mb-1">
              تاریخ و زمان شروع
            </label>
            <div className="space-y-1.5">
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                prefixIcon={<CalendarIcon className="w-3.5 h-3.5" />}
              />
              {!isAllDay && (
                <Input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  prefixIcon={<Clock className="w-3.5 h-3.5" />}
                />
              )}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#1f1f1f] dark:text-white mb-1">
              تاریخ و زمان پایان
            </label>
            <div className="space-y-1.5">
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                prefixIcon={<CalendarIcon className="w-3.5 h-3.5" />}
              />
              {!isAllDay && (
                <Input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  prefixIcon={<Clock className="w-3.5 h-3.5" />}
                />
              )}
            </div>
          </div>
        </div>

        {/* All Day Checkbox & Color Tag */}
        <div className="flex items-center justify-between pt-1">
          <label className="flex items-center gap-2 cursor-pointer text-xs text-[#1f1f1f] dark:text-white">
            <input
              type="checkbox"
              checked={isAllDay}
              onChange={(e) => setIsAllDay(e.target.checked)}
              className="rounded border-black/20 dark:border-white/20 text-[#0078d4] focus:ring-[#0078d4]"
            />
            <span>تمام روز (All Day)</span>
          </label>

          {/* Color palette */}
          <div className="flex items-center gap-1.5">
            <Tag className="w-3.5 h-3.5 text-[#8a8a8a]" />
            <div className="flex items-center gap-1">
              {COLOR_PRESETS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColorTag(c)}
                  className={`w-4 h-4 rounded-full transition-transform ${
                    colorTag === c ? 'scale-125 ring-2 ring-offset-1 ring-[#0078d4]' : 'opacity-80 hover:opacity-100'
                  }`}
                  style={{ backgroundColor: c }}
                  title={c}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="flex items-center justify-end gap-2 pt-4 border-t border-black/10 dark:border-white/10">
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
            {scheduleToEdit ? 'بروزرسانی زمان‌بندی' : 'افزودن به تقویم'}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
