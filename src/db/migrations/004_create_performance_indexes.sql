-- 004_create_performance_indexes.sql
-- Creates performance indexes for status, dates, foreign keys, and soft-delete filters.

-- Universal metadata & soft-delete indexes
CREATE INDEX IF NOT EXISTS idx_profiles_is_deleted ON profiles(is_deleted);
CREATE INDEX IF NOT EXISTS idx_areas_profile_id ON areas(profile_id, is_deleted);
CREATE INDEX IF NOT EXISTS idx_settings_key ON settings(key);

-- Inbox & Notes
CREATE INDEX IF NOT EXISTS idx_inbox_status ON inbox_captures(status, is_deleted);
CREATE INDEX IF NOT EXISTS idx_notes_profile ON notes(profile_id, is_deleted);
CREATE INDEX IF NOT EXISTS idx_notes_pinned ON notes(is_pinned, is_deleted);

-- Visions, Goals, Projects, Tasks
CREATE INDEX IF NOT EXISTS idx_visions_profile ON visions(profile_id, is_deleted);
CREATE INDEX IF NOT EXISTS idx_goals_vision ON goals(vision_id, is_deleted);
CREATE INDEX IF NOT EXISTS idx_goals_status ON goals(status, is_deleted);
CREATE INDEX IF NOT EXISTS idx_projects_goal ON projects(goal_id, is_deleted);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status, is_deleted);
CREATE INDEX IF NOT EXISTS idx_tasks_project ON tasks(project_id, is_deleted);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status, is_deleted);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date, is_deleted);

-- Habits & Habit Logs
CREATE INDEX IF NOT EXISTS idx_habits_area ON habits(area_id, is_deleted);
CREATE INDEX IF NOT EXISTS idx_habit_logs_habit_date ON habit_logs(habit_id, log_date);

-- Academic Hierarchy
CREATE INDEX IF NOT EXISTS idx_institutions_profile ON institutions(profile_id, is_deleted);
CREATE INDEX IF NOT EXISTS idx_subjects_institution ON subjects(institution_id, is_deleted);
CREATE INDEX IF NOT EXISTS idx_books_subject ON books(subject_id, is_deleted);
CREATE INDEX IF NOT EXISTS idx_chapters_book ON chapters(book_id, is_deleted);
CREATE INDEX IF NOT EXISTS idx_sections_chapter ON sections(chapter_id, is_deleted);
CREATE INDEX IF NOT EXISTS idx_topics_subject ON topics(subject_id, is_deleted);
CREATE INDEX IF NOT EXISTS idx_topics_chapter ON topics(chapter_id, is_deleted);
CREATE INDEX IF NOT EXISTS idx_schedules_profile ON schedules(profile_id, is_deleted);

-- Learning Sessions, Evidence, Mastery
CREATE INDEX IF NOT EXISTS idx_learning_sessions_topic ON learning_sessions(topic_id, is_deleted);
CREATE INDEX IF NOT EXISTS idx_learning_evidence_session ON learning_evidence(learning_session_id);
CREATE INDEX IF NOT EXISTS idx_mastery_records_topic ON mastery_records(topic_id, is_deleted);
CREATE INDEX IF NOT EXISTS idx_mastery_next_review ON mastery_records(next_review_at, is_deleted);

-- Focus Sessions & Events
CREATE INDEX IF NOT EXISTS idx_focus_sessions_task ON focus_sessions(task_id);
CREATE INDEX IF NOT EXISTS idx_focus_sessions_topic ON focus_sessions(topic_id);
CREATE INDEX IF NOT EXISTS idx_focus_sessions_started ON focus_sessions(started_at, is_deleted);
CREATE INDEX IF NOT EXISTS idx_schedules_times ON schedules(start_time, end_time, is_deleted);
CREATE INDEX IF NOT EXISTS idx_events_start_time ON events(profile_id, start_time, is_deleted);

-- Journals, Memories, Files, Reminders
CREATE INDEX IF NOT EXISTS idx_journals_entry_date ON journals(profile_id, entry_date, is_deleted);
CREATE INDEX IF NOT EXISTS idx_memories_profile ON memories(profile_id, is_deleted);
CREATE INDEX IF NOT EXISTS idx_memories_category ON memories(category, is_deleted);
CREATE INDEX IF NOT EXISTS idx_attachments_entity ON attachments(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_reminders_remind_at ON reminders(remind_at, is_fired, is_deleted);

-- System tables indexes
CREATE INDEX IF NOT EXISTS idx_activity_history_time ON activity_history(timestamp);
CREATE INDEX IF NOT EXISTS idx_change_logs_table_record ON change_logs(table_name, record_id);
CREATE INDEX IF NOT EXISTS idx_change_logs_time ON change_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_trash_entity ON trash(entity_type, entity_id);
