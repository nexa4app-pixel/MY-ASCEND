-- 002_create_core_domain_tables.sql
-- Creates core domain tables with universal metadata fields:
-- (id, created_at, updated_at, version, device_id, is_deleted, deleted_at)
-- All dates stored in UTC ISO-8601 strings.

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
    persona_type TEXT NOT NULL DEFAULT 'personal', -- 'personal', 'academic', 'professional'
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
    platform TEXT NOT NULL, -- 'windows', 'macos', 'linux', 'web', 'android', 'ios'
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
    log_date TEXT NOT NULL, -- YYYY-MM-DD
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
