/**
 * Embedded SQL migration scripts and table definitions.
 */

export const MIGRATION_001_SQL = `
CREATE TABLE IF NOT EXISTS schema_metadata (
    version INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    applied_at TEXT NOT NULL,
    checksum TEXT NOT NULL,
    execution_time_ms INTEGER NOT NULL
);
`;

export const MIGRATION_002_SQL = `
-- 1. Profiles
CREATE TABLE IF NOT EXISTS profiles (
    id TEXT PRIMARY KEY,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    version INTEGER NOT NULL DEFAULT 1,
    device_id TEXT NOT NULL,
    is_deleted INTEGER NOT NULL DEFAULT 0,
    deleted_at TEXT,
    name TEXT NOT NULL,
    persona_type TEXT NOT NULL DEFAULT 'personal',
    avatar_url TEXT,
    is_active INTEGER NOT NULL DEFAULT 0
);

-- 2. Areas
CREATE TABLE IF NOT EXISTS areas (
    id TEXT PRIMARY KEY,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    version INTEGER NOT NULL DEFAULT 1,
    device_id TEXT NOT NULL,
    is_deleted INTEGER NOT NULL DEFAULT 0,
    deleted_at TEXT,
    profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    color TEXT,
    icon TEXT,
    order_index INTEGER NOT NULL DEFAULT 0
);

-- 3. Devices
CREATE TABLE IF NOT EXISTS devices (
    id TEXT PRIMARY KEY,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    version INTEGER NOT NULL DEFAULT 1,
    device_id TEXT NOT NULL,
    is_deleted INTEGER NOT NULL DEFAULT 0,
    deleted_at TEXT,
    name TEXT NOT NULL,
    platform TEXT NOT NULL,
    last_seen_at TEXT NOT NULL
);

-- 4. Settings
CREATE TABLE IF NOT EXISTS settings (
    id TEXT PRIMARY KEY,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    version INTEGER NOT NULL DEFAULT 1,
    device_id TEXT NOT NULL,
    is_deleted INTEGER NOT NULL DEFAULT 0,
    deleted_at TEXT,
    key TEXT UNIQUE NOT NULL,
    value TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'general'
);

-- 5. Inbox Captures
CREATE TABLE IF NOT EXISTS inbox_captures (
    id TEXT PRIMARY KEY,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    version INTEGER NOT NULL DEFAULT 1,
    device_id TEXT NOT NULL,
    is_deleted INTEGER NOT NULL DEFAULT 0,
    deleted_at TEXT,
    profile_id TEXT REFERENCES profiles(id) ON DELETE SET NULL,
    raw_content TEXT NOT NULL,
    source TEXT NOT NULL DEFAULT 'quick_capture',
    status TEXT NOT NULL DEFAULT 'unprocessed',
    processed_at TEXT
);

-- 6. Notes
CREATE TABLE IF NOT EXISTS notes (
    id TEXT PRIMARY KEY,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    version INTEGER NOT NULL DEFAULT 1,
    device_id TEXT NOT NULL,
    is_deleted INTEGER NOT NULL DEFAULT 0,
    deleted_at TEXT,
    profile_id TEXT REFERENCES profiles(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    content TEXT,
    note_type TEXT NOT NULL DEFAULT 'quick',
    is_pinned INTEGER NOT NULL DEFAULT 0,
    is_archived INTEGER NOT NULL DEFAULT 0
);

-- 7. Visions
CREATE TABLE IF NOT EXISTS visions (
    id TEXT PRIMARY KEY,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    version INTEGER NOT NULL DEFAULT 1,
    device_id TEXT NOT NULL,
    is_deleted INTEGER NOT NULL DEFAULT 0,
    deleted_at TEXT,
    profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    area_id TEXT REFERENCES areas(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    statement TEXT,
    timeframe_years INTEGER DEFAULT 5
);

-- 8. Goals
CREATE TABLE IF NOT EXISTS goals (
    id TEXT PRIMARY KEY,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    version INTEGER NOT NULL DEFAULT 1,
    device_id TEXT NOT NULL,
    is_deleted INTEGER NOT NULL DEFAULT 0,
    deleted_at TEXT,
    vision_id TEXT REFERENCES visions(id) ON DELETE SET NULL,
    area_id TEXT REFERENCES areas(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    description TEXT,
    target_date TEXT,
    status TEXT NOT NULL DEFAULT 'not_started',
    progress_percent REAL NOT NULL DEFAULT 0.0
);

-- 9. Projects
CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    version INTEGER NOT NULL DEFAULT 1,
    device_id TEXT NOT NULL,
    is_deleted INTEGER NOT NULL DEFAULT 0,
    deleted_at TEXT,
    goal_id TEXT REFERENCES goals(id) ON DELETE SET NULL,
    area_id TEXT REFERENCES areas(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    description TEXT,
    deadline TEXT,
    priority TEXT NOT NULL DEFAULT 'medium',
    status TEXT NOT NULL DEFAULT 'planning'
);

-- 10. Tasks
CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    version INTEGER NOT NULL DEFAULT 1,
    device_id TEXT NOT NULL,
    is_deleted INTEGER NOT NULL DEFAULT 0,
    deleted_at TEXT,
    project_id TEXT REFERENCES projects(id) ON DELETE SET NULL,
    parent_task_id TEXT REFERENCES tasks(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    description TEXT,
    due_date TEXT,
    priority TEXT NOT NULL DEFAULT 'medium',
    status TEXT NOT NULL DEFAULT 'todo',
    estimated_minutes INTEGER,
    actual_minutes INTEGER,
    completed_at TEXT
);

-- 11. Habits
CREATE TABLE IF NOT EXISTS habits (
    id TEXT PRIMARY KEY,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    version INTEGER NOT NULL DEFAULT 1,
    device_id TEXT NOT NULL,
    is_deleted INTEGER NOT NULL DEFAULT 0,
    deleted_at TEXT,
    area_id TEXT REFERENCES areas(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    description TEXT,
    frequency TEXT NOT NULL DEFAULT 'daily',
    target_count INTEGER NOT NULL DEFAULT 1,
    unit TEXT NOT NULL DEFAULT 'times',
    color TEXT,
    streak_current INTEGER NOT NULL DEFAULT 0,
    streak_longest INTEGER NOT NULL DEFAULT 0
);

-- 12. Habit Logs
CREATE TABLE IF NOT EXISTS habit_logs (
    id TEXT PRIMARY KEY,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    version INTEGER NOT NULL DEFAULT 1,
    device_id TEXT NOT NULL,
    is_deleted INTEGER NOT NULL DEFAULT 0,
    deleted_at TEXT,
    habit_id TEXT NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
    log_date TEXT NOT NULL,
    count INTEGER NOT NULL DEFAULT 1,
    notes TEXT
);

-- 13. Institutions
CREATE TABLE IF NOT EXISTS institutions (
    id TEXT PRIMARY KEY,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    version INTEGER NOT NULL DEFAULT 1,
    device_id TEXT NOT NULL,
    is_deleted INTEGER NOT NULL DEFAULT 0,
    deleted_at TEXT,
    profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'university',
    degree_or_program TEXT,
    current_term TEXT
);

-- 14. Subjects
CREATE TABLE IF NOT EXISTS subjects (
    id TEXT PRIMARY KEY,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    version INTEGER NOT NULL DEFAULT 1,
    device_id TEXT NOT NULL,
    is_deleted INTEGER NOT NULL DEFAULT 0,
    deleted_at TEXT,
    institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    code TEXT,
    credits REAL DEFAULT 3.0,
    instructor TEXT,
    color TEXT
);

-- 15. Books
CREATE TABLE IF NOT EXISTS books (
    id TEXT PRIMARY KEY,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    version INTEGER NOT NULL DEFAULT 1,
    device_id TEXT NOT NULL,
    is_deleted INTEGER NOT NULL DEFAULT 0,
    deleted_at TEXT,
    subject_id TEXT REFERENCES subjects(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    authors TEXT,
    edition TEXT,
    total_pages INTEGER,
    read_pages INTEGER DEFAULT 0,
    link TEXT
);

-- 16. Chapters
CREATE TABLE IF NOT EXISTS chapters (
    id TEXT PRIMARY KEY,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    version INTEGER NOT NULL DEFAULT 1,
    device_id TEXT NOT NULL,
    is_deleted INTEGER NOT NULL DEFAULT 0,
    deleted_at TEXT,
    book_id TEXT NOT NULL REFERENCES books(id) ON DELETE CASCADE,
    chapter_number INTEGER NOT NULL,
    title TEXT NOT NULL,
    start_page INTEGER,
    end_page INTEGER
);

-- 17. Sections
CREATE TABLE IF NOT EXISTS sections (
    id TEXT PRIMARY KEY,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    version INTEGER NOT NULL DEFAULT 1,
    device_id TEXT NOT NULL,
    is_deleted INTEGER NOT NULL DEFAULT 0,
    deleted_at TEXT,
    chapter_id TEXT NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,
    section_number TEXT,
    title TEXT NOT NULL,
    page INTEGER
);

-- 18. Topics
CREATE TABLE IF NOT EXISTS topics (
    id TEXT PRIMARY KEY,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    version INTEGER NOT NULL DEFAULT 1,
    device_id TEXT NOT NULL,
    is_deleted INTEGER NOT NULL DEFAULT 0,
    deleted_at TEXT,
    subject_id TEXT NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    chapter_id TEXT NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,
    section_id TEXT REFERENCES sections(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    importance_level TEXT NOT NULL DEFAULT 'medium',
    is_completed INTEGER NOT NULL DEFAULT 0
);

-- 19. Schedules
CREATE TABLE IF NOT EXISTS schedules (
    id TEXT PRIMARY KEY,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    version INTEGER NOT NULL DEFAULT 1,
    device_id TEXT NOT NULL,
    is_deleted INTEGER NOT NULL DEFAULT 0,
    deleted_at TEXT,
    profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    entity_type TEXT NOT NULL DEFAULT 'general',
    entity_id TEXT,
    start_time TEXT NOT NULL,
    end_time TEXT NOT NULL,
    is_all_day INTEGER NOT NULL DEFAULT 0,
    color_tag TEXT,
    status TEXT NOT NULL DEFAULT 'planned'
);

-- 20. Learning Sessions
CREATE TABLE IF NOT EXISTS learning_sessions (
    id TEXT PRIMARY KEY,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    version INTEGER NOT NULL DEFAULT 1,
    device_id TEXT NOT NULL,
    is_deleted INTEGER NOT NULL DEFAULT 0,
    deleted_at TEXT,
    topic_id TEXT REFERENCES topics(id) ON DELETE SET NULL,
    subject_id TEXT REFERENCES subjects(id) ON DELETE SET NULL,
    activity_type TEXT NOT NULL DEFAULT 'study',
    started_at TEXT NOT NULL,
    ended_at TEXT,
    duration_minutes INTEGER,
    comprehension_rating INTEGER,
    summary TEXT
);

-- 21. Learning Evidence
CREATE TABLE IF NOT EXISTS learning_evidence (
    id TEXT PRIMARY KEY,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    version INTEGER NOT NULL DEFAULT 1,
    device_id TEXT NOT NULL,
    is_deleted INTEGER NOT NULL DEFAULT 0,
    deleted_at TEXT,
    learning_session_id TEXT REFERENCES learning_sessions(id) ON DELETE SET NULL,
    topic_id TEXT REFERENCES topics(id) ON DELETE SET NULL,
    evidence_type TEXT NOT NULL DEFAULT 'problem_solved',
    description TEXT,
    score REAL
);

-- 22. Mastery Records
CREATE TABLE IF NOT EXISTS mastery_records (
    id TEXT PRIMARY KEY,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    version INTEGER NOT NULL DEFAULT 1,
    device_id TEXT NOT NULL,
    is_deleted INTEGER NOT NULL DEFAULT 0,
    deleted_at TEXT,
    topic_id TEXT NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
    level REAL NOT NULL DEFAULT 0.0,
    tier TEXT NOT NULL DEFAULT 'unstudied',
    confidence_score REAL NOT NULL DEFAULT 0.0,
    repetitions INTEGER NOT NULL DEFAULT 0,
    ease_factor REAL NOT NULL DEFAULT 2.5,
    interval_days INTEGER NOT NULL DEFAULT 0,
    next_review_at TEXT,
    last_assessed_at TEXT
);

-- 23. Focus Sessions
CREATE TABLE IF NOT EXISTS focus_sessions (
    id TEXT PRIMARY KEY,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    version INTEGER NOT NULL DEFAULT 1,
    device_id TEXT NOT NULL,
    is_deleted INTEGER NOT NULL DEFAULT 0,
    deleted_at TEXT,
    task_id TEXT REFERENCES tasks(id) ON DELETE SET NULL,
    topic_id TEXT REFERENCES topics(id) ON DELETE SET NULL,
    subject_id TEXT REFERENCES subjects(id) ON DELETE SET NULL,
    project_id TEXT REFERENCES projects(id) ON DELETE SET NULL,
    session_type TEXT NOT NULL DEFAULT 'pomodoro',
    planned_duration_minutes INTEGER NOT NULL DEFAULT 25,
    actual_duration_minutes INTEGER NOT NULL DEFAULT 0,
    interruption_count INTEGER NOT NULL DEFAULT 0,
    completed_status TEXT NOT NULL DEFAULT 'completed',
    notes TEXT,
    started_at TEXT NOT NULL,
    ended_at TEXT
);

-- 24. Events
CREATE TABLE IF NOT EXISTS events (
    id TEXT PRIMARY KEY,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    version INTEGER NOT NULL DEFAULT 1,
    device_id TEXT NOT NULL,
    is_deleted INTEGER NOT NULL DEFAULT 0,
    deleted_at TEXT,
    profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    start_time TEXT NOT NULL,
    end_time TEXT,
    is_all_day INTEGER NOT NULL DEFAULT 0,
    location TEXT
);

-- 25. Journals
CREATE TABLE IF NOT EXISTS journals (
    id TEXT PRIMARY KEY,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    version INTEGER NOT NULL DEFAULT 1,
    device_id TEXT NOT NULL,
    is_deleted INTEGER NOT NULL DEFAULT 0,
    deleted_at TEXT,
    profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    entry_date TEXT NOT NULL,
    title TEXT,
    content TEXT NOT NULL,
    mood_score INTEGER,
    energy_level INTEGER,
    mood TEXT,
    tags TEXT
);

-- 26. Memories
CREATE TABLE IF NOT EXISTS memories (
    id TEXT PRIMARY KEY,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    version INTEGER NOT NULL DEFAULT 1,
    device_id TEXT NOT NULL,
    is_deleted INTEGER NOT NULL DEFAULT 0,
    deleted_at TEXT,
    profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'win',
    journal_entry_id TEXT REFERENCES journals(id) ON DELETE SET NULL,
    reflection_date TEXT,
    media_urls TEXT,
    significance_rating INTEGER NOT NULL DEFAULT 3
);

-- 27. Files
CREATE TABLE IF NOT EXISTS files (
    id TEXT PRIMARY KEY,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    version INTEGER NOT NULL DEFAULT 1,
    device_id TEXT NOT NULL,
    is_deleted INTEGER NOT NULL DEFAULT 0,
    deleted_at TEXT,
    file_name TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_size INTEGER NOT NULL,
    mime_type TEXT,
    checksum TEXT
);

-- 28. Attachments
CREATE TABLE IF NOT EXISTS attachments (
    id TEXT PRIMARY KEY,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    version INTEGER NOT NULL DEFAULT 1,
    device_id TEXT NOT NULL,
    is_deleted INTEGER NOT NULL DEFAULT 0,
    deleted_at TEXT,
    file_id TEXT NOT NULL REFERENCES files(id) ON DELETE CASCADE,
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL
);

-- 29. Reminders
CREATE TABLE IF NOT EXISTS reminders (
    id TEXT PRIMARY KEY,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    version INTEGER NOT NULL DEFAULT 1,
    device_id TEXT NOT NULL,
    is_deleted INTEGER NOT NULL DEFAULT 0,
    deleted_at TEXT,
    entity_type TEXT,
    entity_id TEXT,
    title TEXT NOT NULL,
    remind_at TEXT NOT NULL,
    is_fired INTEGER NOT NULL DEFAULT 0,
    is_snoozed INTEGER NOT NULL DEFAULT 0
);
`;

