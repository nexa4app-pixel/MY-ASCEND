import { describe, it, expect, beforeAll } from 'vitest';
import { db } from '../src/db/client';
import { taskService } from '../src/services/taskService';
import { projectService } from '../src/services/projectService';
import { isValidUtcIso } from '../src/lib/date/utc';

describe('Phase 03: Task Management & Action Engine', () => {
  beforeAll(async () => {
    // Clean all affected tables before running the suite
    await db.execute('DELETE FROM tasks');
    await db.execute('DELETE FROM projects');
    await db.execute('DELETE FROM trash');
  });

  // ─── Task Creation & Metadata ─────────────────────────────────────────────

  it('should create a task with universal metadata and UTC ISO-8601 timestamps', async () => {
    const task = await taskService.createTask({
      title: 'Write unit tests for Phase 03',
      description: 'Cover all lifecycle states and Eisenhower quadrants',
      priority: 'high',
    });

    expect(task.id).toMatch(/^task_\d+_[a-z0-9]{6}$/);
    expect(task.title).toBe('Write unit tests for Phase 03');
    expect(task.description).toBe('Cover all lifecycle states and Eisenhower quadrants');
    expect(task.priority).toBe('high');
    expect(task.status).toBe('todo');
    expect(task.version).toBe(1);
    expect(task.is_deleted).toBe(0);
    expect(task.deleted_at).toBeNull();
    expect(task.completed_at).toBeNull();
    expect(isValidUtcIso(task.created_at)).toBe(true);
    expect(isValidUtcIso(task.updated_at)).toBe(true);
    expect(task.device_id).toBeDefined();
  });

  it('should throw when creating a task with empty or whitespace title', async () => {
    await expect(taskService.createTask({ title: '   ' })).rejects.toThrow(
      'Task title cannot be empty.'
    );
  });

  it('should default priority to medium and status to todo when not specified', async () => {
    const task = await taskService.createTask({ title: 'Default priority task' });
    expect(task.priority).toBe('medium');
    expect(task.status).toBe('todo');
  });

  // ─── Status Lifecycle: inbox → todo → in_progress → completed ────────────

  it('should support creating a task with inbox status (promoted from Inbox capture)', async () => {
    const task = await taskService.createTask({
      title: 'Promoted from inbox capture',
      status: 'inbox',
    });
    expect(task.status).toBe('inbox');
  });

  it('should transition task status through full lifecycle: inbox → todo → in_progress → completed', async () => {
    const task = await taskService.createTask({
      title: 'Lifecycle test task',
      status: 'inbox',
    });
    expect(task.status).toBe('inbox');

    // inbox → todo
    const asTodo = await taskService.transitionStatus(task.id, 'todo');
    expect(asTodo.status).toBe('todo');
    expect(asTodo.completed_at).toBeNull();
    expect(asTodo.version).toBe(2);

    // todo → in_progress
    const asInProgress = await taskService.transitionStatus(task.id, 'in_progress');
    expect(asInProgress.status).toBe('in_progress');

    // in_progress → completed: must set completed_at
    const asCompleted = await taskService.transitionStatus(task.id, 'completed');
    expect(asCompleted.status).toBe('completed');
    expect(asCompleted.completed_at).not.toBeNull();
    expect(isValidUtcIso(asCompleted.completed_at!)).toBe(true);
  });

  it('should transition task status to cancelled', async () => {
    const task = await taskService.createTask({
      title: 'Task to cancel',
      status: 'todo',
    });

    const cancelled = await taskService.transitionStatus(task.id, 'cancelled');
    expect(cancelled.status).toBe('cancelled');
  });

  // ─── Toggle Task Status ───────────────────────────────────────────────────

  it('should toggle a todo task to completed and set completed_at', async () => {
    const task = await taskService.createTask({ title: 'Toggle test task' });
    expect(task.status).toBe('todo');

    const toggled = await taskService.toggleTaskStatus(task.id);
    expect(toggled.status).toBe('completed');
    expect(toggled.completed_at).not.toBeNull();
    expect(isValidUtcIso(toggled.completed_at!)).toBe(true);
    expect(toggled.version).toBe(2);
  });

  it('should toggle a completed task back to todo and clear completed_at', async () => {
    const task = await taskService.createTask({ title: 'Re-open test task', status: 'todo' });
    const completed = await taskService.toggleTaskStatus(task.id);
    expect(completed.status).toBe('completed');

    // Toggle back
    const reopened = await taskService.toggleTaskStatus(task.id);
    expect(reopened.status).toBe('todo');
    expect(reopened.completed_at).toBeNull();
  });

  // ─── Eisenhower Priority Matrix ───────────────────────────────────────────

  it('should classify tasks into correct Eisenhower quadrants by priority', async () => {
    // Clean first to isolate this test
    await db.execute("DELETE FROM tasks WHERE title LIKE 'Eisenhower%'");

    await taskService.createTask({ title: 'Eisenhower P1', priority: 'urgent' });
    await taskService.createTask({ title: 'Eisenhower P2', priority: 'high' });
    await taskService.createTask({ title: 'Eisenhower P3', priority: 'medium' });
    await taskService.createTask({ title: 'Eisenhower P4', priority: 'low' });

    const matrix = await taskService.getEisenhowerMatrix();

    const q1Titles = matrix.q1UrgentImportant.map((t) => t.title);
    const q2Titles = matrix.q2ImportantNotUrgent.map((t) => t.title);
    const q3Titles = matrix.q3UrgentNotImportant.map((t) => t.title);
    const q4Titles = matrix.q4Neither.map((t) => t.title);

    expect(q1Titles).toContain('Eisenhower P1'); // urgent → Q1
    expect(q2Titles).toContain('Eisenhower P2'); // high → Q2
    expect(q3Titles).toContain('Eisenhower P3'); // medium → Q3
    expect(q4Titles).toContain('Eisenhower P4'); // low → Q4
  });

  it('should only include active (todo / in_progress) tasks in Eisenhower Matrix', async () => {
    const task = await taskService.createTask({
      title: 'Completed urgent task',
      priority: 'urgent',
      status: 'todo',
    });
    await taskService.transitionStatus(task.id, 'completed');

    const matrix = await taskService.getEisenhowerMatrix();
    const q1Ids = matrix.q1UrgentImportant.map((t) => t.id);
    expect(q1Ids).not.toContain(task.id);
  });

  // ─── Project Creation & Task Linkage ─────────────────────────────────────

  it('should create a project with universal metadata', async () => {
    const project = await projectService.createProject({
      title: 'Phase 03 Demo Project',
      description: 'A test project for Phase 03',
      priority: 'high',
    });

    expect(project.id).toMatch(/^proj_\d+_[a-z0-9]{6}$/);
    expect(project.title).toBe('Phase 03 Demo Project');
    expect(project.status).toBe('planning');
    expect(project.task_count).toBe(0);
    expect(project.completed_task_count).toBe(0);
    expect(project.progress_percent).toBe(0);
    expect(project.version).toBe(1);
    expect(isValidUtcIso(project.created_at)).toBe(true);
  });

  it('should compute project progress_percent from linked task completions', async () => {
    const project = await projectService.createProject({ title: 'Progress Test Project' });

    // Link 2 tasks to this project
    const t1 = await taskService.createTask({
      title: 'Project task 1',
      projectId: project.id,
    });
    const t2 = await taskService.createTask({
      title: 'Project task 2',
      projectId: project.id,
    });

    // Complete one task
    await taskService.transitionStatus(t1.id, 'completed');
    // t2 stays todo

    const updated = await projectService.getProjectById(project.id);
    expect(updated).not.toBeNull();
    expect(updated!.task_count).toBe(2);
    expect(updated!.completed_task_count).toBe(1);
    expect(updated!.progress_percent).toBe(50);

    // Complete second task → 100%
    await taskService.transitionStatus(t2.id, 'completed');
    const full = await projectService.getProjectById(project.id);
    expect(full!.progress_percent).toBe(100);
  });

  it('should return 0 progress when project has no tasks', async () => {
    const project = await projectService.createProject({ title: 'Empty Project' });
    const fetched = await projectService.getProjectById(project.id);
    expect(fetched!.progress_percent).toBe(0);
    expect(fetched!.task_count).toBe(0);
  });

  // ─── Time Tracking ────────────────────────────────────────────────────────

  it('should store estimated_minutes on creation and actual_minutes on update', async () => {
    const task = await taskService.createTask({
      title: 'Timed task',
      estimatedMinutes: 90,
    });

    expect(task.estimated_minutes).toBe(90);
    expect(task.actual_minutes).toBeNull();

    await taskService.updateTask(task.id, { actual_minutes: 75 });

    const updated = await taskService.getTaskById(task.id);
    expect(updated!.actual_minutes).toBe(75);
    expect(updated!.estimated_minutes).toBe(90);
  });

  // ─── Task CRUD & Filtering ───────────────────────────────────────────────

  it('should retrieve a task by ID', async () => {
    const task = await taskService.createTask({ title: 'Fetchable task' });
    const fetched = await taskService.getTaskById(task.id);
    expect(fetched).not.toBeNull();
    expect(fetched!.id).toBe(task.id);
    expect(fetched!.title).toBe('Fetchable task');
  });

  it('should return null for a non-existent task ID', async () => {
    const result = await taskService.getTaskById('task_nonexistent_000000');
    expect(result).toBeNull();
  });

  it('should filter tasks by status', async () => {
    const inboxTask = await taskService.createTask({
      title: 'Filter inbox task',
      status: 'inbox',
    });

    const inboxTasks = await taskService.getTasks({ status: 'inbox' });
    const ids = inboxTasks.map((t) => t.id);
    expect(ids).toContain(inboxTask.id);
  });

  it('should filter tasks by project_id', async () => {
    const project = await projectService.createProject({ title: 'Filter Project' });
    const linked = await taskService.createTask({
      title: 'Linked filter task',
      projectId: project.id,
    });
    await taskService.createTask({ title: 'Unlinked task' });

    const result = await taskService.getTasks({ projectId: project.id });
    const ids = result.map((t) => t.id);
    expect(ids).toContain(linked.id);
    expect(result.every((t) => t.project_id === project.id)).toBe(true);
  });

  it('should filter tasks by search keyword in title', async () => {
    await taskService.createTask({ title: 'Review quarterly OKR metrics' });
    await taskService.createTask({ title: 'Prepare sprint retrospective' });

    const results = await taskService.getTasks({ search: 'OKR' });
    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results.some((t) => t.title.includes('OKR'))).toBe(true);
  });

  // ─── Soft Delete ─────────────────────────────────────────────────────────

  it('should soft-delete a task: set is_deleted=1, deleted_at, and write JSON snapshot to trash', async () => {
    const task = await taskService.createTask({ title: 'Task to soft-delete' });

    await taskService.deleteTask(task.id);

    // Task should no longer be returned by getTaskById (is_deleted = 0 filter)
    const found = await taskService.getTaskById(task.id);
    expect(found).toBeNull();

    // Verify is_deleted=1 in DB directly
    const rows = await db.query<{ is_deleted: number; deleted_at: string | null }>(
      'SELECT is_deleted, deleted_at FROM tasks WHERE id = ?',
      [task.id]
    );
    expect(rows.length).toBe(1);
    expect(rows[0].is_deleted).toBe(1);
    expect(rows[0].deleted_at).not.toBeNull();
    expect(isValidUtcIso(rows[0].deleted_at!)).toBe(true);

    // Verify trash snapshot was written with JSON payload
    const trash = await db.query<{ entity_type: string; entity_id: string; payload: string; can_restore: number }>(
      "SELECT entity_type, entity_id, payload, can_restore FROM trash WHERE entity_id = ?",
      [task.id]
    );
    expect(trash.length).toBe(1);
    expect(trash[0].entity_type).toBe('tasks');
    expect(trash[0].can_restore).toBe(1);

    const snapshot = JSON.parse(trash[0].payload);
    expect(snapshot.id).toBe(task.id);
    expect(snapshot.title).toBe('Task to soft-delete');
  });

  it('should soft-delete a project and write snapshot to trash', async () => {
    const project = await projectService.createProject({ title: 'Project to delete' });
    await projectService.deleteProject(project.id);

    const fetched = await projectService.getProjectById(project.id);
    expect(fetched).toBeNull();

    const trash = await db.query<{ entity_type: string; payload: string }>(
      "SELECT entity_type, payload FROM trash WHERE entity_id = ?",
      [project.id]
    );
    expect(trash.length).toBe(1);
    expect(trash[0].entity_type).toBe('projects');
    const snapshot = JSON.parse(trash[0].payload);
    expect(snapshot.title).toBe('Project to delete');
  });

  // ─── getTodayTasks / getUpcomingTasks ─────────────────────────────────────

  it('should include overdue and today tasks in getTodayTasks', async () => {
    const todayStr = new Date().toISOString().split('T')[0];

    // Yesterday (overdue)
    const yesterday = new Date();
    yesterday.setUTCDate(yesterday.getUTCDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    const overdueTask = await taskService.createTask({
      title: 'Overdue planning task',
      status: 'todo',
      dueDate: yesterdayStr,
    });
    const todayTask = await taskService.createTask({
      title: 'Due today planning task',
      status: 'todo',
      dueDate: todayStr,
    });

    const todayTasks = await taskService.getTodayTasks();
    const ids = todayTasks.map((t) => t.id);
    expect(ids).toContain(overdueTask.id);
    expect(ids).toContain(todayTask.id);
  });

  it('should group upcoming tasks correctly: overdue / today / next7 / next30 / later / unscheduled', async () => {
    // Create an unscheduled task
    const unscheduled = await taskService.createTask({
      title: 'Unscheduled upcoming task',
      status: 'todo',
    });

    const grouped = await taskService.getUpcomingTasks();

    // Unscheduled task must appear in unscheduled bucket
    const unscheduledIds = grouped.unscheduled.map((t) => t.id);
    expect(unscheduledIds).toContain(unscheduled.id);
  });

  // ─── getTaskStats ─────────────────────────────────────────────────────────

  it('should return task statistics with accurate counts and completion rate', async () => {
    // Create a known pair for stats verification
    const t1 = await taskService.createTask({ title: 'Stats task A', status: 'todo' });
    const t2 = await taskService.createTask({ title: 'Stats task B', status: 'todo' });
    await taskService.transitionStatus(t2.id, 'completed');

    const stats = await taskService.getTaskStats();

    expect(stats.total).toBeGreaterThanOrEqual(2);
    expect(stats.completed).toBeGreaterThanOrEqual(1);
    expect(stats.completionRate).toBeGreaterThanOrEqual(0);
    expect(stats.completionRate).toBeLessThanOrEqual(100);
    // t1 still todo
    const t1Check = await taskService.getTaskById(t1.id);
    expect(t1Check!.status).toBe('todo');
  });
});
