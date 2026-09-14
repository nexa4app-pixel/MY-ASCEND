import React, { useState, useEffect } from 'react';
import {
  CheckSquare,
  Clock,
  Calendar as CalendarIcon,
  Flag,
  Folder,
} from 'lucide-react';
import { Modal } from './Modal';
import { Button } from './Button';
import { Input } from './Input';
import { Select } from './Select';
import { Task, TaskPriority, TaskStatus, Project } from '../types/database';
import { taskService } from '../services/taskService';
import { projectService } from '../services/projectService';

export interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  taskToEdit?: Task | null;
  defaultStatus?: TaskStatus;
  defaultProjectId?: string | null;
  onTaskSaved?: () => void;
}

const PRIORITY_OPTIONS: { value: TaskPriority; label: string; quadrant: string }[] = [
  { value: 'urgent', label: 'P1: بحرانی و فوری', quadrant: 'Q1: اقدام فوری' },
  { value: 'high', label: 'P2: مهم و استراتژیک', quadrant: 'Q2: برنامه‌ریزی' },
  { value: 'medium', label: 'P3: فوری غیرمهم', quadrant: 'Q3: تفویض یا سریع' },
  { value: 'low', label: 'P4: کم‌اهمیت', quadrant: 'Q4: حذف یا بایگانی' },
];

const STATUS_OPTIONS: { value: TaskStatus; label: string }[] = [
  { value: 'inbox', label: 'در انتظار برنامه‌ریزی (Inbox)' },
  { value: 'todo', label: 'برای انجام (To-Do)' },
  { value: 'in_progress', label: 'در حال انجام (In Progress)' },
  { value: 'completed', label: 'انجام‌شده (Completed)' },
  { value: 'cancelled', label: 'لغوشده (Cancelled)' },
];

