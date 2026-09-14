/**
 * Journal Service — MY ASCEND
 * Manages daily reflection entries, upsert by entry_date, mood/energy tracking, and journaling streaks.
 */
import { db } from '../db/client';
import { JournalEntry } from '../types/database';
import { getCurrentUtcIsoString } from '../lib/date/utc';
import { settingsService } from './settingsService';
import { logger } from './logger';

export interface SaveJournalEntryInput {
  entryDate: string; // YYYY-MM-DD
  content: string;
  title?: string | null;
  moodScore?: number | null; // 1 to 5
  energyLevel?: number | null; // 1 to 5
  mood?: string | null;
  tags?: string | null;
  profileId?: string;
}

export interface JournalFilter {
  startDate?: string; // YYYY-MM-DD
  endDate?: string; // YYYY-MM-DD
  search?: string;
  tag?: string;
  limit?: number;
  offset?: number;
}

export interface MoodStats {
  averageMood: number;
  averageEnergy: number;
  totalEntries: number;
  currentStreak: number;
  longestStreak: number;
  moodDistribution: Record<number, number>;
  energyDistribution: Record<number, number>;
}

class JournalService {
  private generateId(prefix: string): string {
    const rand = Math.random().toString(36).substring(2, 8);
    return `${prefix}_${Date.now()}_${rand}`;
  }

  private async ensureDefaultProfile(): Promise<string> {
    const profiles = await db.query<{ id: string }>('SELECT id FROM profiles LIMIT 1');
    if (profiles.length > 0) {
      return profiles[0].id;
    }

    const defaultId = 'profile_default';
    const now = getCurrentUtcIsoString();
    const deviceId = settingsService.getDeviceId();

    await db.execute(
      `INSERT OR IGNORE INTO profiles (
        id, created_at, updated_at, version, device_id, is_deleted, deleted_at,
        name, persona_type, is_active
      ) VALUES (?, ?, ?, 1, ?, 0, NULL, 'Default User', 'personal', 1)`,
      [defaultId, now, now, deviceId]
    );

    return defaultId;
  }

