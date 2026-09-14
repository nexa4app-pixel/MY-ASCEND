/**
 * Memory Vault Service — MY ASCEND
 * Manages life achievements (Wins), lessons learned, gratitude moments, insights, and milestones.
 */
import { db } from '../db/client';
import { MemoryVaultItem, MemoryVaultCategory } from '../types/database';
import { getCurrentUtcIsoString } from '../lib/date/utc';
import { settingsService } from './settingsService';
import { logger } from './logger';

export interface CreateVaultItemInput {
  title: string;
  content: string;
  category?: MemoryVaultCategory;
  journalEntryId?: string | null;
  reflectionDate?: string | null;
  mediaUrls?: string | null;
  significanceRating?: number; // 1 to 5
  profileId?: string;
}

export interface UpdateVaultItemInput {
  title?: string;
  content?: string;
  category?: MemoryVaultCategory;
  journalEntryId?: string | null;
  reflectionDate?: string | null;
  mediaUrls?: string | null;
  significanceRating?: number;
}

export interface VaultFilter {
  category?: MemoryVaultCategory;
  journalEntryId?: string;
  search?: string;
  limit?: number;
}

export interface VaultStats {
  totalCount: number;
  winsCount: number;
  gratitudeCount: number;
  lessonsCount: number;
  insightsCount: number;
  milestonesCount: number;
}

class VaultService {
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

