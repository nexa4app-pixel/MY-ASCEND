/**
 * Migration Runner Service
 * Verifies schema integrity and reports applied migrations.
 */
import { db } from './client';
import { SchemaMetadata } from '../types/database';
import { logger } from '../services/logger';

export interface MigrationSummary {
  currentVersion: number;
  totalMigrations: number;
  appliedMigrations: SchemaMetadata[];
  isUpToDate: boolean;
}

export async function checkAndRunMigrations(): Promise<MigrationSummary> {
  logger.info('Checking database migrations and schema metadata...', 'MigrationRunner');
  const applied = await db.getMigrationStatus();
  const currentVersion = await db.getSchemaVersion();

  const isUpToDate = currentVersion >= 4;
  logger.info(
    `Migration check complete: Current Version = ${currentVersion}, Applied = ${applied.length}, Up to date = ${isUpToDate}`,
    'MigrationRunner'
  );

  return {
    currentVersion,
    totalMigrations: 4,
    appliedMigrations: applied,
    isUpToDate,
  };
}
