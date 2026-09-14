/**
 * Project Service
 * Manages project streams, progress calculations, and goal alignments.
 */
import { db } from '../db/client';
import { Project, TaskPriority } from '../types/database';
import { getCurrentUtcIsoString } from '../lib/date/utc';
import { settingsService } from './settingsService';
import { logger } from './logger';

export interface CreateProjectInput {
  title: string;
  description?: string | null;
  deadline?: string | null;
  priority?: TaskPriority;
  goalId?: string | null;
  areaId?: string | null;
}

class ProjectService {
  private generateId(prefix: string): string {
    const rand = Math.random().toString(36).substring(2, 8);
    return `${prefix}_${Date.now()}_${rand}`;
  }

  public async createProject(input: CreateProjectInput): Promise<Project> {
    const trimmedTitle = input.title.trim();
    if (!trimmedTitle) {
      throw new Error('Project title cannot be empty.');
    }

    const id = this.generateId('proj');
    const now = getCurrentUtcIsoString();
    const deviceId = settingsService.getDeviceId();
    const priority: TaskPriority = input.priority || 'medium';

    await db.execute(
      `INSERT INTO projects (
        id, created_at, updated_at, version, device_id, is_deleted, deleted_at,
        goal_id, area_id, title, description, deadline, priority, status
      ) VALUES (?, ?, ?, 1, ?, 0, NULL, ?, ?, ?, ?, ?, ?, 'planning')`,
      [
        id,
        now,
        now,
        deviceId,
        input.goalId || null,
        input.areaId || null,
        trimmedTitle,
        input.description || null,
        input.deadline || null,
        priority,
      ]
    );

    logger.info(`Created project ${id} ("${trimmedTitle}")`, 'ProjectService');

    return {
      id,
      created_at: now,
      updated_at: now,
      version: 1,
      device_id: deviceId,
      is_deleted: 0,
      deleted_at: null,
      goal_id: input.goalId || null,
      area_id: input.areaId || null,
      title: trimmedTitle,
      description: input.description || null,
      deadline: input.deadline || null,
      priority,
      status: 'planning',
      task_count: 0,
      completed_task_count: 0,
      progress_percent: 0,
    };
  }

  public async getProjects(): Promise<Project[]> {
    const projects = await db.query<Project>(
      'SELECT * FROM projects WHERE is_deleted = 0 ORDER BY created_at DESC'
    );

    // Compute task counts and progress
    for (const proj of projects) {
      const taskCounts = await db.query<{ status: string; count: number }>(
        `SELECT status, COUNT(*) as count FROM tasks WHERE project_id = ? AND is_deleted = 0 GROUP BY status`,
        [proj.id]
      );

      let totalTasks = 0;
      let completedTasks = 0;

      for (const t of taskCounts) {
        const count = Number(t.count);
        totalTasks += count;
        if (t.status === 'completed' || t.status === 'done') {
          completedTasks += count;
        }
      }

      proj.task_count = totalTasks;
      proj.completed_task_count = completedTasks;
      proj.progress_percent = totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);
    }

    return projects;
  }

  public async getProjectById(id: string): Promise<Project | null> {
    const projects = await db.query<Project>(
      'SELECT * FROM projects WHERE id = ? AND is_deleted = 0',
      [id]
    );
    if (projects.length === 0) return null;

    const proj = projects[0];
    const taskCounts = await db.query<{ status: string; count: number }>(
      `SELECT status, COUNT(*) as count FROM tasks WHERE project_id = ? AND is_deleted = 0 GROUP BY status`,
      [proj.id]
    );

    let totalTasks = 0;
    let completedTasks = 0;

    for (const t of taskCounts) {
      const count = Number(t.count);
      totalTasks += count;
      if (t.status === 'completed' || t.status === 'done') {
        completedTasks += count;
      }
    }

    proj.task_count = totalTasks;
    proj.completed_task_count = completedTasks;
    proj.progress_percent = totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);

    return proj;
  }

  public async updateProject(id: string, updates: Partial<Project>): Promise<void> {
    const existing = await this.getProjectById(id);
    if (!existing) {
      throw new Error(`Project ${id} not found.`);
    }

    const now = getCurrentUtcIsoString();
    const title = updates.title !== undefined ? updates.title.trim() : existing.title;
    const description = updates.description !== undefined ? updates.description : existing.description;
    const deadline = updates.deadline !== undefined ? updates.deadline : existing.deadline;
    const priority = updates.priority !== undefined ? updates.priority : existing.priority;
    const status = updates.status !== undefined ? updates.status : existing.status;

    await db.execute(
      `UPDATE projects SET
        title = ?,
        description = ?,
        deadline = ?,
        priority = ?,
        status = ?,
        updated_at = ?,
        version = version + 1
      WHERE id = ?`,
      [title, description, deadline, priority, status, now, id]
    );

    logger.info(`Updated project ${id}`, 'ProjectService');
  }

  public async deleteProject(id: string): Promise<void> {
    const existing = await this.getProjectById(id);
    if (!existing) return;

    const now = getCurrentUtcIsoString();
    const deviceId = settingsService.getDeviceId();
    const trashId = this.generateId('trash');
    const payload = JSON.stringify(existing);

    await db.execute(
      `UPDATE projects SET
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
      ) VALUES (?, 'projects', ?, ?, ?, ?, 1)`,
      [trashId, id, now, deviceId, payload]
    );

    logger.info(`Soft-deleted project ${id}`, 'ProjectService');
  }
}

export const projectService = new ProjectService();
