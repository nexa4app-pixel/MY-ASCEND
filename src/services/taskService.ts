/**
 * Task Core & Lifecycle Engine Service
 * Manages task CRUD, state transitions, Eisenhower priority scoring,
 * project links, time estimates, and planning workload views.
 */
import { db } from '../db/client';
import { Task, TaskPriority, TaskStatus } from '../types/database';
import { getCurrentUtcIsoString } from '../lib/date/utc';
import { settingsService } from './settingsService';
import { logger } from './logger';

export interface CreateTaskInput {
  title: string;
  description?: string | null;
  dueDate?: string | null;
  priority?: TaskPriority;
  status?: TaskStatus;
  projectId?: string | null;
  parentTaskId?: string | null;
  estimatedMinutes?: number | null;
}

export interface TaskFilter {
  status?: TaskStatus | 'active' | 'all';
  priority?: TaskPriority | 'all';
  projectId?: string | null;
  search?: string;
  dueDateFrom?: string;
  dueDateTo?: string;
}

export interface UpcomingTasksGrouped {
  overdue: Task[];
  today: Task[];
  next7Days: Task[];
  next30Days: Task[];
  later: Task[];
  unscheduled: Task[];
}

export interface EisenhowerMatrixTasks {
  q1UrgentImportant: Task[]; // P1
  q2ImportantNotUrgent: Task[]; // P2
  q3UrgentNotImportant: Task[]; // P3
  q4Neither: Task[]; // P4
}

export interface TaskStats {
  total: number;
  inbox: number;
  todo: number;
  inProgress: number;
  completed: number;
  overdue: number;
  completionRate: number;
}

class TaskService {
  private generateId(prefix: string): string {
    const rand = Math.random().toString(36).substring(2, 8);
    return `${prefix}_${Date.now()}_${rand}`;
  }

  public async createTask(input: CreateTaskInput): Promise<Task> {
    const trimmedTitle = input.title.trim();
    if (!trimmedTitle) {
      throw new Error('Task title cannot be empty.');
    }

    const id = this.generateId('task');
    const now = getCurrentUtcIsoString();
    const deviceId = settingsService.getDeviceId();
    const priority: TaskPriority = input.priority || 'medium';
    const status: TaskStatus = input.status || 'todo';

    await db.execute(
      `INSERT INTO tasks (
        id, created_at, updated_at, version, device_id, is_deleted, deleted_at,
        project_id, parent_task_id, title, description, due_date, priority, status,
        estimated_minutes, actual_minutes, completed_at
      ) VALUES (?, ?, ?, 1, ?, 0, NULL, ?, ?, ?, ?, ?, ?, ?, ?, NULL, NULL)`,
      [
        id,
        now,
        now,
        deviceId,
        input.projectId || null,
        input.parentTaskId || null,
        trimmedTitle,
        input.description || null,
        input.dueDate || null,
        priority,
        status,
        input.estimatedMinutes || null,
      ]
    );

    logger.info(`Created task ${id} ("${trimmedTitle}", priority=${priority}, status=${status})`, 'TaskService');

    return {
      id,
      created_at: now,
      updated_at: now,
      version: 1,
      device_id: deviceId,
      is_deleted: 0,
      deleted_at: null,
      project_id: input.projectId || null,
      parent_task_id: input.parentTaskId || null,
      title: trimmedTitle,
      description: input.description || null,
      due_date: input.dueDate || null,
      priority,
      status,
      estimated_minutes: input.estimatedMinutes || null,
      actual_minutes: null,
      completed_at: null,
    };
  }

  public async getTasks(filter?: TaskFilter): Promise<Task[]> {
    let sql = 'SELECT * FROM tasks WHERE is_deleted = 0';
    const params: unknown[] = [];

    if (filter?.status) {
      if (filter.status === 'active') {
        sql += " AND status IN ('todo', 'in_progress')";
      } else if (filter.status !== 'all') {
        sql += ' AND status = ?';
        params.push(filter.status);
      }
    }

    if (filter?.priority && filter.priority !== 'all') {
      sql += ' AND priority = ?';
      params.push(filter.priority);
    }

    if (filter?.projectId) {
      sql += ' AND project_id = ?';
      params.push(filter.projectId);
    }

    if (filter?.search && filter.search.trim()) {
      sql += ' AND (title LIKE ? OR description LIKE ?)';
      params.push(`%${filter.search.trim()}%`, `%${filter.search.trim()}%`);
    }

    if (filter?.dueDateFrom) {
      sql += ' AND due_date >= ?';
      params.push(filter.dueDateFrom);
    }

    if (filter?.dueDateTo) {
      sql += ' AND due_date <= ?';
      params.push(filter.dueDateTo);
    }

    // Custom ordering: P1 (urgent) > P2 (high) > P3 (medium) > P4 (low)
    sql += ` ORDER BY
      CASE priority
        WHEN 'urgent' THEN 1
        WHEN 'high' THEN 2
        WHEN 'medium' THEN 3
        WHEN 'low' THEN 4
        ELSE 5
      END ASC,
      CASE WHEN due_date IS NULL THEN 1 ELSE 0 END,
      due_date ASC,
      created_at DESC`;

    const rows = await db.query<Task>(sql, params);
    return rows;
  }

