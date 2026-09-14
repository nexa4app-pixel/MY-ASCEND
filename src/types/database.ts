// Universal metadata fields required on all domain tables
export interface UniversalMetadata {
  id: string;
  created_at: string; // UTC ISO-8601 string
  updated_at: string; // UTC ISO-8601 string
  version: number;
  device_id: string;
  is_deleted: number; // 0 or 1
  deleted_at: string | null;
}

// Migration record tracked in schema_metadata
export interface SchemaMetadata {
  version: number;
  name: string;
  applied_at: string;
  checksum: string;
  execution_time_ms: number;
}

// Table Record Count info for Diagnostics
export interface TableCountInfo {
  table_name: string;
  count: number;
}

// Database Ping Diagnostic Response
export interface DbPingResponse {
  status: 'healthy' | 'unhealthy';
  sqlite_version: string;
  latency_ms: number;
  database_path: string;
}

// Domain Models (Foundation Interfaces matching Migration 002)
export interface Profile extends UniversalMetadata {
  name: string;
  persona_type: 'personal' | 'academic' | 'professional';
  avatar_url?: string | null;
  is_active: number;
}

export interface Area extends UniversalMetadata {
  profile_id: string;
  name: string;
  color?: string | null;
  icon?: string | null;
  order_index: number;
}

export interface Device extends UniversalMetadata {
  name: string;
  platform: 'windows' | 'macos' | 'linux' | 'web' | 'android' | 'ios';
  last_seen_at: string;
}

export interface SettingRecord extends UniversalMetadata {
  key: string;
  value: string;
  category: string;
}

export type InboxSource = 'quick_capture' | 'note' | 'link' | 'task_candidate' | 'voice';
export type InboxStatus = 'unprocessed' | 'processed' | 'archived';

export interface InboxCapture extends UniversalMetadata {
  profile_id?: string | null;
  raw_content: string;
  source: InboxSource;
  status: InboxStatus;
  processed_at?: string | null;
}

export interface Note extends UniversalMetadata {
  profile_id?: string | null;
  title: string;
  content: string;
  note_type: 'quick' | 'markdown' | 'rich';
  is_pinned: number;
  is_archived: number;
}

export type TaskPriority = 'urgent' | 'high' | 'medium' | 'low';
export type TaskStatus = 'inbox' | 'todo' | 'in_progress' | 'completed' | 'cancelled';

export interface Task extends UniversalMetadata {
  project_id?: string | null;
  parent_task_id?: string | null;
  title: string;
  description?: string | null;
  due_date?: string | null;
  priority: TaskPriority;
  status: TaskStatus;
  estimated_minutes?: number | null;
  actual_minutes?: number | null;
  completed_at?: string | null;
}

export interface Project extends UniversalMetadata {
  goal_id?: string | null;
  area_id?: string | null;
  title: string;
  description?: string | null;
  deadline?: string | null;
  priority: TaskPriority;
  status: 'planning' | 'in_progress' | 'paused' | 'completed' | 'cancelled';
  // Computed runtime fields
  task_count?: number;
  completed_task_count?: number;
  progress_percent?: number;
}

export interface Goal extends UniversalMetadata {
  vision_id?: string | null;
  area_id?: string | null;
  title: string;
  description?: string | null;
  target_date?: string | null;
  status: 'not_started' | 'in_progress' | 'completed' | 'paused';
  progress_percent: number;
}

export interface Journal extends UniversalMetadata {
  profile_id: string;
  entry_date: string; // YYYY-MM-DD
  title?: string | null;
  content: string;
  mood?: string | null;
  tags?: string | null;
}

// ─── Academic Management Models (Migration 002 / Phase 04) ────────────────────

export type InstitutionType = 'university' | 'institute' | 'school' | 'self_study';

export interface Institution extends UniversalMetadata {
  profile_id: string;
  name: string;
  type: InstitutionType;
  degree_or_program?: string | null;
  current_term?: string | null;
  // Computed runtime fields
  subject_count?: number;
}

export interface Subject extends UniversalMetadata {
  institution_id: string;
  name: string;
  code?: string | null;
  credits?: number | null;
  instructor?: string | null;
  color?: string | null;
  // Computed runtime fields
  book_count?: number;
  topic_count?: number;
  completed_topic_count?: number;
}

export interface Book extends UniversalMetadata {
  subject_id?: string | null;
  title: string;
  authors?: string | null;
  edition?: string | null;
  total_pages?: number | null;
  read_pages?: number | null;
  link?: string | null;
  // Computed runtime fields
  chapter_count?: number;
  topic_count?: number;
  completed_topic_count?: number;
  progress_percent?: number;
}

export interface Chapter extends UniversalMetadata {
  book_id: string;
  chapter_number: number;
  title: string;
  start_page?: number | null;
  end_page?: number | null;
  // Computed runtime fields
  section_count?: number;
  topic_count?: number;
  completed_topic_count?: number;
}

export interface Section extends UniversalMetadata {
  chapter_id: string;
  section_number?: string | null;
  title: string;
  page?: number | null;
  // Computed runtime fields
  topic_count?: number;
  completed_topic_count?: number;
}

export type TopicImportance = 'low' | 'medium' | 'high' | 'critical';

export interface Topic extends UniversalMetadata {
  subject_id: string;
  chapter_id: string;
  section_id?: string | null;
  title: string;
  importance_level: TopicImportance;
  is_completed: number; // 0 or 1
}

// ─── Active Learning & Mastery Models (Migration 002 / Phase 05) ─────────────

export type LearningActivityType = 'study' | 'practice' | 'review' | 'teaching';