  public async saveJournalEntry(input: SaveJournalEntryInput): Promise<JournalEntry> {
    if (!input.entryDate || !/^\d{4}-\d{2}-\d{2}$/.test(input.entryDate)) {
      throw new Error('فرمت تاریخ ورود نامعتبر است. فرمت معتبر: YYYY-MM-DD');
    }

    const now = getCurrentUtcIsoString();
    const deviceId = settingsService.getDeviceId();
    const profileId = input.profileId || (await this.ensureDefaultProfile());
    const content = input.content || '';
    const title = input.title?.trim() || null;
    const mood = input.mood?.trim() || null;
    const tags = input.tags?.trim() || null;

    let moodScore = input.moodScore;
    if (moodScore !== undefined && moodScore !== null) {
      moodScore = Math.max(1, Math.min(5, Math.round(moodScore)));
    } else {
      moodScore = null;
    }

    let energyLevel = input.energyLevel;
    if (energyLevel !== undefined && energyLevel !== null) {
      energyLevel = Math.max(1, Math.min(5, Math.round(energyLevel)));
    } else {
      energyLevel = null;
    }

    // Check if an entry already exists for this date and profile (Upsert behavior)
    const existing = await db.query<JournalEntry>(
      'SELECT * FROM journals WHERE entry_date = ? AND profile_id = ? AND is_deleted = 0',
      [input.entryDate, profileId]
    );

    if (existing.length > 0) {
      const record = existing[0];
      await db.execute(
        `UPDATE journals SET
          title = ?,
          content = ?,
          mood_score = ?,
          energy_level = ?,
          mood = ?,
          tags = ?,
          updated_at = ?,
          version = version + 1
        WHERE id = ?`,
        [title, content, moodScore, energyLevel, mood, tags, now, record.id]
      );

      logger.info(`Updated journal entry for ${input.entryDate} (id=${record.id})`, 'JournalService');

      return {
        ...record,
        title,
        content,
        mood_score: moodScore,
        energy_level: energyLevel,
        mood,
        tags,
        updated_at: now,
        version: record.version + 1,
      };
    }

    // Insert new daily entry
    const id = this.generateId('journ');
    await db.execute(
      `INSERT INTO journals (
        id, created_at, updated_at, version, device_id, is_deleted, deleted_at,
        profile_id, entry_date, title, content, mood_score, energy_level, mood, tags
      ) VALUES (?, ?, ?, 1, ?, 0, NULL, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        now,
        now,
        deviceId,
        profileId,
        input.entryDate,
        title,
        content,
        moodScore,
        energyLevel,
        mood,
        tags,
      ]
    );

    logger.info(`Created new journal entry for ${input.entryDate} (id=${id})`, 'JournalService');

    const entry: JournalEntry = {
      id,
      created_at: now,
      updated_at: now,
      version: 1,
      device_id: deviceId,
      is_deleted: 0,
      deleted_at: null,
      profile_id: profileId,
      entry_date: input.entryDate,
      title,
      content,
      mood_score: moodScore,
      energy_level: energyLevel,
      mood,
      tags,
    };

    return entry;
  }

  public async getJournalEntryByDate(
    entryDate: string,
    profileId?: string
  ): Promise<JournalEntry | null> {
    const profId = profileId || (await this.ensureDefaultProfile());
    const rows = await db.query<JournalEntry>(
      'SELECT * FROM journals WHERE entry_date = ? AND profile_id = ? AND is_deleted = 0',
      [entryDate, profId]
    );
    return rows.length > 0 ? rows[0] : null;
  }

  public async getJournalEntries(filter?: JournalFilter): Promise<JournalEntry[]> {
    let sql = 'SELECT * FROM journals WHERE is_deleted = 0';
    const params: unknown[] = [];

    if (filter?.startDate) {
      sql += ' AND entry_date >= ?';
      params.push(filter.startDate);
    }
    if (filter?.endDate) {
      sql += ' AND entry_date <= ?';
      params.push(filter.endDate);
    }
    if (filter?.search) {
      sql += ' AND (content LIKE ? OR title LIKE ?)';
      params.push(`%${filter.search}%`, `%${filter.search}%`);
    }
    if (filter?.tag) {
      sql += ' AND tags LIKE ?';
      params.push(`%${filter.tag}%`);
    }

    sql += ' ORDER BY entry_date DESC';

    if (filter?.limit) {
      sql += ` LIMIT ${Math.round(filter.limit)}`;
    }
    if (filter?.offset) {
      sql += ` OFFSET ${Math.round(filter.offset)}`;
    }

    return await db.query<JournalEntry>(sql, params);
  }

  public async getMoodStats(startDate?: string, endDate?: string): Promise<MoodStats> {
    let sql = 'SELECT entry_date, mood_score, energy_level FROM journals WHERE is_deleted = 0';
    const params: unknown[] = [];

    if (startDate) {
      sql += ' AND entry_date >= ?';
      params.push(startDate);
    }
    if (endDate) {
      sql += ' AND entry_date <= ?';
      params.push(endDate);
    }

    sql += ' ORDER BY entry_date ASC';

    const rows = await db.query<{
      entry_date: string;
      mood_score: number | null;
      energy_level: number | null;
    }>(sql, params);

    const totalEntries = rows.length;
    let moodSum = 0;
    let moodCount = 0;
    let energySum = 0;
    let energyCount = 0;

    const moodDistribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    const energyDistribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

    for (const r of rows) {
      if (r.mood_score) {
        const m = Math.round(Number(r.mood_score));
        if (m >= 1 && m <= 5) {
          moodSum += m;
          moodCount++;
          moodDistribution[m] = (moodDistribution[m] || 0) + 1;
        }
      }
      if (r.energy_level) {
        const e = Math.round(Number(r.energy_level));
        if (e >= 1 && e <= 5) {
          energySum += e;
          energyCount++;
          energyDistribution[e] = (energyDistribution[e] || 0) + 1;
        }
      }
    }

    // Streak Calculation
    let currentStreak = 0;
    let longestStreak = 0;
    let tempStreak = 0;

    if (rows.length > 0) {
      const dates = rows.map((r) => r.entry_date).sort();
      const uniqueDates = Array.from(new Set(dates));

      for (let i = 0; i < uniqueDates.length; i++) {
        if (i === 0) {
          tempStreak = 1;
        } else {
          const prev = new Date(uniqueDates[i - 1]).getTime();
          const curr = new Date(uniqueDates[i]).getTime();
          const diffDays = Math.round((curr - prev) / (1000 * 60 * 60 * 24));

          if (diffDays === 1) {
            tempStreak++;
          } else if (diffDays > 1) {
            tempStreak = 1;
          }
        }
        if (tempStreak > longestStreak) {
          longestStreak = tempStreak;
        }
      }

      // Check if current streak extends to today or yesterday
      const today = new Date().toISOString().split('T')[0];
      const yesterdayDate = new Date(Date.now() - 86400000);
      const yesterday = yesterdayDate.toISOString().split('T')[0];
      const lastDate = uniqueDates[uniqueDates.length - 1];

      if (lastDate === today || lastDate === yesterday) {
        currentStreak = tempStreak;
      } else {
        currentStreak = 0;
      }
    }

    return {
      averageMood: moodCount > 0 ? Math.round((moodSum / moodCount) * 10) / 10 : 0,
      averageEnergy: energyCount > 0 ? Math.round((energySum / energyCount) * 10) / 10 : 0,
      totalEntries,
      currentStreak,
      longestStreak,
      moodDistribution,
      energyDistribution,
    };
  }

  public async deleteJournalEntry(id: string): Promise<void> {
    const rows = await db.query<JournalEntry>(
      'SELECT * FROM journals WHERE id = ? AND is_deleted = 0',
      [id]
    );
    if (rows.length === 0) return;

    const existing = rows[0];
    const now = getCurrentUtcIsoString();
    const deviceId = settingsService.getDeviceId();
    const trashId = this.generateId('trash');
    const payload = JSON.stringify(existing);

    await db.execute(
      `UPDATE journals SET
        is_deleted = 1,
        deleted_at = ?,
        updated_at = ?,
        version = version + 1
      WHERE id = ?`,
      [now, now, id]
    );

    await db.execute(
      `INSERT INTO trash (
        id, entity_type, entity_id, deleted_at, device_id, payload, can_restore
      ) VALUES (?, 'journals', ?, ?, ?, ?, 1)`,
      [trashId, id, now, deviceId, payload]
    );

    logger.info(`Soft-deleted journal entry ${id}`, 'JournalService');
  }
}

export const journalService = new JournalService();
