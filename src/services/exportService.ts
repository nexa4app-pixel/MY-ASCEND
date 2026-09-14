import { db } from '../db/client';
import { ALL_TABLE_NAMES } from '../db/schema';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { analyticsService } from './analyticsService';
import { searchService } from './searchService';
import { logger } from './logger';

export interface DatabaseBackupSnapshot {
  export_date: string;
  app_version: string;
  schema_version: number;
  [table_name: string]: any;
}

/**
 * Generate a complete JSON snapshot object of active user data.
 */
export async function exportFullDatabaseSnapshot(): Promise<DatabaseBackupSnapshot> {
  const exportDate = new Date().toISOString();
  const appVersion = '0.1.0';
  const schemaVer = await db.getSchemaVersion();

  const snapshot: DatabaseBackupSnapshot = {
    export_date: exportDate,
    app_version: appVersion,
    schema_version: schemaVer,
  };

  for (const t of ALL_TABLE_NAMES) {
    if (t === 'schema_metadata') continue;
    try {
      // Check if table has is_deleted column
      const cols = await db.query<{ name: string }>(`PRAGMA table_info(${t})`);
      const hasIsDeleted = cols.some((c) => c.name === 'is_deleted');

      const sql = hasIsDeleted ? `SELECT * FROM ${t} WHERE is_deleted = 0` : `SELECT * FROM ${t}`;
      const rows = await db.query<any>(sql);
      snapshot[t] = rows;
    } catch {
      snapshot[t] = [];
    }
  }

  return snapshot;
}

/**
 * Export the full database as a JSON snapshot Blob.
 * Includes metadata: export_date, app_version, schema_version.
 */
export async function exportFullDatabaseJSON(): Promise<Blob> {
  const snapshot = await exportFullDatabaseSnapshot();
  const jsonStr = JSON.stringify(snapshot, null, 2);
  return new Blob([jsonStr], { type: 'application/json' });
}

/**
 * Import a JSON snapshot into the database.
 * Performs strict validation and runs inside a database transaction.
 */
export async function importDatabaseJSON(jsonInput: string | object): Promise<void> {
  let payload: any;

  if (typeof jsonInput === 'string') {
    try {
      payload = JSON.parse(jsonInput);
    } catch (e) {
      throw new Error('Invalid JSON format');
    }
  } else if (typeof jsonInput === 'object' && jsonInput !== null) {
    payload = jsonInput;
  } else {
    throw new Error('Invalid JSON format');
  }

  // Validate required metadata fields
  if (!payload || typeof payload !== 'object') {
    throw new Error('Invalid or corrupted JSON payload');
  }

  if (!payload.export_date || !payload.app_version || payload.schema_version === undefined || payload.schema_version === null) {
    throw new Error('Missing required metadata fields');
  }

  logger.info(`Starting database JSON import (Schema v${payload.schema_version}, Exported: ${payload.export_date})...`, 'ExportService');

  await db.execute('BEGIN');
  try {
    const metadataKeys = new Set(['export_date', 'app_version', 'schema_version']);
    const tables = Object.keys(payload).filter((k) => !metadataKeys.has(k) && Array.isArray(payload[k]));

    for (const tbl of tables) {
      // Security check: validate table name against standard SQL identifier format
      if (!/^[a-zA-Z0-9_]+$/.test(tbl)) {
        continue;
      }

      await db.execute(`DELETE FROM ${tbl}`);

      const rows = payload[tbl];
      for (const row of rows) {
        if (!row || typeof row !== 'object') continue;
        const columns = Object.keys(row);
        if (columns.length === 0) continue;

        const placeholders = columns.map(() => '?').join(',');
        const values = columns.map((col) => row[col]);
        const sql = `INSERT INTO ${tbl} (${columns.join(',')}) VALUES (${placeholders})`;
        await db.execute(sql, values);
      }
    }

    await db.execute('COMMIT');
    logger.info('Database JSON import transaction committed successfully.', 'ExportService');
  } catch (e) {
    await db.execute('ROLLBACK');
    logger.error(`Database JSON import failed, transaction rolled back: ${e}`, 'ExportService');
    throw e;
  }

  // Rebuild global FTS5 search index after database restoration
  try {
    await searchService.rebuildSearchIndex();
  } catch (e) {
    logger.warn(`Failed to rebuild FTS index after restore: ${e}`, 'ExportService');
  }
}

/**
 * Generate a styled, printable/downloadable PDF growth report.
 */
