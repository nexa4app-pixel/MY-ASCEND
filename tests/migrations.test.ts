import { describe, it, expect, beforeAll } from 'vitest';
import initSqlJs, { Database } from 'sql.js';
import { ALL_MIGRATIONS, ALL_TABLE_NAMES } from '../src/db/schema';
import { getCurrentUtcIsoString } from '../src/lib/date/utc';

function safeRunMigration(db: Database, sql: string) {
  try {
    db.run(sql);
  } catch (err: any) {
    if (sql.includes('fts5') && String(err).includes('no such module: fts5')) {
      const fallbackSql = sql.replace(
        /CREATE VIRTUAL TABLE IF NOT EXISTS global_search_fts USING fts5\([\s\S]*?\);/,
        `CREATE TABLE IF NOT EXISTS global_search_fts (
          entity_type TEXT,
          entity_id TEXT,
          title TEXT,
          content TEXT,
          tags TEXT
        );`
      );
      db.run(fallbackSql);
    } else {
      throw err;
    }
  }
}

describe('SQLite Migration Engine & Schema Verification', () => {
  let SQL: Awaited<ReturnType<typeof initSqlJs>>;
  let db: Database;

  beforeAll(async () => {
    SQL = await initSqlJs();
    db = new SQL.Database();
  });

  it('should execute migrations 001 through 005 sequentially', () => {
    for (const m of ALL_MIGRATIONS) {
      safeRunMigration(db, m.sql);
      const appliedAt = getCurrentUtcIsoString();
      db.run(
        'INSERT INTO schema_metadata (version, name, applied_at, checksum, execution_time_ms) VALUES (?, ?, ?, ?, ?)',
        [m.version, m.name, appliedAt, `checksum_${m.version}`, 5]
      );
    }

    // Check version
    const res = db.exec('SELECT MAX(version) FROM schema_metadata');
    expect(Number(res[0].values[0][0])).toBe(ALL_MIGRATIONS.length);
  });

  it('should verify that all tables exist in SQLite master', () => {
    const res = db.exec("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'");
    const tablesInDb = res[0].values.map((v) => String(v[0]));

    for (const table of ALL_TABLE_NAMES) {
      expect(tablesInDb).toContain(table);
    }
  });

  it('should verify universal metadata fields on domain tables', () => {
    const domainTablesToCheck = ['profiles', 'areas', 'devices', 'settings', 'notes', 'tasks', 'habits', 'journals'];
    const universalCols = ['id', 'created_at', 'updated_at', 'version', 'device_id', 'is_deleted', 'deleted_at'];

    for (const table of domainTablesToCheck) {
      const tableInfo = db.exec(`PRAGMA table_info(${table})`);
      const colNames = tableInfo[0].values.map((v) => String(v[1]));
      for (const col of universalCols) {
        expect(colNames).toContain(col);
      }
    }
  });

  it('should be idempotent: re-executing migrations does not fail or duplicate', () => {
    // Run CREATE TABLE IF NOT EXISTS statements again
    for (const m of ALL_MIGRATIONS) {
      expect(() => safeRunMigration(db, m.sql)).not.toThrow();
    }

    // Verify row count in schema_metadata is still ALL_MIGRATIONS.length
    const res = db.exec('SELECT COUNT(*) FROM schema_metadata');
    expect(Number(res[0].values[0][0])).toBe(ALL_MIGRATIONS.length);
  });

  it('should support insert and read operations with UTC timestamps on settings table', () => {
    const now = getCurrentUtcIsoString();
    db.run(
      `INSERT INTO settings (id, created_at, updated_at, version, device_id, is_deleted, deleted_at, key, value, category)
       VALUES (?, ?, ?, 1, ?, 0, NULL, ?, ?, 'general')`,
      ['set_1', now, now, 'dev_test', 'test_key', 'test_val']
    );

    const stmt = db.prepare('SELECT key, value, device_id FROM settings WHERE key = :key');
    stmt.bind({ ':key': 'test_key' });
    expect(stmt.step()).toBe(true);
    const row = stmt.getAsObject();
    stmt.free();

    expect(row.key).toBe('test_key');
    expect(row.value).toBe('test_val');
    expect(row.device_id).toBe('dev_test');
  });
});
