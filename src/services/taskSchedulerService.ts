/**
 * Task Scheduler & Dynamic Background Notification Engine
 * Regularly inspects pending tasks in SQLite and triggers alerts based on due_date and timezone.
 */

import { taskService } from './taskService';
import { notificationService } from './notificationService';
import { useSettingsStore } from '../store/useSettingsStore';
import { useLocaleStore } from '../store/useLocaleStore';
import { formatInTimezone } from '../lib/date/utc';

class TaskSchedulerService {
  private timer: any = null;
  private isRunning: boolean = false;

  /**
   * Start periodic background scan for due tasks
   */
  start(intervalMs: number = 30000): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.checkDueTasks();
    this.timer = setInterval(() => {
      this.checkDueTasks();
    }, intervalMs);
  }

  /**
   * Stop background scheduler
   */
  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.isRunning = false;
  }

  /**
   * Check all pending tasks and fire notifications for due tasks
   */
  async checkDueTasks(): Promise<number> {
    try {
      const allTasks = await taskService.getTasks();
      const pendingTasks = allTasks.filter(
        (t) => (t.status === 'todo' || t.status === 'in_progress') && t.due_date
      );

      const timezone = useSettingsStore.getState().settings.timezone || 'Asia/Kabul';
      const isPersian = useLocaleStore.getState().locale === 'fa';
      const todayStr = formatInTimezone(new Date(), timezone);
      const nowMs = Date.now();

      let notifiedCount = 0;

      for (const task of pendingTasks) {
        if (notificationService.isTaskNotified(task.id)) continue;

        let shouldAlert = false;

        // Check scheduled start time with reminder offset (e.g. 15m prior)
        if (task.scheduled_start_time) {
          const offsetMs = (task.reminder_offset_minutes ?? 15) * 60 * 1000;
          const targetAlertMs = new Date(task.scheduled_start_time).getTime() - offsetMs;
          if (nowMs >= targetAlertMs) {
            shouldAlert = true;
          }
        }

        // Check traditional due date
        if (!shouldAlert && task.due_date) {
          const taskDueStr = formatInTimezone(task.due_date, timezone);
          if (taskDueStr && taskDueStr <= todayStr) {
            shouldAlert = true;
          }
        }

        if (shouldAlert) {
          notificationService.markTaskNotified(task.id);
          await notificationService.notifyTaskDue(task, isPersian);
          notifiedCount++;
        }
      }

      return notifiedCount;
    } catch (err) {
      console.warn('Error during task scheduler execution:', err);
      return 0;
    }
  }
}

export const taskSchedulerService = new TaskSchedulerService();