  public async createVaultItem(input: CreateVaultItemInput): Promise<MemoryVaultItem> {
    if (!input.title || !input.title.trim()) {
      throw new Error('عنوان تجربه یا خاطره الزامی است.');
    }
    if (!input.content || !input.content.trim()) {
      throw new Error('متن تجربه یا خاطره نمی‌تواند خالی باشد.');
    }

    const id = this.generateId('vault');
    const now = getCurrentUtcIsoString();
    const deviceId = settingsService.getDeviceId();
    const profileId = input.profileId || (await this.ensureDefaultProfile());
    const category: MemoryVaultCategory = input.category || 'win';
    const title = input.title.trim();
    const content = input.content.trim();
    const reflectionDate = input.reflectionDate || now;
    const significance = Math.max(1, Math.min(5, Math.round(input.significanceRating || 3)));

    await db.execute(
      `INSERT INTO memories (
        id, created_at, updated_at, version, device_id, is_deleted, deleted_at,
        profile_id, title, content, category, journal_entry_id, reflection_date,
        media_urls, significance_rating
      ) VALUES (?, ?, ?, 1, ?, 0, NULL, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        now,
        now,
        deviceId,
        profileId,
        title,
        content,
        category,
        input.journalEntryId || null,
        reflectionDate,
        input.mediaUrls || null,
        significance,
      ]
    );

    logger.info(`Created memory vault item ${id} ("${title}", category=${category})`, 'VaultService');

    const item: MemoryVaultItem = {
      id,
      created_at: now,
      updated_at: now,
      version: 1,
      device_id: deviceId,
      is_deleted: 0,
      deleted_at: null,
      profile_id: profileId,
      title,
      content,
      category,
      journal_entry_id: input.journalEntryId || null,
      reflection_date: reflectionDate,
      media_urls: input.mediaUrls || null,
      significance_rating: significance,
    };

    return item;
  }

  public async updateVaultItem(id: string, input: UpdateVaultItemInput): Promise<MemoryVaultItem> {
    const existing = await this.getVaultItemById(id);
    if (!existing) {
      throw new Error(`مورد صندوق خاطرات با شناسه ${id} یافت نشد.`);
    }

    const now = getCurrentUtcIsoString();
    const title = input.title !== undefined ? input.title.trim() : existing.title;
    if (!title) {
      throw new Error('عنوان تجربه یا خاطره الزامی است.');
    }
    const content = input.content !== undefined ? input.content.trim() : existing.content;
    if (!content) {
      throw new Error('متن تجربه یا خاطره نمی‌تواند خالی باشد.');
    }

    const category = input.category !== undefined ? input.category : existing.category;
    const journalEntryId = input.journalEntryId !== undefined ? input.journalEntryId : existing.journal_entry_id;
    const reflectionDate = input.reflectionDate !== undefined ? input.reflectionDate : existing.reflection_date;
    const mediaUrls = input.mediaUrls !== undefined ? input.mediaUrls : existing.media_urls;
    const significance =
      input.significanceRating !== undefined
        ? Math.max(1, Math.min(5, Math.round(input.significanceRating)))
        : existing.significance_rating;

    await db.execute(
      `UPDATE memories SET
        title = ?,
        content = ?,
        category = ?,
        journal_entry_id = ?,
        reflection_date = ?,
        media_urls = ?,
        significance_rating = ?,
        updated_at = ?,
        version = version + 1
      WHERE id = ?`,
      [title, content, category, journalEntryId, reflectionDate, mediaUrls, significance, now, id]
    );

    logger.info(`Updated memory vault item ${id}`, 'VaultService');

    return {
      ...existing,
      title,
      content,
      category,
      journal_entry_id: journalEntryId,
      reflection_date: reflectionDate,
      media_urls: mediaUrls,
      significance_rating: significance,
      updated_at: now,
      version: existing.version + 1,
    };
  }

  public async getVaultItems(filter?: VaultFilter): Promise<MemoryVaultItem[]> {
    let sql = 'SELECT * FROM memories WHERE is_deleted = 0';
    const params: unknown[] = [];

    if (filter?.category) {
      sql += ' AND category = ?';
      params.push(filter.category);
    }
    if (filter?.journalEntryId) {
      sql += ' AND journal_entry_id = ?';
      params.push(filter.journalEntryId);
    }
    if (filter?.search) {
      sql += ' AND (title LIKE ? OR content LIKE ?)';
      params.push(`%${filter.search}%`, `%${filter.search}%`);
    }

    sql += ' ORDER BY created_at DESC';

    if (filter?.limit) {
      sql += ` LIMIT ${Math.round(filter.limit)}`;
    }

    return await db.query<MemoryVaultItem>(sql, params);
  }

  public async getVaultItemById(id: string): Promise<MemoryVaultItem | null> {
    const rows = await db.query<MemoryVaultItem>(
      'SELECT * FROM memories WHERE id = ? AND is_deleted = 0',
      [id]
    );
    return rows.length > 0 ? rows[0] : null;
  }

  public async getVaultStats(): Promise<VaultStats> {
    const rows = await db.query<{ category: MemoryVaultCategory; count: number }>(
      'SELECT category, COUNT(*) as count FROM memories WHERE is_deleted = 0 GROUP BY category'
    );

    let totalCount = 0;
    let winsCount = 0;
    let gratitudeCount = 0;
    let lessonsCount = 0;
    let insightsCount = 0;
    let milestonesCount = 0;

    for (const r of rows) {
      const c = Number(r.count) || 0;
      totalCount += c;
      if (r.category === 'win') winsCount = c;
      else if (r.category === 'gratitude') gratitudeCount = c;
      else if (r.category === 'lesson') lessonsCount = c;
      else if (r.category === 'insight') insightsCount = c;
      else if (r.category === 'milestone') milestonesCount = c;
    }

    return {
      totalCount,
      winsCount,
      gratitudeCount,
      lessonsCount,
      insightsCount,
      milestonesCount,
    };
  }

  public async deleteVaultItem(id: string): Promise<void> {
    const existing = await this.getVaultItemById(id);
    if (!existing) return;

    const now = getCurrentUtcIsoString();
    const deviceId = settingsService.getDeviceId();
    const trashId = this.generateId('trash');
    const payload = JSON.stringify(existing);

    await db.execute(
      `UPDATE memories SET
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
      ) VALUES (?, 'memories', ?, ?, ?, ?, 1)`,
      [trashId, id, now, deviceId, payload]
    );

    logger.info(`Soft-deleted memory vault item ${id}`, 'VaultService');
  }
}

export const vaultService = new VaultService();