export interface LearningSession extends UniversalMetadata {
  topic_id?: string | null;
  subject_id?: string | null;
  activity_type: LearningActivityType;
  started_at: string;
  ended_at?: string | null;
  duration_minutes?: number | null;
  comprehension_rating?: number | null; // 1 to 5
  summary?: string | null;
  // Computed runtime fields
  topic_title?: string | null;
  subject_name?: string | null;
}

export type EvidenceType =
  | 'problem_solved'
  | 'quiz_score'
  | 'flashcard_review'
  | 'summary_note'
  | 'concept_map';

export interface LearningEvidence extends UniversalMetadata {
  learning_session_id?: string | null;
  topic_id?: string | null;
  evidence_type: EvidenceType;
  description?: string | null;
  score?: number | null; // e.g. 0 to 100 or rating
}

export type MasteryTier = 'unstudied' | 'novice' | 'competent' | 'proficient' | 'mastered';

export interface MasteryRecord extends UniversalMetadata {
  topic_id: string;
  level: number; // 0.0 to 100.0 mastery percentage
  tier: MasteryTier;
  confidence_score: number; // 0.0 to 1.0
  repetitions: number; // Consecutive successful reviews
  ease_factor: number; // SM-2 multiplier (min 1.3, default 2.5)
  interval_days: number; // Days until next review
  next_review_at?: string | null; // UTC date string for scheduled review
  last_assessed_at?: string | null;
  // Computed runtime fields
  retention_decay_rate?: number; // Current retention % based on forgetting curve
  is_due_today?: boolean;
}

// ─── Phase 06: Focus Engine & Schedules ────────────────────────────────────────

export type FocusSessionType = 'pomodoro' | 'stopwatch' | 'countdown';
export type FocusCompletedStatus = 'completed' | 'abandoned' | 'interrupted';

export interface FocusSession extends UniversalMetadata {
  task_id?: string | null;
  topic_id?: string | null;
  subject_id?: string | null;
  project_id?: string | null;
  session_type: FocusSessionType;
  planned_duration_minutes: number;
  actual_duration_minutes: number;
  interruption_count: number;
  completed_status: FocusCompletedStatus;
  notes?: string | null;
  started_at: string;
  ended_at?: string | null;
  // Computed runtime fields
  task_title?: string | null;
  topic_title?: string | null;
  subject_name?: string | null;
}

export type ScheduleEntityType = 'task' | 'topic' | 'event' | 'general';
export type ScheduleStatus = 'planned' | 'completed' | 'cancelled';

export interface Schedule extends UniversalMetadata {
  profile_id: string;
  title: string;
  entity_type: ScheduleEntityType;
  entity_id?: string | null;
  start_time: string; // UTC ISO-8601
  end_time: string; // UTC ISO-8601
  is_all_day: number; // 0 or 1
  color_tag?: string | null;
  status: ScheduleStatus;
  // Computed runtime fields
  entity_title?: string | null;
}

// ─── Phase 07: Personal Growth, Journal & Memory Vault ─────────────────────────

export interface JournalEntry extends UniversalMetadata {
  profile_id: string;
  entry_date: string; // YYYY-MM-DD
  title?: string | null;
  content: string;
  mood_score?: number | null; // 1 to 5
  energy_level?: number | null; // 1 to 5
  mood?: string | null;
  tags?: string | null;
}

export type MemoryVaultCategory = 'gratitude' | 'win' | 'lesson' | 'insight' | 'milestone';

export interface MemoryVaultItem extends UniversalMetadata {
  profile_id: string;
  title: string;
  content: string;
  category: MemoryVaultCategory;
  journal_entry_id?: string | null;
  reflection_date?: string | null; // UTC ISO-8601
  media_urls?: string | null;
  significance_rating: number; // 1 to 5
}

// ─── Phase 08: Analytics & Growth Intelligence ─────────────────────────────────

export type AnalyticsTimeRange = 'week' | 'month' | '3months' | 'all';

export interface SubScoreProductivity {
  score: number; // 0 - 100
  completedTasks: number;
  totalTasks: number;
  focusMinutes: number;
}

export interface SubScoreLearning {
  score: number; // 0 - 100
  averageMastery: number;
  totalSessions: number;
}

export interface SubScoreWellBeing {
  score: number; // 0 - 100
  averageMood: number;
  journalStreak: number;
}

export interface AscendGrowthScore {
  totalScore: number; // 0 - 100
  tier: 'exceptional' | 'balanced' | 'developing' | 'needs_attention';
  tierLabel: string;
  subScores: {
    productivity: SubScoreProductivity;
    learning: SubScoreLearning;
    wellBeing: SubScoreWellBeing;
  };
}

export interface DailyProductivityTrend {
  date: string; // YYYY-MM-DD
  focusMinutes: number;
  tasksCompleted: number;
  tasksCreated: number;
  avgMood: number | null;
  avgEnergy: number | null;
}

export interface CrossModuleCorrelation {
  correlationType: string;
  description: string;
  significance: 'high' | 'moderate' | 'low';
  insightMessage: string;
}

export interface SystemSummaryStats {
  totalTasks: number;
  completedTasks: number;
  totalFocusMinutes: number;
  masteredTopicsCount: number;
  totalTopicsCount: number;
  totalJournalEntries: number;
  totalMemoriesCount: number;
  ascendScore: number;
}

// System Tables (Migration 003)
export interface ActivityHistory {
  id: string;
  timestamp: string;
  device_id: string;
  activity_type: string;
  description: string;
  metadata?: string | null;
}

export interface ChangeLog {
  id: string;
  table_name: string;
  record_id: string;
  operation: 'INSERT' | 'UPDATE' | 'DELETE';
  timestamp: string;
  device_id: string;
  version: number;
  payload?: string | null;
}

export interface TrashRecord {
  id: string;
  entity_type: string;
  entity_id: string;
  deleted_at: string;
  device_id: string;
  payload: string;
  can_restore: number;
}
