/**
 * Universal Database Client & Tauri IPC Bridge
 * Seamlessly interfaces with Tauri v2 commands if inside desktop runtime,
 * or utilizes an in-memory SQLite engine (sql.js) during browser/test execution.
 */
import { invoke } from '@tauri-apps/api/core';
import initSqlJs, { Database as SqlJsDatabase } from 'sql.js';
import { SchemaMetadata, TableCountInfo, DbPingResponse } from '../types/database';
import { ALL_MIGRATIONS, ALL_TABLE_NAMES } from './schema';
import { getCurrentUtcIsoString } from '../lib/date/utc';
import { logger } from '../services/logger';

export interface DatabaseClient {
  ping(): Promise<DbPingResponse>;
  getSchemaVersion(): Promise<number>;
  getMigrationStatus(): Promise<SchemaMetadata[]>;
  getTableCounts(): Promise<TableCountInfo[]>;
  getSetting(key: string): Promise<string | null>;
  setSetting(id: string, key: string, value: string, deviceId: string): Promise<void>;
  execute(sql: string, params?: unknown[]): Promise<void>;
  query<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<T[]>;
}

// Detection for Tauri runtime
export function isTauriEnvironment(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}

class InProcessDatabaseClient implements DatabaseClient {
  private db: SqlJsDatabase | null = null;
  private initPromise: Promise<SqlJsDatabase> | null = null;

  private async getDb(): Promise<SqlJsDatabase> {
    if (this.db) return this.db;
    if (this.initPromise) return this.initPromise;

    this.initPromise = (async () => {
      logger.info('Initializing in-memory SQLite engine (sql.js)...', 'Database');
      const isNode = typeof process !== 'undefined' && process.versions?.node !== undefined;
      const SQL = await initSqlJs(
        isNode
          ? {}
          : {
              locateFile: (file) => `https://sql.js.org/dist/${file}`,
            }
      );
      const db = new SQL.Database();
      this.db = db;

      // Run migrations automatically
      await this.runInitialMigrations(db);
      return db;
    })();

    return this.initPromise;
  }

