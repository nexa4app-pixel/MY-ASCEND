-- 001_init_schema_metadata.sql
-- Migration 001: Initialize schema_metadata table to track schema migrations

CREATE TABLE IF NOT EXISTS schema_metadata (
    version INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    applied_at TEXT NOT NULL, -- UTC ISO-8601 (e.g. 2026-09-07T16:11:14.000Z)
    checksum TEXT NOT NULL,
    execution_time_ms INTEGER NOT NULL
);
