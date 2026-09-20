import { describe, it, expect, beforeEach, vi } from 'vitest';
import { db } from '../src/db/client';
import { taskService } from '../src/services/taskService';
import { notificationService } from '../src/services/notificationService';
import { taskSchedulerService } from '../src/services/taskSchedulerService';
import { useSettingsStore } from '../src/store/useSettingsStore';

describe('Windows Native Notifications & Task Scheduler Engine', () => {
  beforeEach(async () => {
    await db.execute('DELETE FROM tasks');
    notificationService.clearNotifiedCache();
    await useSettingsStore.getState().setTimezone('Asia/Kabul');
  });

  it('1. should verify notification service initialization and permission check', async () => {
    const hasPerm = await notificationService.checkPermission();
    expect(typeof hasPerm).toBe('boolean');
  });

  it('2. should execute Action 1 (Mark Done) and update task status in SQLite', async () => {
    const task = await taskService.createTask({
      title: 'وظیفه تست اعلان',
      priority: 'urgent',
      dueDate: new Date().toISOString(),
    });

    expect(task.status).toBe('todo');

    const result = await notificationService.handleMarkTaskDone(task.id, true);
    expect(result).toBe(true);

    const updated = await taskService.getTaskById(task.id);
    expect(updated?.status).toBe('completed');
  });

  it('3. should execute Action 2 (Quick Note) and append progress to task in SQLite', async () => {
    const task = await taskService.createTask({
      title: 'وظیفه همراه با یادداشت سریع',
      priority: 'high',
      description: 'شرح اولیه کار',
    });

    const result = await notificationService.handleTaskQuickNote(task.id, '۵۰ درصد پیشرفت انجام شد', true);
    expect(result).toBe(true);

    const updated = await taskService.getTaskById(task.id);
    expect(updated?.description).toContain('شرح اولیه کار');
    expect(updated?.description).toContain('۵۰ درصد پیشرفت انجام شد');
  });

  it('4. should detect due tasks in current timezone and trigger notification once', async () => {
    const spy = vi.spyOn(notificationService, 'notifyTaskDue');

    // Create a task due today
    const task = await taskService.createTask({
      title: 'کار سررسید امروز',
      priority: 'urgent',
      dueDate: new Date().toISOString(),
    });

    const notifiedCount = await taskSchedulerService.checkDueTasks();
    expect(notifiedCount).toBe(1);
    expect(spy).toHaveBeenCalledWith(expect.objectContaining({ id: task.id }), expect.any(Boolean));

    // Subsequent check in same interval should not duplicate
    const secondCheckCount = await taskSchedulerService.checkDueTasks();
    expect(secondCheckCount).toBe(0);

    spy.mockRestore();
  });
});
