-- 003_create_system_tables.sql
-- Creates system tables: activity_history, change_logs, trash

-- 1. Activity History
CREATE TABLE IF NOT EXISTS activity_history (
    id TEXT PRIMARY KEY,
    timestamp TEXT NOT NULL, -- UTC ISO-8601
    device_id TEXT NOT NULL,
    activity_type TEXT NOT NULL,
    description TEXT NOT NULL,
    metadata TEXT -- JSON encoded additional details
);

-- 2. Change Logs (For offline sync and audit trails)
CREATE TABLE IF NOT EXISTS change_logs (
    id TEXT PRIMARY KEY,
    table_name TEXT NOT NULL,
    record_id TEXT NOT NULL,
    operation TEXT NOT NULL, -- 'INSERT', 'UPDATE', 'DELETE'
    timestamp TEXT NOT NULL, -- UTC ISO-8601
    device_id TEXT NOT NULL,
    version INTEGER NOT NULL,
    payload TEXT -- JSON snapshot/diff
);

-- 3. Trash (Soft-delete & recovery registry)
CREATE TABLE IF NOT EXISTS trash (
    id TEXT PRIMARY KEY,
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    deleted_at TEXT NOT NULL, -- UTC ISO-8601
    device_id TEXT NOT NULL,
    payload TEXT NOT NULL, -- JSON snapshot of deleted item
    can_restore INTEGER NOT NULL DEFAULT 1
);
