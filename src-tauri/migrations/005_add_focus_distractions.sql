-- Migration 005: Add focus distractions and energy level to focus sessions

ALTER TABLE focus_sessions ADD COLUMN energy_level INTEGER DEFAULT 3;

CREATE TABLE IF NOT EXISTS focus_distractions (
    id TEXT PRIMARY KEY,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    version INTEGER NOT NULL DEFAULT 1,
    device_id TEXT NOT NULL,
    is_deleted INTEGER NOT NULL DEFAULT 0,
    deleted_at TEXT,
    session_id TEXT NOT NULL REFERENCES focus_sessions(id) ON DELETE CASCADE,
    thought TEXT NOT NULL,
    logged_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_focus_distractions_session ON focus_distractions(session_id);
