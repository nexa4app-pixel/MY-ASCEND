import React, { useState, useEffect, useCallback } from 'react';
import {
  Clock,
  Plus,
  Trash2,
  CheckCircle2,
  Circle,
  Flame,
  BookOpen,
  Sparkles,
  ChevronRight,
  ChevronLeft,
  GripVertical,
  Inbox,
  AlertTriangle,
  Play,
} from 'lucide-react';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Badge } from '../components/Badge';
import { Input } from '../components/Input';
import { AIScheduleImportModal } from '../components/AIScheduleImportModal';
import { ScheduleModal } from '../components/ScheduleModal';
import { unifiedScheduleService } from '../services/unifiedScheduleService';
import { taskService } from '../services/taskService';
import { Task, TimeBlock, TaskPriority } from '../types/database';
import { formatJalaliDisplay, getDualDateDisplay } from '../lib/date/jalali';
import { useFocusStore } from '../store/useFocusStore';
import { useNavigationStore } from '../store/useNavigationStore';
import { toast } from '../store/useToastStore';

export type CalendarViewMode = 'day' | 'week';
export type QueueFilter = 'all' | 'q1' | 'q2' | 'q3' | 'q4';

export const UnifiedSchedulePage: React.FC = () => {
  const navigate = useNavigationStore((state) => state.navigate);
  const { setSelectedTask, setSelectedTopic, startTimer } = useFocusStore();

  // State
  const [viewMode, setViewMode] = useState<CalendarViewMode>('week');
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [timeBlocks, setTimeBlocks] = useState<TimeBlock[]>([]);
  const [unscheduledTasks, setUnscheduledTasks] = useState<Task[]>([]);
  const [queueFilter, setQueueFilter] = useState<QueueFilter>('all');
  const [quickTaskTitle, setQuickTaskTitle] = useState('');
  const quickTaskPriority: TaskPriority = 'medium';

  // Modals
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [slotDate, setSlotDate] = useState<string>('');
  const [slotTime, setSlotTime] = useState<string>('09:00');

  // Drag-and-Drop state
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);

  // Compute view date range
  const getViewRange = useCallback(() => {
    if (viewMode === 'day') {
      const start = new Date(currentDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(currentDate);
      end.setHours(23, 59, 59, 999);
      return { start, end, days: [new Date(currentDate)] };
    } else {
      // Week starting from Saturday (standard for Afghan Jalali calendar)
      const d = new Date(currentDate);
      const day = d.getDay(); // 0: Sun, 6: Sat
      const diffToSaturday = (day + 1) % 7;
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

  // Load TimeBlocks and Unscheduled Tasks
  const loadData = useCallback(async () => {
    try {
      const { start, end } = getViewRange();
      const [blocks, pendingTasks] = await Promise.all([
        unifiedScheduleService.getTimeBlocks({
          startDate: start.toISOString(),
          endDate: end.toISOString(),
        }),
        unifiedScheduleService.getUnscheduledTasks(),
      ]);

      setTimeBlocks(blocks);
      setUnscheduledTasks(pendingTasks);
    } catch (err) {
      console.error('Failed to load unified schedule data:', err);
    }
  }, [getViewRange]);

  useEffect(() => {
    loadData();
  }, [loadData]);

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

  // Quick Task Creation
  const handleCreateQuickTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickTaskTitle.trim()) return;

    try {
      await taskService.createTask({
        title: quickTaskTitle.trim(),
        priority: quickTaskPriority,
        status: 'todo',
      });
      setQuickTaskTitle('');
      toast.success('تسک با موفقیت به صف کارهای برنامه‌ریزی‌نشده افزوده شد.');
      loadData();
    } catch (err) {
      console.error('Failed to create quick task:', err);
      toast.error('خطا در ایجاد تسک.');
    }
  };

  // Drag and drop handlers
  const handleDragStart = (taskId: string) => {
    setDraggedTaskId(taskId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDropOnSlot = async (dateStr: string, hour: number) => {
    if (!draggedTaskId) return;

    const startTime = `${dateStr}T${String(hour).padStart(2, '0')}:00:00.000Z`;
    const endHour = (hour + 1) % 24;
    const endTime = `${dateStr}T${String(endHour).padStart(2, '0')}:00:00.000Z`;

    try {
      await unifiedScheduleService.scheduleTask(draggedTaskId, startTime, endTime);
      toast.success('تسک با موفقیت در تقویم زمان‌بندی شد.');
      setDraggedTaskId(null);
      loadData();
    } catch (err) {
      console.error('Failed to schedule task from drag-and-drop:', err);
      toast.error('خطا در زمان‌بندی تسک.');
    }
  };

  // Toggle Time Block Completion
  const handleToggleComplete = async (block: TimeBlock, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await unifiedScheduleService.toggleComplete(block.id);
      loadData();
    } catch (err) {
      console.error('Failed to toggle block status:', err);
    }
  };

  // Delete Time Block
  const handleDeleteBlock = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm('آیا از حذف این بلوک زمانی اطمینان دارید؟')) return;
    try {
      await unifiedScheduleService.deleteTimeBlock(id);
      loadData();
      toast.info('بلوک زمانی و تسک پیوندخورده حذف شدند.');
    } catch (err) {
      console.error('Failed to delete time block:', err);
    }
  };

  // 1-Click "Start Focus" Action
  const handleStartFocus = async (block: TimeBlock, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      setSelectedTask(block.task_id || null, block.title);
      if (block.academic_subject_id) {
        setSelectedTopic(null, block.academic_subject_id, block.title);
      }
      await startTimer();
      navigate('focus');
    } catch (err) {
      console.error('Failed to launch focus timer:', err);
    }
  };

  // Filter unscheduled tasks
  const filteredTasks = unscheduledTasks.filter((t) => {
    if (queueFilter === 'all') return true;
    if (queueFilter === 'q1') return t.priority === 'urgent';
    if (queueFilter === 'q2') return t.priority === 'high';
    if (queueFilter === 'q3') return t.priority === 'medium';
    if (queueFilter === 'q4') return t.priority === 'low';
    return true;
  });

  const { days } = getViewRange();
  const hours = Array.from({ length: 16 }, (_, i) => i + 7); // 07:00 to 22:00
  const dualDate = getDualDateDisplay(currentDate);

  return (
    <div className="max-w-7xl mx-auto space-y-4 select-none text-start">
      {/* ─── Top Bar Header & Controls ─── */}
      <Card variant="acrylic" className="p-3.5 flex flex-wrap items-center justify-between gap-3">
        {/* Left: Jalali Date Display & Navigation */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <Button variant="subtle" size="sm" onClick={handleNext} aria-label="بعدی">
              <ChevronRight className="w-4 h-4 rtl:rotate-180" />
            </Button>
            <Button variant="secondary" size="sm" onClick={handleToday}>
              امروز
            </Button>
            <Button variant="subtle" size="sm" onClick={handlePrev} aria-label="قبلی">
              <ChevronLeft className="w-4 h-4 rtl:rotate-180" />
            </Button>
          </div>

          <div className="ms-2 flex flex-col">
            <span className="font-bold text-sm text-[#1f1f1f] dark:text-white font-mono">
              {dualDate.jalali}
            </span>
            <span className="text-[10px] text-[#8a8a8a] font-mono">{dualDate.gregorian}</span>
          </div>
        </div>

        {/* Center/Right: View Mode & Action Buttons */}
        <div className="flex items-center gap-2.5">
          {/* Day / Week View Mode Switcher */}
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

          {/* AI Schedule Importer Button */}
          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsAiModalOpen(true)}
            className="bg-gradient-to-r from-[#0078d4] to-indigo-600 hover:from-[#106ebe] hover:to-indigo-700 text-white font-bold shadow-sm"
            icon={<Sparkles className="w-3.5 h-3.5 text-amber-300" />}
          >
            واردسازی هوشمند AI
          </Button>

          {/* Manual Add Schedule Button */}
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              setSlotDate(new Date().toISOString().split('T')[0]);
              setSlotTime('09:00');
              setIsManualModalOpen(true);
            }}
            icon={<Plus className="w-3.5 h-3.5" />}
          >
            + زمان‌بندی دستی
          </Button>
        </div>
      </Card>

      {/* ─── Main Workspace: Left Task Queue + Right Calendar Grid ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 items-start">
        {/* ─── LEFT SIDEBAR: UNSCHEDULED TASK QUEUE ─── */}
        <Card variant="acrylic" className="p-3.5 space-y-3.5 lg:col-span-1 border border-black/8 dark:border-white/8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Inbox className="w-4 h-4 text-[#0078d4]" />
              <h3 className="font-bold text-xs text-[#1f1f1f] dark:text-white">کارهای برنامه‌ریزی‌نشده</h3>
            </div>
            <Badge variant="neutral" size="sm">
              {filteredTasks.length} تسک
            </Badge>
          </div>

          {/* Eisenhower Filter Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 text-[11px]">
            <button
              onClick={() => setQueueFilter('all')}
              className={`px-2 py-0.5 rounded ${
                queueFilter === 'all'
                  ? 'bg-[#0078d4]/10 text-[#0078d4] font-bold'
                  : 'text-[#8a8a8a] hover:bg-black/5'
              }`}
            >
              همه
            </button>
            <button
              onClick={() => setQueueFilter('q1')}
              className={`px-2 py-0.5 rounded ${
                queueFilter === 'q1'
                  ? 'bg-rose-500/15 text-rose-500 font-bold'
                  : 'text-[#8a8a8a] hover:bg-black/5'
              }`}
              title="فوری و مهم (Q1)"
            >
              Q1
            </button>
            <button
              onClick={() => setQueueFilter('q2')}
              className={`px-2 py-0.5 rounded ${
                queueFilter === 'q2'
                  ? 'bg-amber-500/15 text-amber-500 font-bold'
                  : 'text-[#8a8a8a] hover:bg-black/5'
              }`}
              title="مهم غیرفوری (Q2)"
            >
              Q2
            </button>
            <button
              onClick={() => setQueueFilter('q3')}
              className={`px-2 py-0.5 rounded ${
                queueFilter === 'q3'
                  ? 'bg-blue-500/15 text-blue-500 font-bold'
                  : 'text-[#8a8a8a] hover:bg-black/5'
              }`}
              title="فوری غیرمهم (Q3)"
            >
              Q3
            </button>
            <button
              onClick={() => setQueueFilter('q4')}
              className={`px-2 py-0.5 rounded ${
                queueFilter === 'q4'
                  ? 'bg-gray-500/15 text-gray-500 font-bold'
                  : 'text-[#8a8a8a] hover:bg-black/5'
              }`}
              title="غیرفوری غیرمهم (Q4)"
            >
              Q4
            </button>
          </div>

          {/* Quick Add Task Form */}
          <form onSubmit={handleCreateQuickTask} className="flex items-center gap-1.5">
            <Input
              value={quickTaskTitle}
              onChange={(e) => setQuickTaskTitle(e.target.value)}
              placeholder="ثبت تسک جدید..."
              className="text-xs py-1.5 flex-1"
            />
            <Button variant="secondary" size="sm" type="submit" disabled={!quickTaskTitle.trim()}>
              <Plus className="w-3 h-3" />
            </Button>
          </form>

          {/* Draggable Task List */}
          <div className="space-y-2 max-h-[520px] overflow-y-auto pe-1">
            {filteredTasks.length === 0 ? (
              <div className="p-4 text-center text-xs text-[#8a8a8a]">
                تسکی در این دسته موجود نیست. برای زمان‌بندی، تسک جدید اضافه کنید.
              </div>
            ) : (
              filteredTasks.map((task) => {
                const priorityColor =
                  task.priority === 'urgent'
                    ? 'border-s-rose-500'
                    : task.priority === 'high'
                    ? 'border-s-amber-500'
                    : task.priority === 'medium'
                    ? 'border-s-blue-500'
                    : 'border-s-gray-400';

                return (
                  <div
                    key={task.id}
                    draggable
                    onDragStart={() => handleDragStart(task.id)}
                    className={`p-2.5 rounded-lg bg-black/2 dark:bg-white/2 border border-black/8 dark:border-white/8 border-s-4 ${priorityColor} hover:shadow-sm cursor-grab active:cursor-grabbing transition-all flex items-center justify-between gap-2`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <GripVertical className="w-3.5 h-3.5 text-[#8a8a8a] shrink-0" />
                      <div className="truncate">
                        <span className="text-xs text-[#1f1f1f] dark:text-white font-medium block truncate">
                          {task.title}
                        </span>
                        {task.module_link && task.module_link !== 'none' && (
                          <span className="text-[10px] text-[#0078d4] dark:text-[#60a5fa] block">
                            {task.module_link === 'academic_center' ? '📚 اکادمیک' : '🔥 تمرکز'}
                          </span>
                        )}
                      </div>
                    </div>

                    <Badge
                      variant={
                        task.priority === 'urgent'
                          ? 'error'
                          : task.priority === 'high'
                          ? 'warning'
                          : 'neutral'
                      }
                      size="sm"
                    >
                      {task.priority}
                    </Badge>
                  </div>
                );
              })
            )}
          </div>

          <div className="p-2 rounded-lg bg-black/2 dark:bg-white/2 text-[10px] text-[#8a8a8a] text-center">
            💡 تسک‌ها را به درون خانه‌های ساعات تقویم بکشید (Drag & Drop) تا زمان‌بندی شوند.
          </div>
        </Card>

        {/* ─── RIGHT MAIN AREA: TIME-BLOCKING GRID CALENDAR ─── */}
        <Card
          variant="acrylic"
          className="p-0 overflow-x-auto border border-black/8 dark:border-white/8 lg:col-span-3"
        >
          <div className="min-w-[650px]">
            {/* Days Header */}
            <div
              className="grid border-b border-black/10 dark:border-white/10 bg-black/3 dark:bg-white/3 text-xs font-semibold"
              style={{ gridTemplateColumns: `56px repeat(${days.length}, 1fr)` }}
            >
              <div className="p-2.5 text-center text-[#8a8a8a] border-e border-black/5 dark:border-white/5">
                <Clock className="w-3.5 h-3.5 mx-auto" />
              </div>
              {days.map((day) => {
                const isToday = day.toISOString().split('T')[0] === new Date().toISOString().split('T')[0];
                const dayNames = ['یک‌شنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنج‌شنبه', 'جمعه', 'شنبه'];
                const dayName = dayNames[day.getDay()];
                const jalaliDayStr = formatJalaliDisplay(day, true);

                return (
                  <div
                    key={day.toISOString()}
                    className={`p-2 text-center border-e border-black/5 dark:border-white/5 last:border-e-0 ${
                      isToday
                        ? 'bg-[#0078d4]/10 text-[#0078d4] dark:text-[#60a5fa] font-bold'
                        : 'text-[#1f1f1f] dark:text-white'
                    }`}
                  >
                    <div>{dayName}</div>
                    <div className="text-[10px] text-[#8a8a8a] font-mono mt-0.5">
                      {jalaliDayStr.split(' ')[0]} {jalaliDayStr.split(' ')[1]}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Time Slot Rows with HTML5 Drop Targets */}
            <div className="divide-y divide-black/5 dark:divide-white/5">
              {hours.map((hour) => {
                const timeLabel = `${String(hour).padStart(2, '0')}:00`;

                return (
                  <div
                    key={hour}
                    className="grid min-h-[58px]"
                    style={{ gridTemplateColumns: `56px repeat(${days.length}, 1fr)` }}
                  >
                    {/* Hour Label */}
                    <div className="p-2 text-center text-[10px] text-[#8a8a8a] font-mono border-e border-black/5 dark:border-white/5 bg-black/1 dark:bg-white/1">
                      {timeLabel}
                    </div>

                    {/* Day Columns (Drop targets) */}
                    {days.map((day) => {
                      const dateStr = day.toISOString().split('T')[0];

                      // Find blocks matching this day and hour
                      const slotBlocks = timeBlocks.filter((b) => {
                        const start = new Date(b.scheduled_start_time);
                        const bDate = start.toISOString().split('T')[0];
                        const bHour = start.getUTCHours();
                        return bDate === dateStr && bHour === hour;
                      });

                      return (
                        <div
                          key={dateStr}
                          onDragOver={handleDragOver}
                          onDrop={() => handleDropOnSlot(dateStr, hour)}
                          onClick={() => {
                            setSlotDate(dateStr);
                            setSlotTime(`${String(hour).padStart(2, '0')}:00`);
                            setIsManualModalOpen(true);
                          }}
                          className="p-1 border-e border-black/5 dark:border-white/5 last:border-e-0 hover:bg-black/2 dark:hover:bg-white/2 transition-colors cursor-pointer relative min-h-[58px] space-y-1"
                        >
                          {slotBlocks.map((b) => {
                            const isCompleted = b.status === 'completed';

                            return (
                              <div
                                key={b.id}
                                onClick={(e) => e.stopPropagation()}
                                className={`p-1.5 rounded-lg text-white text-[11px] shadow-sm flex flex-col justify-between gap-1 group relative overflow-hidden transition-transform hover:scale-[1.01] ${
                                  b.has_conflict ? 'ring-2 ring-rose-500' : ''
                                }`}
                                style={{
                                  backgroundColor: isCompleted
                                    ? '#555555'
                                    : b.color_tag || (b.module_link === 'focus_engine' ? '#d83b01' : '#0078d4'),
                                }}
                              >
                                {/* Top Title & Conflict Warning */}
                                <div className="flex items-start justify-between gap-1">
                                  <div className="flex items-center gap-1 truncate">
                                    <button
                                      onClick={(e) => handleToggleComplete(b, e)}
                                      className="text-white/80 hover:text-white"
                                      title={isCompleted ? 'تغییر به انجام‌نشده' : 'تکمیل تسک'}
                                    >
                                      {isCompleted ? (
                                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" />
                                      ) : (
                                        <Circle className="w-3.5 h-3.5" />
                                      )}
                                    </button>
                                    <span
                                      className={`font-bold truncate ${
                                        isCompleted ? 'line-through opacity-70' : ''
                                      }`}
                                    >
                                      {b.title}
                                    </span>
                                  </div>

                                  {b.has_conflict && (
                                    <span title="تداخل زمانی">
                                      <AlertTriangle className="w-3 h-3 text-amber-300 shrink-0" />
                                    </span>
                                  )}
                                </div>

                                {/* Metadata & Badges */}
                                <div className="flex items-center justify-between gap-1 pt-0.5">
                                  <div className="flex items-center gap-1 text-[9px] opacity-90 truncate">
                                    {b.module_link === 'academic_center' && (
                                      <span className="inline-flex items-center gap-0.5 bg-black/20 px-1 py-0.5 rounded">
                                        <BookOpen className="w-2.5 h-2.5" />
                                        {b.academic_subject_name || 'اکادمیک'}
                                      </span>
                                    )}

                                    {b.module_link === 'focus_engine' && (
                                      <span className="inline-flex items-center gap-0.5 bg-black/20 px-1 py-0.5 rounded">
                                        <Flame className="w-2.5 h-2.5 text-amber-300" />
                                        تمرکز
                                      </span>
                                    )}
                                  </div>

                                  {/* Action Buttons: Start Focus + Delete */}
                                  <div className="flex items-center gap-1">
                                    {b.module_link === 'focus_engine' && !isCompleted && (
                                      <button
                                        onClick={(e) => handleStartFocus(b, e)}
                                        className="p-0.5 px-1.5 rounded bg-amber-500 hover:bg-amber-600 text-[10px] font-bold text-white flex items-center gap-0.5 shadow-sm"
                                        title="شروع تایمر تمرکز"
                                      >
                                        <Play className="w-2.5 h-2.5 fill-current" />
                                        تمرکز
                                      </button>
                                    )}

                                    <button
                                      onClick={(e) => handleDeleteBlock(b.id, e)}
                                      className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-black/20 rounded transition-opacity"
                                      title="حذف"
                                    >
                                      <Trash2 className="w-2.5 h-2.5 text-white/80" />
                                    </button>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        </Card>
      </div>

      {/* AI Schedule Importer Modal */}
      <AIScheduleImportModal
        isOpen={isAiModalOpen}
        onClose={() => setIsAiModalOpen(false)}
        onImportSuccess={loadData}
      />

      {/* Manual Schedule Modal */}
      <ScheduleModal
        isOpen={isManualModalOpen}
        onClose={() => setIsManualModalOpen(false)}
        defaultDate={slotDate}
        defaultStartTime={slotTime}
        onSaved={loadData}
      />
    </div>
  );
};
