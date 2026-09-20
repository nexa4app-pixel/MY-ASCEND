/**
 * Windows Native & Interactive Notification Service
 * Integrates @tauri-apps/plugin-notification with Web Notification & Toast fallbacks.
 */

import { Task } from '../types/database';
import { taskService } from './taskService';
import { toast } from '../store/useToastStore';

export interface NotificationOptions {
  title: string;
  body: string;
  icon?: string;
  sound?: string;
  actionTypeId?: string;
  extraData?: Record<string, any>;
}

class NotificationService {
  private hasPermission: boolean = false;
  private notifiedTaskIds: Set<string> = new Set();

  constructor() {
    this.checkPermission();
  }

  /**
   * Check if notification permissions are granted
   */
  async checkPermission(): Promise<boolean> {
    try {
      if (typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window) {
        const { isPermissionGranted } = await import('@tauri-apps/plugin-notification');
        this.hasPermission = await isPermissionGranted();
        return this.hasPermission;
      } else if (typeof window !== 'undefined' && 'Notification' in window) {
        this.hasPermission = Notification.permission === 'granted';
        return this.hasPermission;
      }
    } catch {
      this.hasPermission = false;
    }
    return false;
  }

  /**
   * Request user permission for notifications
   */
  async requestPermission(): Promise<boolean> {
    try {
      if (typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window) {
        const { isPermissionGranted, requestPermission } = await import('@tauri-apps/plugin-notification');
        let granted = await isPermissionGranted();
        if (!granted) {
          const permission = await requestPermission();
          granted = permission === 'granted';
        }
        this.hasPermission = granted;
        return granted;
      } else if (typeof window !== 'undefined' && 'Notification' in window) {
        const perm = await Notification.requestPermission();
        this.hasPermission = perm === 'granted';
        return this.hasPermission;
      }
    } catch (e) {
      console.warn('Failed to request notification permission:', e);
    }
    return false;
  }

  /**
   * Send a native Windows / Desktop notification
   */
  async sendNotification(options: NotificationOptions): Promise<void> {
    try {
      const permitted = await this.checkPermission();
      if (!permitted) {
        await this.requestPermission();
      }

      if (typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window) {
        const { sendNotification } = await import('@tauri-apps/plugin-notification');
        sendNotification({
          title: options.title,
          body: options.body,
        });
      } else if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
        new Notification(options.title, {
          body: options.body,
          icon: options.icon || '/app-icon.png',
        });
      } else {
        // In-app fallback toast
        toast.info(`${options.title}: ${options.body}`);
      }
    } catch (err) {
      console.warn('Failed to dispatch notification:', err);
      toast.info(`${options.title}: ${options.body}`);
    }
  }

  /**
   * Send interactive task due notification with quick action capabilities
   */
  async notifyTaskDue(task: Task, isPersian: boolean = true): Promise<void> {
    const title = isPersian
      ? `⏰ موعد انجام وظیفه: ${task.title}`
      : `⏰ Task Due: ${task.title}`;

    const body = task.description
      ? task.description.substring(0, 100)
      : isPersian
      ? 'این کار به زمان سررسید تعیین‌شده رسیده است.'
      : 'This task has reached its scheduled due date.';

    await this.sendNotification({
      title,
      body,
      actionTypeId: 'TASK_ACTION',
      extraData: { taskId: task.id },
    });
  }

  /**
   * Execute Action 1: Mark Task as Completed directly in SQLite
   */
  async handleMarkTaskDone(taskId: string, isPersian: boolean = true): Promise<boolean> {
    try {
      await taskService.transitionStatus(taskId, 'completed');
      const msg = isPersian ? 'وظیفه با موفقیت انجام شد.' : 'Task marked as completed.';
      toast.success(msg);
      return true;
    } catch (err) {
      console.error('Failed to mark task done via notification action:', err);
      return false;
    }
  }

  /**
   * Execute Action 2: Quick Note appending directly to task in SQLite
   */
  async handleTaskQuickNote(taskId: string, note: string, isPersian: boolean = true): Promise<boolean> {
    try {
      const task = await taskService.getTaskById(taskId);
      if (!task) return false;

      const newDesc = task.description
        ? `${task.description}\n[Note ${new Date().toLocaleTimeString()}]: ${note}`
        : `[Note ${new Date().toLocaleTimeString()}]: ${note}`;

      await taskService.updateTask(taskId, { description: newDesc });
      const msg = isPersian ? 'یادداشت سریع به وظیفه افزوده شد.' : 'Quick note appended to task.';
      toast.info(msg);
      return true;
    } catch (err) {
      console.error('Failed to append quick note to task:', err);
      return false;
    }
  }

  /**
   * Mark task as notified to prevent repeating notifications in short interval
   */
  markTaskNotified(taskId: string): void {
    this.notifiedTaskIds.add(taskId);
  }

  isTaskNotified(taskId: string): boolean {
    return this.notifiedTaskIds.has(taskId);
  }

  clearNotifiedCache(): void {
    this.notifiedTaskIds.clear();
  }
}

export const notificationService = new NotificationService();