  public async getTaskById(id: string): Promise<Task | null> {
    const rows = await db.query<Task>(
      'SELECT * FROM tasks WHERE id = ? AND is_deleted = 0',
      [id]
    );
    return rows.length > 0 ? rows[0] : null;
  }

  public async updateTask(id: string, updates: Partial<Task>): Promise<void> {
    const existing = await this.getTaskById(id);
    if (!existing) {
      throw new Error(`Task ${id} not found.`);
    }

    const now = getCurrentUtcIsoString();
    const title = updates.title !== undefined ? updates.title.trim() : existing.title;
    const description = updates.description !== undefined ? updates.description : existing.description;
    const dueDate = updates.due_date !== undefined ? updates.due_date : existing.due_date;
    const priority = updates.priority !== undefined ? updates.priority : existing.priority;
    const status = updates.status !== undefined ? updates.status : existing.status;
    const projectId = updates.project_id !== undefined ? updates.project_id : existing.project_id;
    const estMinutes = updates.estimated_minutes !== undefined ? updates.estimated_minutes : existing.estimated_minutes;
    const actMinutes = updates.actual_minutes !== undefined ? updates.actual_minutes : existing.actual_minutes;

    let completedAt = existing.completed_at;
    if (status === 'completed' && !existing.completed_at) {
      completedAt = now;
    } else if (status !== 'completed') {
      completedAt = null;
    }

    await db.execute(
      `UPDATE tasks SET
        title = ?,
        description = ?,
        due_date = ?,
        priority = ?,
        status = ?,
        project_id = ?,
        estimated_minutes = ?,
        actual_minutes = ?,
        completed_at = ?,
        updated_at = ?,
        version = version + 1
      WHERE id = ?`,
      [
        title,
        description,
        dueDate,
        priority,
        status,
        projectId,
        estMinutes,
        actMinutes,
        completedAt,
        now,
        id,
      ]
    );

    logger.info(`Updated task ${id} (status=${status})`, 'TaskService');
  }

  public async toggleTaskStatus(id: string): Promise<Task> {
    const existing = await this.getTaskById(id);
    if (!existing) {
      throw new Error(`Task ${id} not found.`);
    }

    const isCompleted = existing.status === 'completed';
    const newStatus: TaskStatus = isCompleted ? 'todo' : 'completed';
    const now = getCurrentUtcIsoString();
    const completedAt = isCompleted ? null : now;

    await db.execute(
      `UPDATE tasks SET
        status = ?,
        completed_at = ?,
        updated_at = ?,
        version = version + 1
      WHERE id = ?`,
      [newStatus, completedAt, now, id]
    );

    logger.info(`Toggled task ${id} to status=${newStatus}`, 'TaskService');

    return {
      ...existing,
      status: newStatus,
      completed_at: completedAt,
      updated_at: now,
      version: existing.version + 1,
    };
  }

  public async transitionStatus(id: string, newStatus: TaskStatus): Promise<Task> {
    const existing = await this.getTaskById(id);
    if (!existing) {
      throw new Error(`Task ${id} not found.`);
    }

    const now = getCurrentUtcIsoString();
    const completedAt = newStatus === 'completed' ? now : null;

    await db.execute(
      `UPDATE tasks SET
        status = ?,
        completed_at = ?,
        updated_at = ?,
        version = version + 1
      WHERE id = ?`,
      [newStatus, completedAt, now, id]
    );

    logger.info(`Transitioned task ${id} to ${newStatus}`, 'TaskService');

    return {
      ...existing,
      status: newStatus,
      completed_at: completedAt,
      updated_at: now,
      version: existing.version + 1,
    };
  }

