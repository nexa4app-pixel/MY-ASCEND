import React, { useState } from 'react';
import {
  Check,
  Clock,
  Calendar as CalendarIcon,
  Folder,
  Edit2,
  Trash2,
  AlertTriangle,
  Flame,
} from 'lucide-react';
import { Task, TaskPriority, TaskStatus } from '../types/database';
import { Badge } from './Badge';
import { formatJalaliDisplay } from '../lib/date/jalali';
import { parseUtcIso } from '../lib/date/utc';
import { useTranslation } from '../store/useLocaleStore';
import { useFocusStore } from '../store/useFocusStore';
import { useNavigationStore } from '../store/useNavigationStore';

export interface TaskItemProps {
  task: Task;
  projectName?: string | null;
  onToggleStatus: (task: Task) => void;
  onEdit: (task: Task) => void;
  onDelete: (id: string) => void;
  onStatusChange?: (task: Task, newStatus: TaskStatus) => void;
}

export const TaskItem: React.FC<TaskItemProps> = ({
  task,
  projectName,
  onToggleStatus,
  onEdit,
  onDelete,
}) => {
  const { t, isRtl } = useTranslation();
  const [isOptimisticCompleted, setIsOptimisticCompleted] = useState(task.status === 'completed');

  const handleToggle = () => {
    const nextCompleted = !isOptimisticCompleted;
    setIsOptimisticCompleted(nextCompleted);
    onToggleStatus(task);

    // Auto-complete focus timer if linked to this task
    const focusState = useFocusStore.getState();
    if (nextCompleted && focusState.selectedTaskId === task.id && focusState.timerState === 'running') {
      focusState.completeTimer('Linked task marked as completed');
    }
  };

  const handleStartFocus = (e: React.MouseEvent) => {
    e.stopPropagation();
    useFocusStore.getState().setSelectedTask(task.id, task.title);
    useFocusStore.getState().setTimerMode('pomodoro', 25);
    useFocusStore.getState().startTimer();
    useNavigationStore.getState().navigate('focus');
  };

  const getPriorityBadge = (priority: TaskPriority) => {
    switch (priority) {
      case 'urgent':
        return <Badge variant="error" size="sm" className="font-bold">{t('tasks.priorityP1')}</Badge>;
      case 'high':
        return <Badge variant="warning" size="sm" className="font-bold">{t('tasks.priorityP2')}</Badge>;
      case 'medium':
        return <Badge variant="accent" size="sm">{t('tasks.priorityP3')}</Badge>;
      case 'low':
        return <Badge variant="neutral" size="sm">{t('tasks.priorityP4')}</Badge>;
    }
  };

  // Due date analysis
  let isOverdue = false;
  let isToday = false;
  let dueDateStr = '';

  if (task.due_date) {
    const todayStr = new Date().toISOString().split('T')[0];
    const dueStr = task.due_date.split('T')[0];
    isOverdue = dueStr < todayStr && !isOptimisticCompleted;
    isToday = dueStr === todayStr;

    try {
      dueDateStr = isRtl
        ? formatJalaliDisplay(parseUtcIso(task.due_date), true)
        : task.due_date.split('T')[0];
    } catch {
      dueDateStr = dueStr;
    }
  }

  return (
    <div
      className={`group flex items-start gap-3 p-3.5 rounded-xl border transition-all duration-150 text-start ${
        isOptimisticCompleted
          ? 'bg-black/[0.02] dark:bg-white/[0.02] border-black/5 dark:border-white/5 opacity-60'
          : 'bg-white/80 dark:bg-[#282828]/80 hover:bg-white dark:hover:bg-[#2e2e2e] border-black/8 dark:border-white/8 shadow-sm hover:shadow'
      }`}
    >
      {/* Checkbox */}
      <button
        type="button"
        onClick={handleToggle}
        className={`mt-0.5 w-5 h-5 rounded-md flex items-center justify-center transition-all duration-150 border shrink-0 ${
          isOptimisticCompleted
            ? 'bg-emerald-500 border-emerald-500 text-white'
            : 'border-black/20 dark:border-white/20 hover:border-[#0078d4] bg-white dark:bg-[#202020]'
        }`}
        aria-label={isOptimisticCompleted ? t('tasks.markUndone') : t('tasks.markDone')}
      >
        {isOptimisticCompleted && <Check className="w-3.5 h-3.5 stroke-[3]" />}
      </button>

      {/* Task Content */}
      <div className="flex-1 min-w-0 space-y-1.5">
        <div className="flex items-center gap-2 flex-wrap">
          {getPriorityBadge(task.priority)}

          {task.status === 'inbox' && (
            <Badge variant="neutral" size="sm" className="bg-purple-500/10 text-purple-600 dark:text-purple-400">
              {t('tasks.statusInboxBadge')}
            </Badge>
          )}

          {task.status === 'in_progress' && (
            <Badge variant="accent" size="sm">
              {t('tasks.statusInProgressBadge')}
            </Badge>
          )}

          {projectName && (
            <span className="inline-flex items-center gap-1 text-[11px] text-purple-600 dark:text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded-full font-medium">
              <Folder className="w-3 h-3" />
              <span className="truncate max-w-[120px]">{projectName}</span>
            </span>
          )}

          {task.due_date && (
            <span
              className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full font-mono font-medium ${
                isOverdue
                  ? 'bg-red-500/10 text-red-600 dark:text-red-400 font-bold'
                  : isToday
                  ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 font-semibold'
                  : 'bg-black/5 dark:bg-white/5 text-[#8a8a8a]'
              }`}
            >
              {isOverdue ? <AlertTriangle className="w-3 h-3" /> : <CalendarIcon className="w-3 h-3" />}
              <span>{dueDateStr}</span>
              {isOverdue && <span className="text-[9px] font-sans">{t('tasks.badgeOverdue')}</span>}
              {isToday && <span className="text-[9px] font-sans">{t('tasks.badgeToday')}</span>}
            </span>
          )}

          {(task.estimated_minutes || task.actual_minutes) && (
            <span className="inline-flex items-center gap-1 text-[11px] text-[#8a8a8a] bg-black/5 dark:bg-white/5 px-2 py-0.5 rounded-full font-mono">
              <Clock className="w-3 h-3 text-[#0078d4]" />
              <span>
                {task.actual_minutes ? `${task.actual_minutes}m / ` : ''}
                {task.estimated_minutes ? `${task.estimated_minutes}m` : ''}
              </span>
            </span>
          )}
        </div>

        {/* Title */}
        <h4
          className={`text-sm font-medium text-[#1f1f1f] dark:text-white leading-snug break-words transition-all ${
            isOptimisticCompleted ? 'line-through text-[#8a8a8a]' : ''
          }`}
        >
          {task.title}
        </h4>

        {/* Description */}
        {task.description && (
          <p className="text-xs text-[#616161] dark:text-[#adadad] line-clamp-2 leading-relaxed whitespace-pre-wrap">
            {task.description}
          </p>
        )}
      </div>

      {/* Action Buttons */}
      <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 shrink-0 pt-0.5">
        {!isOptimisticCompleted && (
          <button
            type="button"
            onClick={handleStartFocus}
            className="p-1.5 rounded-md hover:bg-amber-500/10 text-amber-500 transition-colors"
            aria-label={isRtl ? 'شروع تمرکز روی این وظیفه' : 'Start focus on this task'}
            title={isRtl ? 'شروع تمرکز روی این وظیفه' : 'Start focus on this task'}
          >
            <Flame className="w-3.5 h-3.5" />
          </button>
        )}

        <button
          type="button"
          onClick={() => onEdit(task)}
          className="p-1.5 rounded-md hover:bg-black/5 dark:hover:bg-white/10 text-black/50 dark:text-white/50 hover:text-black dark:hover:text-white transition-colors"
          aria-label={t('tasks.editTask')}
          title={t('tasks.editTask')}
        >
          <Edit2 className="w-3.5 h-3.5" />
        </button>

        <button
          type="button"
          onClick={() => onDelete(task.id)}
          className="p-1.5 rounded-md hover:bg-red-500/10 text-red-500 transition-colors"
          aria-label={t('tasks.deleteTask')}
          title={t('tasks.deleteTask')}
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
