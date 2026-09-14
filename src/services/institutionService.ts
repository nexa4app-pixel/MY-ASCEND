/**
 * Academic Institution Service
 * Handles CRUD and soft-delete for educational institutions (universities, institutes, schools, self-study).
 */
import { db } from '../db/client';
import { Institution, InstitutionType } from '../types/database';
import { getCurrentUtcIsoString } from '../lib/date/utc';
import { settingsService } from './settingsService';
import { logger } from './logger';

export interface CreateInstitutionInput {
  name: string;
  type?: InstitutionType;
  degreeOrProgram?: string | null;
  currentTerm?: string | null;
  profileId?: string | null;
}

export interface UpdateInstitutionInput {
  name?: string;
  type?: InstitutionType;
  degreeOrProgram?: string | null;
  currentTerm?: string | null;
}

class InstitutionService {
  private generateId(prefix: string): string {
    const rand = Math.random().toString(36).substring(2, 8);
    return `${prefix}_${Date.now()}_${rand}`;
  }

  /**
   * Ensures a default user profile exists so that foreign key constraints are satisfied.
   */
  public async ensureDefaultProfile(): Promise<string> {
    const rows = await db.query<{ id: string }>('SELECT id FROM profiles WHERE is_deleted = 0 LIMIT 1');
    if (rows.length > 0) {
      return rows[0].id;
    }

    const defaultProfileId = 'profile_default';
    const now = getCurrentUtcIsoString();
    const deviceId = settingsService.getDeviceId();

    await db.execute(
      `INSERT OR IGNORE INTO profiles (
        id, created_at, updated_at, version, device_id, is_deleted, deleted_at,
        name, persona_type, is_active
      ) VALUES (?, ?, ?, 1, ?, 0, NULL, 'کاربر اصلی', 'personal', 1)`,
      [defaultProfileId, now, now, deviceId]
    );

    return defaultProfileId;
  }

  public async createInstitution(input: CreateInstitutionInput): Promise<Institution> {
    const trimmedName = input.name.trim();
    if (!trimmedName) {
      throw new Error('نام نهاد آموزشی نمی‌تواند خالی باشد.');
    }

    const id = this.generateId('inst');
    const now = getCurrentUtcIsoString();
    const deviceId = settingsService.getDeviceId();
    const profileId = input.profileId || (await this.ensureDefaultProfile());
    const type: InstitutionType = input.type || 'university';

    await db.execute(
      `INSERT INTO institutions (
        id, created_at, updated_at, version, device_id, is_deleted, deleted_at,
        profile_id, name, type, degree_or_program, current_term
      ) VALUES (?, ?, ?, 1, ?, 0, NULL, ?, ?, ?, ?, ?)`,
      [
        id,
        now,
        now,
        deviceId,
        profileId,
        trimmedName,
        type,
        input.degreeOrProgram || null,
        input.currentTerm || null,
      ]
    );

    logger.info(`Created institution ${id} ("${trimmedName}", type=${type})`, 'InstitutionService');

    return {
      id,
      created_at: now,
      updated_at: now,
      version: 1,
      device_id: deviceId,
      is_deleted: 0,
      deleted_at: null,
      profile_id: profileId,
      name: trimmedName,
      type,
      degree_or_program: input.degreeOrProgram || null,
      current_term: input.currentTerm || null,
      subject_count: 0,
    };
  }

  public async getInstitutions(): Promise<Institution[]> {
    const institutions = await db.query<Institution>(
      'SELECT * FROM institutions WHERE is_deleted = 0 ORDER BY created_at DESC'
    );

    for (const inst of institutions) {
      const counts = await db.query<{ count: number }>(
        'SELECT COUNT(*) as count FROM subjects WHERE institution_id = ? AND is_deleted = 0',
        [inst.id]
      );
      inst.subject_count = counts.length > 0 ? Number(counts[0].count) : 0;
    }

    return institutions;
  }

  public async getInstitutionById(id: string): Promise<Institution | null> {
    const rows = await db.query<Institution>(
      'SELECT * FROM institutions WHERE id = ? AND is_deleted = 0',
      [id]
    );
    if (rows.length === 0) return null;

    const inst = rows[0];
    const counts = await db.query<{ count: number }>(
      'SELECT COUNT(*) as count FROM subjects WHERE institution_id = ? AND is_deleted = 0',
      [inst.id]
    );
    inst.subject_count = counts.length > 0 ? Number(counts[0].count) : 0;

    return inst;
  }

  public async updateInstitution(id: string, updates: UpdateInstitutionInput): Promise<void> {
    const existing = await this.getInstitutionById(id);
    if (!existing) {
      throw new Error(`Institution ${id} not found.`);
    }

    const now = getCurrentUtcIsoString();
    const name = updates.name !== undefined ? updates.name.trim() : existing.name;
    if (!name) {
      throw new Error('نام نهاد آموزشی نمی‌تواند خالی باشد.');
    }

    const type = updates.type !== undefined ? updates.type : existing.type;
    const degreeOrProgram =
      updates.degreeOrProgram !== undefined ? updates.degreeOrProgram : existing.degree_or_program;
    const currentTerm =
      updates.currentTerm !== undefined ? updates.currentTerm : existing.current_term;

    await db.execute(
      `UPDATE institutions SET
        name = ?,
        type = ?,
        degree_or_program = ?,
        current_term = ?,
        updated_at = ?,
        version = version + 1
      WHERE id = ?`,
      [name, type, degreeOrProgram, currentTerm, now, id]
    );

    logger.info(`Updated institution ${id}`, 'InstitutionService');
  }

  public async deleteInstitution(id: string): Promise<void> {
    const existing = await this.getInstitutionById(id);
    if (!existing) return;

    const now = getCurrentUtcIsoString();
    const deviceId = settingsService.getDeviceId();
    const trashId = this.generateId('trash');
    const payload = JSON.stringify(existing);

    await db.execute(
      `UPDATE institutions SET
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
      ) VALUES (?, 'institutions', ?, ?, ?, ?, 1)`,
      [trashId, id, now, deviceId, payload]
    );

    logger.info(`Soft-deleted institution ${id}`, 'InstitutionService');
  }
}

export const institutionService = new InstitutionService();