export const MIGRATION_003_SQL = `
-- 1. Activity History
CREATE TABLE IF NOT EXISTS activity_history (
    id TEXT PRIMARY KEY,
    timestamp TEXT NOT NULL,
    device_id TEXT NOT NULL,
    activity_type TEXT NOT NULL,
    description TEXT NOT NULL,
    metadata TEXT
);

-- 2. Change Logs
CREATE TABLE IF NOT EXISTS change_logs (
    id TEXT PRIMARY KEY,
    table_name TEXT NOT NULL,
    record_id TEXT NOT NULL,
    operation TEXT NOT NULL,
    timestamp TEXT NOT NULL,
    device_id TEXT NOT NULL,
    version INTEGER NOT NULL,
    payload TEXT
);

-- 3. Trash
CREATE TABLE IF NOT EXISTS trash (
    id TEXT PRIMARY KEY,
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    deleted_at TEXT NOT NULL,
    device_id TEXT NOT NULL,
    payload TEXT NOT NULL,
    can_restore INTEGER NOT NULL DEFAULT 1
);
`;

export const MIGRATION_004_SQL = `
CREATE INDEX IF NOT EXISTS idx_profiles_is_deleted ON profiles(is_deleted);
CREATE INDEX IF NOT EXISTS idx_areas_profile_id ON areas(profile_id, is_deleted);
CREATE INDEX IF NOT EXISTS idx_settings_key ON settings(key);

CREATE INDEX IF NOT EXISTS idx_inbox_status ON inbox_captures(status, is_deleted);
CREATE INDEX IF NOT EXISTS idx_notes_profile ON notes(profile_id, is_deleted);
CREATE INDEX IF NOT EXISTS idx_notes_pinned ON notes(is_pinned, is_deleted);

CREATE INDEX IF NOT EXISTS idx_visions_profile ON visions(profile_id, is_deleted);
CREATE INDEX IF NOT EXISTS idx_goals_vision ON goals(vision_id, is_deleted);
CREATE INDEX IF NOT EXISTS idx_goals_status ON goals(status, is_deleted);
CREATE INDEX IF NOT EXISTS idx_projects_goal ON projects(goal_id, is_deleted);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status, is_deleted);
CREATE INDEX IF NOT EXISTS idx_tasks_project ON tasks(project_id, is_deleted);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status, is_deleted);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date, is_deleted);

CREATE INDEX IF NOT EXISTS idx_habits_area ON habits(area_id, is_deleted);
CREATE INDEX IF NOT EXISTS idx_habit_logs_habit_date ON habit_logs(habit_id, log_date);

CREATE INDEX IF NOT EXISTS idx_institutions_profile ON institutions(profile_id, is_deleted);
CREATE INDEX IF NOT EXISTS idx_subjects_institution ON subjects(institution_id, is_deleted);
CREATE INDEX IF NOT EXISTS idx_books_subject ON books(subject_id, is_deleted);
CREATE INDEX IF NOT EXISTS idx_chapters_book ON chapters(book_id, is_deleted);
CREATE INDEX IF NOT EXISTS idx_sections_chapter ON sections(chapter_id, is_deleted);
CREATE INDEX IF NOT EXISTS idx_topics_subject ON topics(subject_id, is_deleted);
CREATE INDEX IF NOT EXISTS idx_topics_chapter ON topics(chapter_id, is_deleted);
CREATE INDEX IF NOT EXISTS idx_schedules_profile ON schedules(profile_id, is_deleted);

CREATE INDEX IF NOT EXISTS idx_learning_sessions_topic ON learning_sessions(topic_id, is_deleted);
CREATE INDEX IF NOT EXISTS idx_learning_evidence_session ON learning_evidence(learning_session_id);
CREATE INDEX IF NOT EXISTS idx_mastery_records_topic ON mastery_records(topic_id, is_deleted);
CREATE INDEX IF NOT EXISTS idx_mastery_next_review ON mastery_records(next_review_at, is_deleted);

CREATE INDEX IF NOT EXISTS idx_focus_sessions_task ON focus_sessions(task_id);
CREATE INDEX IF NOT EXISTS idx_focus_sessions_topic ON focus_sessions(topic_id);
CREATE INDEX IF NOT EXISTS idx_focus_sessions_started ON focus_sessions(started_at, is_deleted);
CREATE INDEX IF NOT EXISTS idx_schedules_times ON schedules(start_time, end_time, is_deleted);
CREATE INDEX IF NOT EXISTS idx_events_start_time ON events(profile_id, start_time, is_deleted);

CREATE INDEX IF NOT EXISTS idx_journals_entry_date ON journals(profile_id, entry_date, is_deleted);
CREATE INDEX IF NOT EXISTS idx_memories_profile ON memories(profile_id, is_deleted);
CREATE INDEX IF NOT EXISTS idx_memories_category ON memories(category, is_deleted);
CREATE INDEX IF NOT EXISTS idx_attachments_entity ON attachments(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_reminders_remind_at ON reminders(remind_at, is_fired, is_deleted);

CREATE INDEX IF NOT EXISTS idx_activity_history_time ON activity_history(timestamp);
CREATE INDEX IF NOT EXISTS idx_change_logs_table_record ON change_logs(table_name, record_id);
CREATE INDEX IF NOT EXISTS idx_change_logs_time ON change_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_trash_entity ON trash(entity_type, entity_id);
`;

