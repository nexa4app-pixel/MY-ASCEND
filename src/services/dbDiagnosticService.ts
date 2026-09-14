/**
 * Database Diagnostic Service
 * Provides telemetry, connection health, table statistics, and integrity verification.
 */
import { db } from '../db/client';
import { DbPingResponse, SchemaMetadata, TableCountInfo } from '../types/database';
import { logger } from './logger';

export interface DiagnosticReport {
  ping: DbPingResponse;
  schemaVersion: number;
  appliedMigrations: SchemaMetadata[];
  tableCounts: TableCountInfo[];
  totalRecords: number;
  timestamp: string;
}

export class DbDiagnosticService {
  public async ping(): Promise<DbPingResponse> {
    try {
      const res = await db.ping();
      logger.info(`DB Ping success: ${res.sqlite_version} in ${res.latency_ms}ms`, 'DiagnosticService');
      return res;
    } catch (err) {
      logger.error('DB Ping failed', 'DiagnosticService', err);
      return {
        status: 'unhealthy',
        sqlite_version: 'Unknown',
        latency_ms: -1,
        database_path: 'unavailable',
      };
    }
  }

  public async getFullReport(): Promise<DiagnosticReport> {
    const ping = await this.ping();
    const schemaVersion = await db.getSchemaVersion();
    const appliedMigrations = await db.getMigrationStatus();
    const tableCounts = await db.getTableCounts();

    const totalRecords = tableCounts.reduce((acc, curr) => acc + curr.count, 0);

    return {
      ping,
      schemaVersion,
      appliedMigrations,
      tableCounts,
      totalRecords,
      timestamp: new Date().toISOString(),
    };
  }
}

export const dbDiagnosticService = new DbDiagnosticService();
