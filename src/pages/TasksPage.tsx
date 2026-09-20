import React, { useState, useEffect, useCallback } from 'react';
import {
  CheckSquare,
  Plus,
  Calendar as CalendarIcon,
  Folder,
  Grid,
  Inbox,
  RefreshCw,
  Search,
  FolderPlus,
  AlertTriangle,
  ArrowRight,
} from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { Card } from '../components/Card';
import { Badge } from '../components/Badge';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { TableSkeleton } from '../components/Skeleton';
import { TaskModal } from '../components/TaskModal';
import { ProjectModal } from '../components/ProjectModal';
import { TaskItem } from '../components/TaskItem';
import { taskService, UpcomingTasksGrouped, EisenhowerMatrixTasks, TaskStats } from '../services/taskService';
import { projectService } from '../services/projectService';
import { Task, Project, TaskStatus } from '../types/database';
import { useTranslation } from '../store/useLocaleStore';

type TaskTab = 'today' | 'upcoming' | 'projects' | 'matrix' | 'inbox' | 'all';

export const TasksPage: React.FC = () => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<TaskTab>('today');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [upcoming, setUpcoming] = useState<UpcomingTasksGrouped | null>(null);
  const [matrix, setMatrix] = useState<EisenhowerMatrixTasks | null>(null);
  const [stats, setStats] = useState<TaskStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProjectFilter, setSelectedProjectFilter] = useState<string>('all');

  // Modals
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState<Task | null>(null);
  const [defaultTaskStatus, setDefaultTaskStatus] = useState<TaskStatus>('todo');
  const [defaultTaskProjectId, setDefaultTaskProjectId] = useState<string | null>(null);

  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [projectToEdit, setProjectToEdit] = useState<Project | null>(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [allTasks, allProjects, upcomingGrouped, matrixData, taskStats] = await Promise.all([
        taskService.getTasks({
          search: searchQuery,
          projectId: selectedProjectFilter === 'all' ? null : selectedProjectFilter,
        }),
        projectService.getProjects(),
        taskService.getUpcomingTasks(),
        taskService.getEisenhowerMatrix(),
        taskService.getTaskStats(),
      ]);

      setTasks(allTasks);
      setProjects(allProjects);
      setUpcoming(upcomingGrouped);
      setMatrix(matrixData);
      setStats(taskStats);
    } catch (err) {
      console.error('Failed to load tasks data:', err);
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery, selectedProjectFilter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Task actions
  const handleToggleTask = async (task: Task) => {
    try {
      await taskService.toggleTaskStatus(task.id);
      await loadData();
    } catch (err) {
      console.error('Failed to toggle task status:', err);
    }
  };

  const handleEditTask = (task: Task) => {
    setTaskToEdit(task);
    setIsTaskModalOpen(true);
  };

  const handleDeleteTask = async (id: string) => {
    try {
      await taskService.deleteTask(id);
      await loadData();
    } catch (err) {
      console.error('Failed to delete task:', err);
    }
  };

  const handleOpenNewTask = (status: TaskStatus = 'todo', projectId?: string | null) => {
    setTaskToEdit(null);
    setDefaultTaskStatus(status);
    setDefaultTaskProjectId(projectId || null);
    setIsTaskModalOpen(true);
  };

  const handlePlanInboxTask = async (taskId: string) => {
    try {
      await taskService.transitionStatus(taskId, 'todo');
      await loadData();
    } catch (err) {
      console.error('Failed to transition inbox task:', err);
    }
  };

  const projectMap = React.useMemo(() => {
    const map = new Map<string, string>();
    projects.forEach((p) => map.set(p.id, p.title));
    return map;
  }, [projects]);

  const todayTasks = tasks.filter((t) => {
    if (t.status !== 'todo' && t.status !== 'in_progress') return false;
    if (!t.due_date) return false;
    const todayStr = new Date().toISOString().split('T')[0];
    return t.due_date.split('T')[0] <= todayStr;
  });

  const inboxTasks = tasks.filter((t) => t.status === 'inbox');

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <PageHeader
        title={t('tasks.title')}
        description={t('tasks.description')}
        badge={<Badge variant="accent">{t('tasks.badge')}</Badge>}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              icon={<FolderPlus className="w-3.5 h-3.5 text-purple-500" />}
              onClick={() => {
                setProjectToEdit(null);
                setIsProjectModalOpen(true);
              }}
            >
              {t('tasks.newProject')}
            </Button>
            <Button
              variant="primary"
              size="sm"
              icon={<Plus className="w-3.5 h-3.5" />}
              onClick={() => handleOpenNewTask('todo')}
            >
              {t('tasks.newTask')}
            </Button>
          </div>
        }
      />

      {/* Top Statistics Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <Card variant="acrylic" className="p-3 text-center">
          <span className="text-[11px] text-[#8a8a8a]">{t('tasks.dueToday')}</span>
          <div className="text-xl font-bold text-[#0078d4] mt-1 font-mono">
            {todayTasks.length}
          </div>
        </Card>

        <Card variant="acrylic" className="p-3 text-center">
          <span className="text-[11px] text-[#8a8a8a]">{t('tasks.inboxRaw')}</span>
          <div className="text-xl font-bold text-purple-500 mt-1 font-mono">
            {stats?.inbox ?? 0}
          </div>
        </Card>

        <Card variant="acrylic" className="p-3 text-center">
          <span className="text-[11px] text-[#8a8a8a]">{t('tasks.todoWaiting')}</span>
          <div className="text-xl font-bold text-[#1f1f1f] dark:text-white mt-1 font-mono">
            {stats?.todo ?? 0}
          </div>
        </Card>

        <Card variant="acrylic" className="p-3 text-center">
          <span className="text-[11px] text-[#8a8a8a]">{t('tasks.inProgress')}</span>
          <div className="text-xl font-bold text-amber-500 mt-1 font-mono">
            {stats?.inProgress ?? 0}
          </div>
        </Card>

        <Card variant="acrylic" className="p-3 text-center">
          <span className="text-[11px] text-[#8a8a8a]">{t('tasks.overdue')}</span>
          <div className="text-xl font-bold text-red-500 mt-1 font-mono">
            {stats?.overdue ?? 0}
          </div>
        </Card>

        <Card variant="acrylic" className="p-3 text-center">
          <span className="text-[11px] text-[#8a8a8a]">{t('tasks.completed')}</span>
          <div className="text-xl font-bold text-emerald-500 mt-1 font-mono">
            {stats?.completed ?? 0}
          </div>
        </Card>
      </div>

      {/* View Navigation Tabs & Filters */}
      <Card variant="acrylic" className="p-3 space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Tab buttons */}
          <div className="flex items-center gap-1 overflow-x-auto p-1 bg-black/5 dark:bg-white/5 rounded-lg text-xs font-medium select-none">
            {[
              { id: 'today', label: t('tasks.tabToday'), icon: CheckSquare, badge: todayTasks.length },
              { id: 'upcoming', label: t('tasks.tabUpcoming'), icon: CalendarIcon },
              { id: 'projects', label: t('tasks.tabProjects'), icon: Folder, badge: projects.length },
              { id: 'matrix', label: t('tasks.tabMatrix'), icon: Grid },
              { id: 'inbox', label: t('tasks.tabInbox'), icon: Inbox, badge: stats?.inbox },
              { id: 'all', label: t('tasks.tabAll'), icon: CheckSquare },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as TaskTab)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all whitespace-nowrap ${
                    isActive
                      ? 'bg-white dark:bg-[#333] text-[#0078d4] dark:text-[#60a5fa] font-bold shadow-sm'
                      : 'text-[#616161] dark:text-[#adadad] hover:text-black dark:hover:text-white'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                  {tab.badge !== undefined && tab.badge > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-black/10 dark:bg-white/10">
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Search & Project filter */}
          <div className="flex items-center gap-2">
            <div className="w-48 sm:w-56">
              <Input
                placeholder={t('tasks.searchPlaceholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                prefixIcon={<Search className="w-3.5 h-3.5" />}
                className="h-8 text-xs"
              />
            </div>

            {projects.length > 0 && (
              <select
                value={selectedProjectFilter}
                onChange={(e) => setSelectedProjectFilter(e.target.value)}
                className="h-8 text-xs bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-md px-2 text-[#1f1f1f] dark:text-white"
              >
                <option value="all">{t('tasks.allProjects')}</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title}
                  </option>
                ))}
              </select>
            )}

            <Button variant="subtle" size="sm" onClick={loadData} aria-label={t('tasks.refreshTooltip')} title={t('tasks.refreshTooltip')}>
              <RefreshCw className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </Card>

      {/* Main Content Sections based on Active Tab */}
      {isLoading ? (
        <TableSkeleton rows={5} columns={3} />
      ) : (
        <>
          {/* TAB 1: TODAY VIEW */}
          {activeTab === 'today' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-[#1f1f1f] dark:text-white flex items-center gap-2">
                  <span>{t('tasks.todayPriorityTasks')}</span>
                  <Badge variant="accent" size="sm">{todayTasks.length} {t('tasks.taskCount')}</Badge>
                </h3>

                <Button
                  variant="secondary"
                  size="sm"
                  icon={<Plus className="w-3 h-3" />}
                  onClick={() => {
                    setTaskToEdit(null);
                    setDefaultTaskStatus('todo');
                    setIsTaskModalOpen(true);
                  }}
                >
                  {t('tasks.addTodayTask')}
                </Button>
              </div>

              {todayTasks.length === 0 ? (
                <Card variant="acrylic" className="p-8 text-center">
                  <p className="text-sm text-[#8a8a8a]">
                    {t('tasks.todayEmpty')}
                  </p>
                </Card>
              ) : (
                <div className="space-y-2.5">
                  {todayTasks.map((t) => (
                    <TaskItem
                      key={t.id}
                      task={t}
                      projectName={t.project_id ? projectMap.get(t.project_id) : null}
                      onToggleStatus={handleToggleTask}
                      onEdit={handleEditTask}
                      onDelete={handleDeleteTask}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: UPCOMING / SCHEDULED VIEW */}
          {activeTab === 'upcoming' && upcoming && (
            <div className="space-y-6">
              {/* Overdue */}
              {upcoming.overdue.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-red-600 dark:text-red-400">
                    <AlertTriangle className="w-4 h-4" />
                    <span>{t('tasks.upcomingOverdue')} ({upcoming.overdue.length})</span>
                  </div>
                  <div className="space-y-2">
                    {upcoming.overdue.map((t) => (
                      <TaskItem
                        key={t.id}
                        task={t}
                        projectName={t.project_id ? projectMap.get(t.project_id) : null}
                        onToggleStatus={handleToggleTask}
                        onEdit={handleEditTask}
                        onDelete={handleDeleteTask}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Today */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-amber-600 dark:text-amber-400">
                  <CalendarIcon className="w-4 h-4" />
                  <span>{t('tasks.upcomingToday')} ({upcoming.today.length})</span>
                </div>
                {upcoming.today.length === 0 ? (
                  <p className="text-xs text-[#8a8a8a] py-2">{t('tasks.upcomingTodayEmpty')}</p>
                ) : (
                  <div className="space-y-2">
                    {upcoming.today.map((t) => (
                      <TaskItem
                        key={t.id}
                        task={t}
                        projectName={t.project_id ? projectMap.get(t.project_id) : null}
                        onToggleStatus={handleToggleTask}
                        onEdit={handleEditTask}
                        onDelete={handleDeleteTask}
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* Next 7 Days */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-[#0078d4]">
                  <CalendarIcon className="w-4 h-4" />
                  <span>{t('tasks.upcomingNext7Days')} ({upcoming.next7Days.length})</span>
                </div>
                {upcoming.next7Days.length === 0 ? (
                  <p className="text-xs text-[#8a8a8a] py-2">{t('tasks.upcomingNext7DaysEmpty')}</p>
                ) : (
                  <div className="space-y-2">
                    {upcoming.next7Days.map((t) => (
                      <TaskItem
                        key={t.id}
                        task={t}
                        projectName={t.project_id ? projectMap.get(t.project_id) : null}
                        onToggleStatus={handleToggleTask}
                        onEdit={handleEditTask}
                        onDelete={handleDeleteTask}
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* Later */}
              {upcoming.later.length > 0 && (
                <div className="space-y-2">
                  <div className="text-xs font-bold text-[#8a8a8a]">
                    <span>{t('tasks.upcomingLater')} ({upcoming.later.length})</span>
                  </div>
                  <div className="space-y-2">
                    {upcoming.later.map((t) => (
                      <TaskItem
                        key={t.id}
                        task={t}
                        projectName={t.project_id ? projectMap.get(t.project_id) : null}
                        onToggleStatus={handleToggleTask}
                        onEdit={handleEditTask}
                        onDelete={handleDeleteTask}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: PROJECTS STREAM VIEW */}
          {activeTab === 'projects' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-[#1f1f1f] dark:text-white">
                  {t('tasks.activeProjectStreams')} ({projects.length})
                </h3>
                <Button
                  variant="primary"
                  size="sm"
                  icon={<FolderPlus className="w-3.5 h-3.5" />}
                  onClick={() => {
                    setProjectToEdit(null);
                    setIsProjectModalOpen(true);
                  }}
                >
                  {t('tasks.createProjectBtn')}
                </Button>
              </div>

              {projects.length === 0 ? (
                <Card variant="acrylic" className="p-8 text-center">
                  <Folder className="w-12 h-12 text-purple-500/40 mx-auto mb-3" />
                  <p className="text-sm text-[#1f1f1f] dark:text-white font-semibold">{t('tasks.noProjectsTitle')}</p>
                  <p className="text-xs text-[#8a8a8a] mt-1 mb-4">{t('tasks.noProjectsDesc')}</p>
                  <Button
                    variant="secondary"
                    size="sm"
                    icon={<Plus className="w-3.5 h-3.5" />}
                    onClick={() => {
                      setProjectToEdit(null);
                      setIsProjectModalOpen(true);
                    }}
                  >
                    {t('tasks.createFirstProject')}
                  </Button>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {projects.map((proj) => {
                    const projectTasks = tasks.filter((t) => t.project_id === proj.id);
                    return (
                      <Card key={proj.id} variant="acrylic" className="p-4 space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-500 flex items-center justify-center shrink-0">
                              <Folder className="w-4 h-4" />
                            </div>
                            <div className="text-start">
                              <h4 className="font-bold text-sm text-[#1f1f1f] dark:text-white">{proj.title}</h4>
                              {proj.deadline && (
                                <span className="text-[11px] text-[#8a8a8a]">
                                  {t('tasks.deadline')}: {proj.deadline.substring(0, 10)}
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-1">
                            <Button
                              variant="subtle"
                              size="sm"
                              className="h-7 w-7 p-0"
                              onClick={() => {
                                setProjectToEdit(proj);
                                setIsProjectModalOpen(true);
                              }}
                            >
                              <FolderPlus className="w-3.5 h-3.5 text-[#8a8a8a]" />
                            </Button>
                            <Button
                              variant="subtle"
                              size="sm"
                              className="h-7 w-7 p-0"
                              onClick={() => handleOpenNewTask('todo', proj.id)}
                              title={t('tasks.addTaskToProject')}
                            >
                              <Plus className="w-3.5 h-3.5 text-[#0078d4]" />
                            </Button>
                          </div>
                        </div>

                        {proj.description && (
                          <p className="text-xs text-[#616161] dark:text-[#adadad] line-clamp-2">
                            {proj.description}
                          </p>
                        )}

                        {/* Progress Bar */}
                        <div className="space-y-1.5 pt-1">
                          <div className="flex items-center justify-between text-xs text-[#8a8a8a]">
                            <span>{t('tasks.projectProgress')}</span>
                            <span className="font-mono font-bold text-[#1f1f1f] dark:text-white">
                              {proj.completed_task_count} {t('tasks.outOf')} {proj.task_count} ({proj.progress_percent}%)
                            </span>
                          </div>
                          <div className="w-full h-2 bg-black/10 dark:bg-white/10 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-purple-500 to-[#0078d4] rounded-full transition-all"
                              style={{ width: `${proj.progress_percent}%` }}
                            />
                          </div>
                        </div>

                        {/* Project Tasks Preview */}
                        <div className="space-y-1.5 pt-2 border-t border-black/5 dark:border-white/5 max-h-48 overflow-y-auto">
                          {projectTasks.length === 0 ? (
                            <p className="text-[11px] text-[#8a8a8a] text-center py-2">{t('tasks.noTasksInProject')}</p>
                          ) : (
                            projectTasks.map((t) => (
                              <TaskItem
                                key={t.id}
                                task={t}
                                onToggleStatus={handleToggleTask}
                                onEdit={handleEditTask}
                                onDelete={handleDeleteTask}
                              />
                            ))
                          )}
                        </div>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: EISENHOWER MATRIX VIEW */}
          {activeTab === 'matrix' && matrix && (
            <div className="space-y-4">
              <div className="text-xs text-[#8a8a8a] text-start leading-relaxed">
                {t('tasks.matrixDescription')}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Q1: Urgent & Important (P1) */}
                <Card variant="acrylic" className="p-4 space-y-3 border-s-4 border-s-red-500">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-sm text-red-600 dark:text-red-400">
                        {t('tasks.q1Title')}
                      </h4>
                      <p className="text-[11px] text-[#8a8a8a]">{t('tasks.q1Desc')}</p>
                    </div>
                    <Badge variant="error" size="sm">{matrix.q1UrgentImportant.length}</Badge>
                  </div>

                  <div className="space-y-2 max-h-80 overflow-y-auto">
                    {matrix.q1UrgentImportant.length === 0 ? (
                      <p className="text-xs text-[#8a8a8a] text-center py-4">{t('tasks.emptyQuadrant')}</p>
                    ) : (
                      matrix.q1UrgentImportant.map((t) => (
                        <TaskItem
                          key={t.id}
                          task={t}
                          projectName={t.project_id ? projectMap.get(t.project_id) : null}
                          onToggleStatus={handleToggleTask}
                          onEdit={handleEditTask}
                          onDelete={handleDeleteTask}
                        />
                      ))
                    )}
                  </div>
                </Card>

                {/* Q2: Important, Not Urgent (P2) */}
                <Card variant="acrylic" className="p-4 space-y-3 border-s-4 border-s-amber-500">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-sm text-amber-600 dark:text-amber-400">
                        {t('tasks.q2Title')}
                      </h4>
                      <p className="text-[11px] text-[#8a8a8a]">{t('tasks.q2Desc')}</p>
                    </div>
                    <Badge variant="warning" size="sm">{matrix.q2ImportantNotUrgent.length}</Badge>
                  </div>

                  <div className="space-y-2 max-h-80 overflow-y-auto">
                    {matrix.q2ImportantNotUrgent.length === 0 ? (
                      <p className="text-xs text-[#8a8a8a] text-center py-4">{t('tasks.emptyQuadrant')}</p>
                    ) : (
                      matrix.q2ImportantNotUrgent.map((t) => (
                        <TaskItem
                          key={t.id}
                          task={t}
                          projectName={t.project_id ? projectMap.get(t.project_id) : null}
                          onToggleStatus={handleToggleTask}
                          onEdit={handleEditTask}
                          onDelete={handleDeleteTask}
                        />
                      ))
                    )}
                  </div>
                </Card>

                {/* Q3: Urgent, Not Important (P3) */}
                <Card variant="acrylic" className="p-4 space-y-3 border-s-4 border-s-[#0078d4]">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-sm text-[#0078d4]">
                        {t('tasks.q3Title')}
                      </h4>
                      <p className="text-[11px] text-[#8a8a8a]">{t('tasks.q3Desc')}</p>
                    </div>
                    <Badge variant="accent" size="sm">{matrix.q3UrgentNotImportant.length}</Badge>
                  </div>

                  <div className="space-y-2 max-h-80 overflow-y-auto">
                    {matrix.q3UrgentNotImportant.length === 0 ? (
                      <p className="text-xs text-[#8a8a8a] text-center py-4">{t('tasks.emptyQuadrant')}</p>
                    ) : (
                      matrix.q3UrgentNotImportant.map((t) => (
                        <TaskItem
                          key={t.id}
                          task={t}
                          projectName={t.project_id ? projectMap.get(t.project_id) : null}
                          onToggleStatus={handleToggleTask}
                          onEdit={handleEditTask}
                          onDelete={handleDeleteTask}
                        />
                      ))
                    )}
                  </div>
                </Card>

                {/* Q4: Neither (P4) */}
                <Card variant="acrylic" className="p-4 space-y-3 border-s-4 border-s-gray-400">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-sm text-[#616161] dark:text-[#adadad]">
                        {t('tasks.q4Title')}
                      </h4>
                      <p className="text-[11px] text-[#8a8a8a]">{t('tasks.q4Desc')}</p>
                    </div>
                    <Badge variant="neutral" size="sm">{matrix.q4Neither.length}</Badge>
                  </div>

                  <div className="space-y-2 max-h-80 overflow-y-auto">
                    {matrix.q4Neither.length === 0 ? (
                      <p className="text-xs text-[#8a8a8a] text-center py-4">{t('tasks.emptyQuadrant')}</p>
                    ) : (
                      matrix.q4Neither.map((t) => (
                        <TaskItem
                          key={t.id}
                          task={t}
                          projectName={t.project_id ? projectMap.get(t.project_id) : null}
                          onToggleStatus={handleToggleTask}
                          onEdit={handleEditTask}
                          onDelete={handleDeleteTask}
                        />
                      ))
                    )}
                  </div>
                </Card>
              </div>
            </div>
          )}

          {/* TAB 5: INBOX CANDIDATE TASKS */}
          {activeTab === 'inbox' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-[#1f1f1f] dark:text-white flex items-center gap-2">
                    <span>{t('tasks.inboxCandidatesTitle')}</span>
                    <Badge variant="neutral" size="sm">{inboxTasks.length} {t('tasks.taskCount')}</Badge>
                  </h3>
                  <p className="text-xs text-[#8a8a8a]">
                    {t('tasks.inboxCandidatesDesc')}
                  </p>
                </div>
              </div>

              {inboxTasks.length === 0 ? (
                <Card variant="acrylic" className="p-8 text-center">
                  <Inbox className="w-10 h-10 text-purple-500/40 mx-auto mb-2" />
                  <p className="text-sm text-[#1f1f1f] dark:text-white font-semibold">
                    {t('tasks.inboxEmptyTitle')}
                  </p>
                  <p className="text-xs text-[#8a8a8a] mt-1">
                    {t('tasks.inboxEmptyDesc')}
                  </p>
                </Card>
              ) : (
                <div className="space-y-2.5">
                  {inboxTasks.map((taskItem) => (
                    <Card key={taskItem.id} variant="acrylic" className="p-3.5 flex items-center justify-between gap-3">
                      <div className="space-y-1 text-start">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-[#1f1f1f] dark:text-white">{taskItem.title}</span>
                          <Badge variant="neutral" size="sm">{t('tasks.inboxBadge')}</Badge>
                        </div>
                        {taskItem.description && (
                          <p className="text-xs text-[#616161] dark:text-[#adadad] line-clamp-1">{taskItem.description}</p>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handleEditTask(taskItem)}
                        >
                          {t('tasks.completeDetails')}
                        </Button>
                        <Button
                          variant="primary"
                          size="sm"
                          icon={<ArrowRight className="w-3.5 h-3.5" />}
                          onClick={() => handlePlanInboxTask(taskItem.id)}
                        >
                          {t('tasks.planToTasks')}
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 6: ALL TASKS */}
          {activeTab === 'all' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-[#8a8a8a] px-1">
                <span>{t('tasks.showingAllTasks')} ({tasks.length} {t('tasks.itemCount')})</span>
              </div>

              {tasks.length === 0 ? (
                <Card variant="acrylic" className="p-8 text-center">
                  <p className="text-sm text-[#8a8a8a]">{t('tasks.noTasksFound')}</p>
                </Card>
              ) : (
                tasks.map((t) => (
                  <TaskItem
                    key={t.id}
                    task={t}
                    projectName={t.project_id ? projectMap.get(t.project_id) : null}
                    onToggleStatus={handleToggleTask}
                    onEdit={handleEditTask}
                    onDelete={handleDeleteTask}
                  />
                ))
              )}
            </div>
          )}
        </>
      )}

      {/* Task Creation & Edit Modal */}
      <TaskModal
        isOpen={isTaskModalOpen}
        onClose={() => setIsTaskModalOpen(false)}
        taskToEdit={taskToEdit}
        defaultStatus={defaultTaskStatus}
        defaultProjectId={defaultTaskProjectId}
        onTaskSaved={loadData}
      />

      {/* Project Modal */}
      <ProjectModal
        isOpen={isProjectModalOpen}
        onClose={() => setIsProjectModalOpen(false)}
        projectToEdit={projectToEdit}
        onProjectSaved={loadData}
      />
    </div>
  );
};