  public async deleteTask(id: string): Promise<void> {
    const existing = await this.getTaskById(id);
    if (!existing) return;

    const now = getCurrentUtcIsoString();
    const deviceId = settingsService.getDeviceId();
    const trashId = this.generateId('trash');
    const payload = JSON.stringify(existing);

    await db.execute(
      `UPDATE tasks SET
        is_deleted = 1,
        deleted_at = ?,
        updated_at = ?,
        version = version + 1
      WHERE id = ?`,
      [now, now, id]
    );

    await db.execute(
      `INSERT INTO trash (
        id, entity_type, entity_id, deleted_at, device_id, payload, can_restore
      ) VALUES (?, 'tasks', ?, ?, ?, ?, 1)`,
      [trashId, id, now, deviceId, payload]
    );

    logger.info(`Soft-deleted task ${id}`, 'TaskService');
  }

  /**
   * Workload View: Today's Tasks
   * All active tasks (todo, in_progress) due today or overdue.
   */
  public async getTodayTasks(): Promise<Task[]> {
    const todayUtc = new Date().toISOString().split('T')[0];
    const tasks = await this.getTasks({ status: 'active' });

    return tasks.filter((t) => {
      if (!t.due_date) return false;
      const taskDue = t.due_date.split('T')[0];
      return taskDue <= todayUtc;
    });
  }

  /**
   * Workload View: Upcoming / Scheduled Tasks
   */
  public async getUpcomingTasks(): Promise<UpcomingTasksGrouped> {
    const tasks = await this.getTasks({ status: 'active' });
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    const sevenDaysLater = new Date(today);
    sevenDaysLater.setUTCDate(today.getUTCDate() + 7);

    const thirtyDaysLater = new Date(today);
    thirtyDaysLater.setUTCDate(today.getUTCDate() + 30);

    const todayStr = today.toISOString().split('T')[0];
    const sevenStr = sevenDaysLater.toISOString().split('T')[0];
    const thirtyStr = thirtyDaysLater.toISOString().split('T')[0];

    const grouped: UpcomingTasksGrouped = {
      overdue: [],
      today: [],
      next7Days: [],
      next30Days: [],
      later: [],
      unscheduled: [],
    };

    for (const task of tasks) {
      if (!task.due_date) {
        grouped.unscheduled.push(task);
        continue;
      }

      const due = task.due_date.split('T')[0];
      if (due < todayStr) {
        grouped.overdue.push(task);
      } else if (due === todayStr) {
        grouped.today.push(task);
      } else if (due <= sevenStr) {
        grouped.next7Days.push(task);
      } else if (due <= thirtyStr) {
        grouped.next30Days.push(task);
      } else {
        grouped.later.push(task);
      }
    }

    return grouped;
  }

  /**
   * Workload View: Eisenhower 4-Quadrant Matrix
   * Q1: Urgent & Important (urgent / P1)
   * Q2: Not Urgent & Important (high / P2)
   * Q3: Urgent & Not Important (medium / P3)
   * Q4: Neither (low / P4)
   */
  public async getEisenhowerMatrix(): Promise<EisenhowerMatrixTasks> {
    const tasks = await this.getTasks({ status: 'active' });

    return {
      q1UrgentImportant: tasks.filter((t) => t.priority === 'urgent'),
      q2ImportantNotUrgent: tasks.filter((t) => t.priority === 'high'),
      q3UrgentNotImportant: tasks.filter((t) => t.priority === 'medium'),
      q4Neither: tasks.filter((t) => t.priority === 'low'),
    };
  }

  /**
   * Get Task Statistics for Dashboard
   */
  public async getTaskStats(): Promise<TaskStats> {
    const all = await db.query<{ status: TaskStatus; due_date: string | null; count: number }>(
      `SELECT status, due_date, COUNT(*) as count FROM tasks WHERE is_deleted = 0 GROUP BY status, due_date`
    );

    const todayStr = new Date().toISOString().split('T')[0];
    let total = 0;
    let inbox = 0;
    let todo = 0;
    let inProgress = 0;
    let completed = 0;
    let overdue = 0;

    for (const r of all) {
      const count = Number(r.count);
      total += count;
      if (r.status === 'inbox') inbox += count;
      if (r.status === 'todo') todo += count;
      if (r.status === 'in_progress') inProgress += count;
      if (r.status === 'completed') completed += count;

      if ((r.status === 'todo' || r.status === 'in_progress') && r.due_date) {
        if (r.due_date.split('T')[0] < todayStr) {
          overdue += count;
        }
      }
    }

    const completionRate = total === 0 ? 0 : Math.round((completed / total) * 100);

    return {
      total,
      inbox,
      todo,
      inProgress,
      completed,
      overdue,
      completionRate,
    };
  }
}

export const taskService = new TaskService();