export const TaskModal: React.FC<TaskModalProps> = ({
  isOpen,
  onClose,
  taskToEdit,
  defaultStatus = 'todo',
  defaultProjectId = null,
  onTaskSaved,
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [status, setStatus] = useState<TaskStatus>(defaultStatus);
  const [projectId, setProjectId] = useState<string>(defaultProjectId || '');
  const [dueDate, setDueDate] = useState('');
  const [estimatedMinutes, setEstimatedMinutes] = useState<number | ''>('');
  const [actualMinutes, setActualMinutes] = useState<number | ''>('');
  const [projects, setProjects] = useState<Project[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      projectService.getProjects().then(setProjects).catch(console.error);

      if (taskToEdit) {
        setTitle(taskToEdit.title);
        setDescription(taskToEdit.description || '');
        setPriority(taskToEdit.priority);
        setStatus(taskToEdit.status);
        setProjectId(taskToEdit.project_id || '');
        setDueDate(taskToEdit.due_date ? taskToEdit.due_date.split('T')[0] : '');
        setEstimatedMinutes(taskToEdit.estimated_minutes ?? '');
        setActualMinutes(taskToEdit.actual_minutes ?? '');
      } else {
        setTitle('');
        setDescription('');
        setPriority('medium');
        setStatus(defaultStatus);
        setProjectId(defaultProjectId || '');
        setDueDate('');
        setEstimatedMinutes('');
        setActualMinutes('');
      }
    }
  }, [isOpen, taskToEdit, defaultStatus, defaultProjectId]);

  const handleSave = async () => {
    if (!title.trim() || isSaving) return;

    setIsSaving(true);
    try {
      if (taskToEdit) {
        await taskService.updateTask(taskToEdit.id, {
          title,
          description: description || null,
          priority,
          status,
          project_id: projectId || null,
          due_date: dueDate ? `${dueDate}T23:59:59.000Z` : null,
          estimated_minutes: estimatedMinutes === '' ? null : Number(estimatedMinutes),
          actual_minutes: actualMinutes === '' ? null : Number(actualMinutes),
        });
      } else {
        await taskService.createTask({
          title,
          description: description || null,
          priority,
          status,
          projectId: projectId || null,
          dueDate: dueDate ? `${dueDate}T23:59:59.000Z` : null,
          estimatedMinutes: estimatedMinutes === '' ? null : Number(estimatedMinutes),
        });
      }

      onTaskSaved?.();
      onClose();
    } catch (err) {
      console.error('Failed to save task:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const setQuickDate = (daysToAdd: number) => {
    const d = new Date();
    d.setDate(d.getDate() + daysToAdd);
    const dateStr = d.toISOString().split('T')[0];
    setDueDate(dateStr);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={taskToEdit ? 'ویرایش کار' : 'تعریف کار جدید'}
      description="عنوان، اولویت آیزنهاور، پروژه و زمان تخمینی کار را مشخص کنید"
      size="lg"
      footer={
        <div className="flex items-center gap-2">
          <Button variant="subtle" onClick={onClose}>
            انصراف
          </Button>
          <Button
            variant="primary"
            disabled={!title.trim() || isSaving}
            isLoading={isSaving}
            onClick={handleSave}
            icon={<CheckSquare className="w-4 h-4" />}
          >
            {taskToEdit ? 'ذخیره تغییرات' : 'ایجاد کار'}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Title */}
        <Input
          label="عنوان کار *"
          placeholder="کاری که باید انجام دهید را بنویسید..."
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          autoFocus
        />

        {/* Description */}
        <div className="flex flex-col gap-1.5 text-start">
          <label className="text-xs font-medium text-[#616161] dark:text-[#adadad]">
            توضیحات تکمیلی (اختیاری)
          </label>
          <textarea
            rows={3}
            placeholder="جزئیات، نکات کلیدی، یا مراحل اجرای کار..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full rounded-md border border-black/15 dark:border-white/15 bg-white dark:bg-[#2b2b2b] p-3 text-sm text-[#1f1f1f] dark:text-white leading-relaxed focus:outline-none focus:ring-1 focus:ring-[#0078d4]"
          />
        </div>

        {/* Priority & Status */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5 text-start">
            <label className="text-xs font-medium text-[#616161] dark:text-[#adadad] flex items-center gap-1.5">
              <Flag className="w-3.5 h-3.5 text-[#0078d4]" />
              <span>اولویت (ماتریس آیزنهاور)</span>
            </label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as TaskPriority)}
              className="w-full bg-white dark:bg-[#2b2b2b] text-sm text-[#1f1f1f] dark:text-white rounded-md border border-black/15 dark:border-white/15 p-2 focus:outline-none focus:ring-1 focus:ring-[#0078d4]"
            >
              {PRIORITY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label} — ({opt.quadrant})
                </option>
              ))}
            </select>
          </div>

          <Select
            label="وضعیت فرآیند (Status)"
            options={STATUS_OPTIONS}
            value={status}
            onChange={(e) => setStatus(e.target.value as TaskStatus)}
          />
        </div>

        {/* Project Link & Due Date */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5 text-start">
            <label className="text-xs font-medium text-[#616161] dark:text-[#adadad] flex items-center gap-1.5">
              <Folder className="w-3.5 h-3.5 text-purple-500" />
              <span>انتساب به پروژه</span>
            </label>
            <select
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              className="w-full bg-white dark:bg-[#2b2b2b] text-sm text-[#1f1f1f] dark:text-white rounded-md border border-black/15 dark:border-white/15 p-2 focus:outline-none focus:ring-1 focus:ring-[#0078d4]"
            >
              <option value="">(بدون پروژه / مستقل)</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5 text-start">
            <label className="text-xs font-medium text-[#616161] dark:text-[#adadad] flex items-center gap-1.5">
              <CalendarIcon className="w-3.5 h-3.5 text-amber-500" />
              <span>مهلت انجام (Due Date)</span>
            </label>
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="flex-1 bg-white dark:bg-[#2b2b2b] text-sm text-[#1f1f1f] dark:text-white rounded-md border border-black/15 dark:border-white/15 p-1.5 focus:outline-none focus:ring-1 focus:ring-[#0078d4]"
              />
              <button
                type="button"
                onClick={() => setQuickDate(0)}
                className="px-2 py-1.5 text-[11px] rounded bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 font-medium"
              >
                امروز
              </button>
              <button
                type="button"
                onClick={() => setQuickDate(1)}
                className="px-2 py-1.5 text-[11px] rounded bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 font-medium"
              >
                فردا
              </button>
            </div>
          </div>
        </div>

        {/* Time Tracking (Estimated vs Actual) */}
        <div className="grid grid-cols-2 gap-4 pt-1">
          <Input
            label="زمان تخمینی (دقیقه)"
            type="number"
            min={0}
            placeholder="مثلاً 45"
            value={estimatedMinutes}
            onChange={(e) => setEstimatedMinutes(e.target.value ? Number(e.target.value) : '')}
            prefixIcon={<Clock className="w-3.5 h-3.5" />}
          />

          <Input
            label="زمان صرف‌شده واقعی (دقیقه)"
            type="number"
            min={0}
            placeholder="مثلاً 50"
            value={actualMinutes}
            onChange={(e) => setActualMinutes(e.target.value ? Number(e.target.value) : '')}
            prefixIcon={<Clock className="w-3.5 h-3.5 text-emerald-500" />}
          />
        </div>
      </div>
    </Modal>
  );
};