export async function generateGrowthReportPDF(timeRange: 'weekly' | 'monthly'): Promise<Blob> {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595.28, 841.89]); // A4 size
  const { width, height } = page.getSize();

  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const analyticsRange = timeRange === 'weekly' ? 'week' : 'month';
  const ags = await analyticsService.getAscendGrowthScore(analyticsRange);
  const summary = await analyticsService.getSystemSummaryStats();

  const titleText = 'MY ASCEND — Growth & Performance Report';
  const periodLabel = timeRange === 'weekly' ? 'Weekly Summary (7 Days)' : 'Monthly Summary (30 Days)';
  const dateText = `Report Date: ${new Date().toISOString().split('T')[0]}`;

  let y = height - 50;

  // Header Banner Box
  page.drawRectangle({
    x: 40,
    y: y - 45,
    width: width - 80,
    height: 60,
    color: rgb(0, 0.47, 0.83), // Microsoft Fluent Blue
  });

  page.drawText(titleText, {
    x: 55,
    y: y - 18,
    size: 18,
    font: fontBold,
    color: rgb(1, 1, 1),
  });

  page.drawText(`Period: ${periodLabel}`, {
    x: 55,
    y: y - 36,
    size: 11,
    font,
    color: rgb(0.9, 0.95, 1),
  });

  y -= 75;

  // 1. Growth Index Section
  page.drawText('1. Ascend Growth Score (AGS)', { x: 50, y, size: 14, font: fontBold, color: rgb(0.1, 0.1, 0.1) });
  y -= 25;

  const scoreText = `Overall AGS Score: ${ags.totalScore} / 100  [Tier: ${ags.tier.toUpperCase()}]`;
  page.drawText(scoreText, { x: 65, y, size: 12, font: fontBold, color: rgb(0, 0.47, 0.83) });
  y -= 20;

  const prodScore = ags.subScores?.productivity?.score ?? 0;
  const learnScore = ags.subScores?.learning?.score ?? 0;
  const wellScore = ags.subScores?.wellBeing?.score ?? 0;

  page.drawText(`- Productivity Component: ${prodScore} / 100`, { x: 75, y, size: 11, font, color: rgb(0.2, 0.2, 0.2) });
  y -= 16;
  page.drawText(`- Learning & Mastery Component: ${learnScore} / 100`, { x: 75, y, size: 11, font, color: rgb(0.2, 0.2, 0.2) });
  y -= 16;
  page.drawText(`- Well-Being & Reflection Component: ${wellScore} / 100`, { x: 75, y, size: 11, font, color: rgb(0.2, 0.2, 0.2) });
  y -= 30;

  // 2. Summary Statistics
  page.drawText('2. Domain Performance & Milestones', { x: 50, y, size: 14, font: fontBold, color: rgb(0.1, 0.1, 0.1) });
  y -= 25;

  page.drawText(`- Task Accomplishment: ${summary.completedTasks} completed out of ${summary.totalTasks} total active tasks`, { x: 75, y, size: 11, font, color: rgb(0.2, 0.2, 0.2) });
  y -= 16;
  page.drawText(`- Deep Focus Session Duration: ${summary.totalFocusMinutes} total minutes logged`, { x: 75, y, size: 11, font, color: rgb(0.2, 0.2, 0.2) });
  y -= 16;
  page.drawText(`- Academic Progress: ${summary.masteredTopicsCount} mastered topics out of ${summary.totalTopicsCount} active topics`, { x: 75, y, size: 11, font, color: rgb(0.2, 0.2, 0.2) });
  y -= 16;
  page.drawText(`- Reflection & Memory Vault: ${summary.totalJournalEntries} journal reflections, ${summary.totalMemoriesCount} saved memories`, { x: 75, y, size: 11, font, color: rgb(0.2, 0.2, 0.2) });
  y -= 35;

  // 3. System Recommendations
  page.drawText('3. Intelligent Recommendations', { x: 50, y, size: 14, font: fontBold, color: rgb(0.1, 0.1, 0.1) });
  y -= 22;

  page.drawText('* Maintain a balanced routine across deep focus, active study, and daily journaling.', { x: 65, y, size: 10, font, color: rgb(0.3, 0.3, 0.3) });
  y -= 18;

  // Footer
  page.drawText(`${dateText} | Generated by MY ASCEND System Services`, {
    x: 50,
    y: 35,
    size: 9,
    font,
    color: rgb(0.5, 0.5, 0.5),
  });

  const pdfBytes = await pdfDoc.save();
  return new Blob([pdfBytes.buffer as ArrayBuffer], { type: 'application/pdf' });
}