export const MIGRATION_005_SQL = `
CREATE VIRTUAL TABLE IF NOT EXISTS global_search_fts USING fts5(
  entity_type,
  entity_id,
  title,
  content,
  tags,
  tokenize='unicode61 remove_diacritics 1'
);

-- Triggers for tasks
CREATE TRIGGER IF NOT EXISTS tasks_ai AFTER INSERT ON tasks
WHEN NEW.is_deleted = 0
BEGIN
  DELETE FROM global_search_fts WHERE entity_type = 'task' AND entity_id = NEW.id;
  INSERT INTO global_search_fts(entity_type, entity_id, title, content, tags)
  VALUES('task', NEW.id, NEW.title, COALESCE(NEW.description, ''), COALESCE(NEW.priority, ''));
END;

CREATE TRIGGER IF NOT EXISTS tasks_au AFTER UPDATE ON tasks
BEGIN
  DELETE FROM global_search_fts WHERE entity_type = 'task' AND entity_id = NEW.id;
  INSERT INTO global_search_fts(entity_type, entity_id, title, content, tags)
  SELECT 'task', NEW.id, NEW.title, COALESCE(NEW.description, ''), COALESCE(NEW.priority, '')
  WHERE NEW.is_deleted = 0;
END;

CREATE TRIGGER IF NOT EXISTS tasks_ad AFTER DELETE ON tasks
BEGIN
  DELETE FROM global_search_fts WHERE entity_type = 'task' AND entity_id = OLD.id;
END;

-- Triggers for inbox_captures
CREATE TRIGGER IF NOT EXISTS inbox_captures_ai AFTER INSERT ON inbox_captures
WHEN NEW.is_deleted = 0
BEGIN
  DELETE FROM global_search_fts WHERE entity_type = 'inbox' AND entity_id = NEW.id;
  INSERT INTO global_search_fts(entity_type, entity_id, title, content, tags)
  VALUES('inbox', NEW.id, NEW.raw_content, COALESCE(NEW.raw_content, ''), COALESCE(NEW.source, ''));
END;

CREATE TRIGGER IF NOT EXISTS inbox_captures_au AFTER UPDATE ON inbox_captures
BEGIN
  DELETE FROM global_search_fts WHERE entity_type = 'inbox' AND entity_id = NEW.id;
  INSERT INTO global_search_fts(entity_type, entity_id, title, content, tags)
  SELECT 'inbox', NEW.id, NEW.raw_content, COALESCE(NEW.raw_content, ''), COALESCE(NEW.source, '')
  WHERE NEW.is_deleted = 0;
END;

CREATE TRIGGER IF NOT EXISTS inbox_captures_ad AFTER DELETE ON inbox_captures
BEGIN
  DELETE FROM global_search_fts WHERE entity_type = 'inbox' AND entity_id = OLD.id;
END;

-- Triggers for subjects
CREATE TRIGGER IF NOT EXISTS subjects_ai AFTER INSERT ON subjects
WHEN NEW.is_deleted = 0
BEGIN
  DELETE FROM global_search_fts WHERE entity_type = 'subject' AND entity_id = NEW.id;
  INSERT INTO global_search_fts(entity_type, entity_id, title, content, tags)
  VALUES('subject', NEW.id, NEW.name, COALESCE(NEW.code, '') || ' ' || COALESCE(NEW.instructor, ''), COALESCE(NEW.code, ''));
END;

CREATE TRIGGER IF NOT EXISTS subjects_au AFTER UPDATE ON subjects
BEGIN
  DELETE FROM global_search_fts WHERE entity_type = 'subject' AND entity_id = NEW.id;
  INSERT INTO global_search_fts(entity_type, entity_id, title, content, tags)
  SELECT 'subject', NEW.id, NEW.name, COALESCE(NEW.code, '') || ' ' || COALESCE(NEW.instructor, ''), COALESCE(NEW.code, '')
  WHERE NEW.is_deleted = 0;
END;

CREATE TRIGGER IF NOT EXISTS subjects_ad AFTER DELETE ON subjects
BEGIN
  DELETE FROM global_search_fts WHERE entity_type = 'subject' AND entity_id = OLD.id;
END;

-- Triggers for topics
CREATE TRIGGER IF NOT EXISTS topics_ai AFTER INSERT ON topics
WHEN NEW.is_deleted = 0
BEGIN
  DELETE FROM global_search_fts WHERE entity_type = 'topic' AND entity_id = NEW.id;
  INSERT INTO global_search_fts(entity_type, entity_id, title, content, tags)
  VALUES('topic', NEW.id, NEW.title, COALESCE(NEW.importance_level, ''), COALESCE(NEW.importance_level, ''));
END;

CREATE TRIGGER IF NOT EXISTS topics_au AFTER UPDATE ON topics
BEGIN
  DELETE FROM global_search_fts WHERE entity_type = 'topic' AND entity_id = NEW.id;
  INSERT INTO global_search_fts(entity_type, entity_id, title, content, tags)
  SELECT 'topic', NEW.id, NEW.title, COALESCE(NEW.importance_level, ''), COALESCE(NEW.importance_level, '')
  WHERE NEW.is_deleted = 0;
END;

CREATE TRIGGER IF NOT EXISTS topics_ad AFTER DELETE ON topics
BEGIN
  DELETE FROM global_search_fts WHERE entity_type = 'topic' AND entity_id = OLD.id;
END;

-- Triggers for journals
CREATE TRIGGER IF NOT EXISTS journals_ai AFTER INSERT ON journals
WHEN NEW.is_deleted = 0
BEGIN
  DELETE FROM global_search_fts WHERE entity_type = 'journal' AND entity_id = NEW.id;
  INSERT INTO global_search_fts(entity_type, entity_id, title, content, tags)
  VALUES('journal', NEW.id, COALESCE(NEW.title, NEW.entry_date), COALESCE(NEW.content, ''), COALESCE(NEW.tags, ''));
END;

CREATE TRIGGER IF NOT EXISTS journals_au AFTER UPDATE ON journals
BEGIN
  DELETE FROM global_search_fts WHERE entity_type = 'journal' AND entity_id = NEW.id;
  INSERT INTO global_search_fts(entity_type, entity_id, title, content, tags)
  SELECT 'journal', NEW.id, COALESCE(NEW.title, NEW.entry_date), COALESCE(NEW.content, ''), COALESCE(NEW.tags, '')
  WHERE NEW.is_deleted = 0;
END;

CREATE TRIGGER IF NOT EXISTS journals_ad AFTER DELETE ON journals
BEGIN
  DELETE FROM global_search_fts WHERE entity_type = 'journal' AND entity_id = OLD.id;
END;

-- Triggers for memories (vault)
CREATE TRIGGER IF NOT EXISTS memories_ai AFTER INSERT ON memories
WHEN NEW.is_deleted = 0
BEGIN
  DELETE FROM global_search_fts WHERE entity_type = 'vault' AND entity_id = NEW.id;
  INSERT INTO global_search_fts(entity_type, entity_id, title, content, tags)
  VALUES('vault', NEW.id, NEW.title, COALESCE(NEW.content, ''), COALESCE(NEW.category, ''));
END;

CREATE TRIGGER IF NOT EXISTS memories_au AFTER UPDATE ON memories
BEGIN
  DELETE FROM global_search_fts WHERE entity_type = 'vault' AND entity_id = NEW.id;
  INSERT INTO global_search_fts(entity_type, entity_id, title, content, tags)
  SELECT 'vault', NEW.id, NEW.title, COALESCE(NEW.content, ''), COALESCE(NEW.category, '')
  WHERE NEW.is_deleted = 0;
END;

CREATE TRIGGER IF NOT EXISTS memories_ad AFTER DELETE ON memories
BEGIN
  DELETE FROM global_search_fts WHERE entity_type = 'vault' AND entity_id = OLD.id;
END;
`;

export interface MigrationDef {
  version: number;
  name: string;
  sql: string;
}

export const ALL_MIGRATIONS: MigrationDef[] = [
  { version: 1, name: '001_init_schema_metadata', sql: MIGRATION_001_SQL },
  { version: 2, name: '002_create_core_domain_tables', sql: MIGRATION_002_SQL },
  { version: 3, name: '003_create_system_tables', sql: MIGRATION_003_SQL },
  { version: 4, name: '004_create_performance_indexes', sql: MIGRATION_004_SQL },
  { version: 5, name: '005_create_global_search_fts', sql: MIGRATION_005_SQL },
];

export const ALL_TABLE_NAMES = [
  'schema_metadata',
  'profiles',
  'areas',
  'devices',
  'settings',
  'inbox_captures',
  'notes',
  'visions',
  'goals',
  'projects',
  'tasks',
  'habits',
  'habit_logs',
  'institutions',
  'subjects',
  'books',
  'chapters',
  'sections',
  'topics',
  'schedules',
  'learning_sessions',
  'learning_evidence',
  'mastery_records',
  'focus_sessions',
  'events',
  'journals',
  'memories',
  'files',
  'attachments',
  'reminders',
  'activity_history',
  'change_logs',
  'trash',
];