  private async runInitialMigrations(db: SqlJsDatabase) {
    logger.info('Executing initial migrations on in-memory SQLite...', 'Database');
    // 001 init schema metadata
    db.run(ALL_MIGRATIONS[0].sql);

    for (const m of ALL_MIGRATIONS) {
      const checkStmt = db.prepare('SELECT version FROM schema_metadata WHERE version = :ver');
      checkStmt.bind({ ':ver': m.version });
      const hasApplied = checkStmt.step();
      checkStmt.free();

      if (!hasApplied) {
        const start = performance.now();
        try {
          db.run(m.sql);
        } catch (err: any) {
          if (m.sql.includes('fts5') && String(err).includes('no such module: fts5')) {
            const fallbackSql = m.sql.replace(
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
        const elapsed = Math.round(performance.now() - start);
        const appliedAt = getCurrentUtcIsoString();

        db.run(
          'INSERT INTO schema_metadata (version, name, applied_at, checksum, execution_time_ms) VALUES (?, ?, ?, ?, ?)',
          [m.version, m.name, appliedAt, `checksum_${m.version}`, elapsed]
        );
        logger.info(`Applied migration ${m.version}: ${m.name} (${elapsed}ms)`, 'Database');
      }
    }

    // Defensive check: Ensure Phase 04 columns exist on existing databases
    try {
      const bookCols = db.exec('PRAGMA table_info(books)');
      if (bookCols.length > 0) {
        const colNames = bookCols[0].values.map((v) => String(v[1]));
        if (!colNames.includes('read_pages')) {
          db.run('ALTER TABLE books ADD COLUMN read_pages INTEGER DEFAULT 0');
        }
        if (!colNames.includes('link')) {
          db.run('ALTER TABLE books ADD COLUMN link TEXT');
        }
      }
    } catch {
      // Table may not exist yet or column already present
    }

    try {
      const topicCols = db.exec('PRAGMA table_info(topics)');
      if (topicCols.length > 0) {
        const colNames = topicCols[0].values.map((v) => String(v[1]));
        if (!colNames.includes('chapter_id')) {
          db.run('ALTER TABLE topics ADD COLUMN chapter_id TEXT REFERENCES chapters(id) ON DELETE CASCADE');
        }
        if (!colNames.includes('is_completed')) {
          db.run('ALTER TABLE topics ADD COLUMN is_completed INTEGER NOT NULL DEFAULT 0');
        }
      }
    } catch {
      // Table may not exist yet or column already present
    }

    try {
      const sessionCols = db.exec('PRAGMA table_info(learning_sessions)');
      if (sessionCols.length > 0) {
        const colNames = sessionCols[0].values.map((v) => String(v[1]));
        if (!colNames.includes('activity_type')) {
          db.run("ALTER TABLE learning_sessions ADD COLUMN activity_type TEXT NOT NULL DEFAULT 'study'");
        }
        if (!colNames.includes('comprehension_rating')) {
          db.run('ALTER TABLE learning_sessions ADD COLUMN comprehension_rating INTEGER');
        }
      }
    } catch {
      // Ignore
    }

    try {
      const masteryCols = db.exec('PRAGMA table_info(mastery_records)');
      if (masteryCols.length > 0) {
        const colNames = masteryCols[0].values.map((v) => String(v[1]));
        if (!colNames.includes('tier')) {
          db.run("ALTER TABLE mastery_records ADD COLUMN tier TEXT NOT NULL DEFAULT 'unstudied'");
        }
        if (!colNames.includes('repetitions')) {
          db.run('ALTER TABLE mastery_records ADD COLUMN repetitions INTEGER NOT NULL DEFAULT 0');
        }
        if (!colNames.includes('ease_factor')) {
          db.run('ALTER TABLE mastery_records ADD COLUMN ease_factor REAL NOT NULL DEFAULT 2.5');
        }
        if (!colNames.includes('interval_days')) {
          db.run('ALTER TABLE mastery_records ADD COLUMN interval_days INTEGER NOT NULL DEFAULT 0');
        }
        if (!colNames.includes('next_review_at')) {
          db.run('ALTER TABLE mastery_records ADD COLUMN next_review_at TEXT');
        }
      }
    } catch {
      // Ignore
    }

    try {
      const focusCols = db.exec('PRAGMA table_info(focus_sessions)');
      if (focusCols.length > 0) {
        const colNames = focusCols[0].values.map((v) => String(v[1]));
        if (!colNames.includes('topic_id')) {
          db.run('ALTER TABLE focus_sessions ADD COLUMN topic_id TEXT REFERENCES topics(id) ON DELETE SET NULL');
        }
        if (!colNames.includes('subject_id')) {
          db.run('ALTER TABLE focus_sessions ADD COLUMN subject_id TEXT REFERENCES subjects(id) ON DELETE SET NULL');
        }
        if (!colNames.includes('session_type')) {
          db.run("ALTER TABLE focus_sessions ADD COLUMN session_type TEXT NOT NULL DEFAULT 'pomodoro'");
        }
        if (!colNames.includes('planned_duration_minutes')) {
          db.run('ALTER TABLE focus_sessions ADD COLUMN planned_duration_minutes INTEGER NOT NULL DEFAULT 25');
        }
        if (!colNames.includes('actual_duration_minutes')) {
          db.run('ALTER TABLE focus_sessions ADD COLUMN actual_duration_minutes INTEGER NOT NULL DEFAULT 0');
        }
        if (!colNames.includes('interruption_count')) {
          db.run('ALTER TABLE focus_sessions ADD COLUMN interruption_count INTEGER NOT NULL DEFAULT 0');
        }
        if (!colNames.includes('completed_status')) {
          db.run("ALTER TABLE focus_sessions ADD COLUMN completed_status TEXT NOT NULL DEFAULT 'completed'");
        }
        if (!colNames.includes('notes')) {
          db.run('ALTER TABLE focus_sessions ADD COLUMN notes TEXT');
        }
      }
    } catch {
      // Ignore
    }

    try {
      const schedCols = db.exec('PRAGMA table_info(schedules)');
      if (schedCols.length > 0) {
        const colNames = schedCols[0].values.map((v) => String(v[1]));
        if (!colNames.includes('title')) {
          db.run("ALTER TABLE schedules ADD COLUMN title TEXT NOT NULL DEFAULT 'جلسه'");
        }
        if (!colNames.includes('entity_type')) {
          db.run("ALTER TABLE schedules ADD COLUMN entity_type TEXT NOT NULL DEFAULT 'general'");
        }
        if (!colNames.includes('entity_id')) {
          db.run('ALTER TABLE schedules ADD COLUMN entity_id TEXT');
        }
        if (!colNames.includes('is_all_day')) {
          db.run('ALTER TABLE schedules ADD COLUMN is_all_day INTEGER NOT NULL DEFAULT 0');
        }
        if (!colNames.includes('color_tag')) {
          db.run('ALTER TABLE schedules ADD COLUMN color_tag TEXT');
        }
        if (!colNames.includes('status')) {
          db.run("ALTER TABLE schedules ADD COLUMN status TEXT NOT NULL DEFAULT 'planned'");
        }
      }
    } catch {
      // Ignore
    }

    try {
      const journalCols = db.exec('PRAGMA table_info(journals)');
      if (journalCols.length > 0) {
        const colNames = journalCols[0].values.map((v) => String(v[1]));
        if (!colNames.includes('mood_score')) {
          db.run('ALTER TABLE journals ADD COLUMN mood_score INTEGER');
        }
        if (!colNames.includes('energy_level')) {
          db.run('ALTER TABLE journals ADD COLUMN energy_level INTEGER');
        }
      }
    } catch {
      // Ignore
    }

    try {
      const memCols = db.exec('PRAGMA table_info(memories)');
      if (memCols.length > 0) {
        const colNames = memCols[0].values.map((v) => String(v[1]));
        if (!colNames.includes('content')) {
          db.run("ALTER TABLE memories ADD COLUMN content TEXT NOT NULL DEFAULT ''");
        }
        if (!colNames.includes('category')) {
          db.run("ALTER TABLE memories ADD COLUMN category TEXT NOT NULL DEFAULT 'win'");
        }
        if (!colNames.includes('journal_entry_id')) {
          db.run('ALTER TABLE memories ADD COLUMN journal_entry_id TEXT REFERENCES journals(id) ON DELETE SET NULL');
        }
        if (!colNames.includes('reflection_date')) {
          db.run('ALTER TABLE memories ADD COLUMN reflection_date TEXT');
        }
        if (!colNames.includes('media_urls')) {
          db.run('ALTER TABLE memories ADD COLUMN media_urls TEXT');
        }
      }
    } catch {
      // Ignore
    }
  }

  async ping(): Promise<DbPingResponse> {
    const start = performance.now();
    const db = await this.getDb();
    const res = db.exec('SELECT sqlite_version()');
    const version = res.length > 0 && res[0].values.length > 0 ? String(res[0].values[0][0]) : '3.x';
    const latency = performance.now() - start;

    return {
      status: 'healthy',
      sqlite_version: version,
      latency_ms: Math.round(latency * 100) / 100,
      database_path: 'in-memory (WebAssembly SQLite)',
    };
  }

  async getSchemaVersion(): Promise<number> {
    const db = await this.getDb();
    const res = db.exec('SELECT COALESCE(MAX(version), 0) FROM schema_metadata');
    if (res.length > 0 && res[0].values.length > 0) {
      return Number(res[0].values[0][0]);
    }
    return 0;
  }

  async getMigrationStatus(): Promise<SchemaMetadata[]> {
    const db = await this.getDb();
    const res = db.exec('SELECT version, name, applied_at, checksum, execution_time_ms FROM schema_metadata ORDER BY version ASC');
    if (!res.length) return [];

    const columns = res[0].columns;
    return res[0].values.map((row) => {
      const obj: Record<string, unknown> = {};
      columns.forEach((col, idx) => {
        obj[col] = row[idx];
      });
      return {
        version: Number(obj.version),
        name: String(obj.name),
        applied_at: String(obj.applied_at),
        checksum: String(obj.checksum),
        execution_time_ms: Number(obj.execution_time_ms),
      };
    });
  }

  async getTableCounts(): Promise<TableCountInfo[]> {
    const db = await this.getDb();
    const results: TableCountInfo[] = [];

    for (const table of ALL_TABLE_NAMES) {
      try {
        const res = db.exec(`SELECT COUNT(*) FROM ${table}`);
        const count = res.length > 0 && res[0].values.length > 0 ? Number(res[0].values[0][0]) : 0;
        results.push({ table_name: table, count });
      } catch {
        results.push({ table_name: table, count: 0 });
      }
    }

    return results;
  }

  async getSetting(key: string): Promise<string | null> {
    const db = await this.getDb();
    const stmt = db.prepare('SELECT value FROM settings WHERE key = :key AND is_deleted = 0');
    stmt.bind({ ':key': key });
    if (stmt.step()) {
      const row = stmt.getAsObject();
      stmt.free();
      return String(row.value);
    }
    stmt.free();
    return null;
  }

  async setSetting(id: string, key: string, value: string, deviceId: string): Promise<void> {
    const db = await this.getDb();
    const now = getCurrentUtcIsoString();

    const existing = await this.getSetting(key);
    if (existing !== null) {
      db.run(
        `UPDATE settings SET value = ?, updated_at = ?, device_id = ?, version = version + 1 WHERE key = ?`,
        [value, now, deviceId, key]
      );
    } else {
      db.run(
        `INSERT INTO settings (id, created_at, updated_at, version, device_id, is_deleted, deleted_at, key, value, category)
         VALUES (?, ?, ?, 1, ?, 0, NULL, ?, ?, 'general')`,
        [id, now, now, deviceId, key, value]
      );
    }
  }

  async execute(sql: string, params?: unknown[]): Promise<void> {
    const db = await this.getDb();
    db.run(sql, params as (string | number | null)[]);
  }

  async query<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<T[]> {
    const db = await this.getDb();
    const stmt = db.prepare(sql);
    if (params) {
      stmt.bind(params as (string | number | null)[]);
    }

    const items: T[] = [];
    while (stmt.step()) {
      items.push(stmt.getAsObject() as unknown as T);
    }
    stmt.free();
    return items;
  }
}

class TauriDatabaseClient implements DatabaseClient {
  async ping(): Promise<DbPingResponse> {
    return await invoke<DbPingResponse>('db_ping');
  }

  async getSchemaVersion(): Promise<number> {
    return await invoke<number>('db_get_schema_version');
  }

  async getMigrationStatus(): Promise<SchemaMetadata[]> {
    return await invoke<SchemaMetadata[]>('db_get_migration_status');
  }

  async getTableCounts(): Promise<TableCountInfo[]> {
    return await invoke<TableCountInfo[]>('db_get_table_counts');
  }

  async getSetting(key: string): Promise<string | null> {
    return await invoke<string | null>('db_get_setting', { key });
  }

  async setSetting(id: string, key: string, value: string, deviceId: string): Promise<void> {
    const now = getCurrentUtcIsoString();
    await invoke('db_set_setting', {
      id,
      key,
      value,
      deviceId,
      createdAt: now,
      updatedAt: now,
    });
  }

  async execute(sql: string, params: unknown[] = []): Promise<void> {
    await invoke('db_execute', { sql, params });
  }

  async query<T = Record<string, unknown>>(sql: string, params: unknown[] = []): Promise<T[]> {
    return await invoke<T[]>('db_query', { sql, params });
  }
}

// Singleton factory
class UniversalDatabaseManager {
  private client: DatabaseClient | null = null;

  public getClient(): DatabaseClient {
    if (!this.client) {
      if (isTauriEnvironment()) {
        logger.info('Tauri environment detected: using native Rust SQLite bridge.', 'Database');
        this.client = new TauriDatabaseClient();
      } else {
        logger.info('Browser/Test environment: using in-memory WebAssembly SQLite.', 'Database');
        this.client = new InProcessDatabaseClient();
      }
    }
    return this.client;
  }
}

export const dbManager = new UniversalDatabaseManager();
export const db = dbManager.getClient();
