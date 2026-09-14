/**
 * Phase 07 — Personal Growth, Daily Journaling & Memory Vault Tests
 * Covers: Journal entry upsert, mood/energy rating clamping, streak calculations,
 * Memory vault categories, journal linkage, and soft-delete trash snapshots.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { db } from '../src/db/client';
import { journalService } from '../src/services/journalService';
import { vaultService } from '../src/services/vaultService';
import { isValidUtcIso } from '../src/lib/date/utc';

describe('Phase 07: Personal Growth Engine — Journal & Memory Vault', () => {
  beforeAll(async () => {
    // Clean tables before running suite
    await db.execute('DELETE FROM journals');
    await db.execute('DELETE FROM memories');
    await db.execute("DELETE FROM trash WHERE entity_type IN ('journals', 'memories')");
  });

  // ─── 1. Daily Journaling Lifecycle & Metadata ──────────────────────────────

  describe('Journal Entry Lifecycle & Upsert', () => {
    it('should create a daily journal entry with universal metadata and UTC ISO-8601 timestamps', async () => {
      const entry = await journalService.saveJournalEntry({
        entryDate: '2026-09-01',
        title: 'روز شروع فاز هفتم',
        content: 'امروز کار روی سیستم رشد فردی و ژورنال را آغاز کردیم.',
        moodScore: 5,
        energyLevel: 4,
        mood: 'خوشحال',
        tags: 'توسعه, رشد',
      });

      expect(entry.id).toMatch(/^journ_\d+_[a-z0-9]{6}$/);
      expect(entry.entry_date).toBe('2026-09-01');
      expect(entry.title).toBe('روز شروع فاز هفتم');
      expect(entry.content).toBe('امروز کار روی سیستم رشد فردی و ژورنال را آغاز کردیم.');
      expect(entry.mood_score).toBe(5);
      expect(entry.energy_level).toBe(4);
      expect(entry.mood).toBe('خوشحال');
      expect(entry.tags).toBe('توسعه, رشد');
      expect(entry.version).toBe(1);
      expect(entry.is_deleted).toBe(0);
      expect(entry.deleted_at).toBeNull();
      expect(isValidUtcIso(entry.created_at)).toBe(true);
      expect(isValidUtcIso(entry.updated_at)).toBe(true);
    });

    it('should upsert when saving for the same date: update fields and increment version', async () => {
      const updated = await journalService.saveJournalEntry({
        entryDate: '2026-09-01',
        title: 'عنوان بروزرسانی‌شده',
        content: 'متن جدید و تکمیل‌شده روز.',
        moodScore: 4,
        energyLevel: 5,
        tags: 'توسعه, رشد, نهایی',
      });

      expect(updated.entry_date).toBe('2026-09-01');
      expect(updated.title).toBe('عنوان بروزرسانی‌شده');
      expect(updated.content).toBe('متن جدید و تکمیل‌شده روز.');
      expect(updated.mood_score).toBe(4);
      expect(updated.energy_level).toBe(5);
      expect(updated.tags).toBe('توسعه, رشد, نهایی');
      expect(updated.version).toBe(2);

      // Verify DB contains only 1 entry for this date
      const allForDate = await db.query(
        'SELECT * FROM journals WHERE entry_date = ? AND is_deleted = 0',
        ['2026-09-01']
      );
      expect(allForDate.length).toBe(1);
    });

    it('should reject invalid entry_date formats', async () => {
      await expect(
        journalService.saveJournalEntry({
          entryDate: '2026/09/01',
          content: 'تست تاریخ نامعتبر',
        })
      ).rejects.toThrow('فرمت تاریخ ورود نامعتبر است');

      await expect(
        journalService.saveJournalEntry({
          entryDate: 'invalid-date',
          content: 'تست تاریخ نامعتبر',
        })
      ).rejects.toThrow('فرمت تاریخ ورود نامعتبر است');
    });

    it('should clamp mood_score and energy_level to range [1, 5]', async () => {
      const entryLow = await journalService.saveJournalEntry({
        entryDate: '2026-09-02',
        content: 'تست مقادیر کمتر از ۱',
        moodScore: -2,
        energyLevel: 0,
      });
      expect(entryLow.mood_score).toBe(1);
      expect(entryLow.energy_level).toBe(1);

      const entryHigh = await journalService.saveJournalEntry({
        entryDate: '2026-09-03',
        content: 'تست مقادیر بیشتر از ۵',
        moodScore: 10,
        energyLevel: 8,
      });
      expect(entryHigh.mood_score).toBe(5);
      expect(entryHigh.energy_level).toBe(5);
    });

    it('should handle null/undefined mood and energy ratings gracefully', async () => {
      const entry = await journalService.saveJournalEntry({
        entryDate: '2026-09-04',
        content: 'ژورنال بدون نمره مود',
      });
      expect(entry.mood_score).toBeNull();
      expect(entry.energy_level).toBeNull();
    });

    it('should retrieve journal entry by exact date via getJournalEntryByDate', async () => {
      const entry = await journalService.getJournalEntryByDate('2026-09-01');
      expect(entry).not.toBeNull();
      expect(entry?.title).toBe('عنوان بروزرسانی‌شده');

      const nonExistent = await journalService.getJournalEntryByDate('1999-01-01');
      expect(nonExistent).toBeNull();
    });

    it('should filter journal entries by date range, search keyword, and tags', async () => {
      // Range query
      const range = await journalService.getJournalEntries({
        startDate: '2026-09-01',
        endDate: '2026-09-03',
      });
      expect(range.length).toBe(3);

      // Search keyword
      const search = await journalService.getJournalEntries({
        search: 'تکمیل‌شده',
      });
      expect(search.length).toBe(1);
      expect(search[0].entry_date).toBe('2026-09-01');

      // Tag filter
      const tagged = await journalService.getJournalEntries({
        tag: 'نهایی',
      });
      expect(tagged.length).toBe(1);
      expect(tagged[0].entry_date).toBe('2026-09-01');
    });

    it('should soft-delete a journal entry and write JSON snapshot to trash', async () => {
      const entry = await journalService.saveJournalEntry({
        entryDate: '2026-09-05',
        content: 'یادداشت حذفی برای تست ترش',
      });

      await journalService.deleteJournalEntry(entry.id);

      const retrieved = await journalService.getJournalEntryByDate('2026-09-05');
      expect(retrieved).toBeNull();

      const trash = await db.query<{ id: string; entity_id: string; payload: string }>(
        "SELECT id, entity_id, payload FROM trash WHERE entity_type = 'journals' AND entity_id = ?",
        [entry.id]
      );
      expect(trash.length).toBe(1);
      const parsed = JSON.parse(trash[0].payload);
      expect(parsed.id).toBe(entry.id);
      expect(parsed.entry_date).toBe('2026-09-05');
    });
  });

  // ─── 2. Mood & Energy Analytics & Streaks ──────────────────────────────────

  describe('Mood Analytics & Streak Calculations', () => {
    it('should compute mood/energy averages and distribution accurately', async () => {
      await db.execute('DELETE FROM journals');

      await journalService.saveJournalEntry({
        entryDate: '2026-08-10',
        content: 'روز ۱',
        moodScore: 4,
        energyLevel: 3,
      });
      await journalService.saveJournalEntry({
        entryDate: '2026-08-11',
        content: 'روز ۲',
        moodScore: 2,
        energyLevel: 5,
      });

      const stats = await journalService.getMoodStats('2026-08-01', '2026-08-31');

      expect(stats.totalEntries).toBe(2);
      expect(stats.averageMood).toBe(3); // (4 + 2) / 2 = 3.0
      expect(stats.averageEnergy).toBe(4); // (3 + 5) / 2 = 4.0
      expect(stats.moodDistribution[4]).toBe(1);
      expect(stats.moodDistribution[2]).toBe(1);
      expect(stats.energyDistribution[3]).toBe(1);
      expect(stats.energyDistribution[5]).toBe(1);
    });

    it('should calculate active consecutive journaling streak ending today or yesterday', async () => {
      await db.execute('DELETE FROM journals');

      const today = new Date().toISOString().split('T')[0];
      const d1 = new Date(Date.now() - 86400000).toISOString().split('T')[0]; // yesterday
      const d2 = new Date(Date.now() - 2 * 86400000).toISOString().split('T')[0]; // 2 days ago

      await journalService.saveJournalEntry({ entryDate: d2, content: '۲ روز پیش' });
      await journalService.saveJournalEntry({ entryDate: d1, content: 'دیروز' });
      await journalService.saveJournalEntry({ entryDate: today, content: 'امروز' });

      const stats = await journalService.getMoodStats();
      expect(stats.currentStreak).toBe(3);
      expect(stats.longestStreak).toBe(3);
    });

    it('should reset current streak to 0 if last entry is older than yesterday', async () => {
      await db.execute('DELETE FROM journals');

      // Entry 3 days ago and 4 days ago (streak was 2, but broken)
      const d3 = new Date(Date.now() - 3 * 86400000).toISOString().split('T')[0];
      const d4 = new Date(Date.now() - 4 * 86400000).toISOString().split('T')[0];

      await journalService.saveJournalEntry({ entryDate: d4, content: '۴ روز پیش' });
      await journalService.saveJournalEntry({ entryDate: d3, content: '۳ روز پیش' });

      const stats = await journalService.getMoodStats();
      expect(stats.currentStreak).toBe(0); // broken
      expect(stats.longestStreak).toBe(2); // historic longest preserved
    });
  });

  // ─── 3. Memory Vault CRUD & Categories ─────────────────────────────────────

  describe('Memory Vault Management', () => {
    let testJournalId: string;

    beforeAll(async () => {
      const j = await journalService.saveJournalEntry({
        entryDate: '2026-09-06',
        content: 'جلسه بازتاب برای اتصال به والت',
      });
      testJournalId = j.id;
    });

    it('should create a win item in Memory Vault with universal metadata', async () => {
      const item = await vaultService.createVaultItem({
        title: 'اتمام موفقیت‌آمیز فاز ۶',
        content: 'تایمر پومودورو و تقویم به طور کامل با ۱۲۱ تست پاس شدند.',
        category: 'win',
        significanceRating: 5,
      });

      expect(item.id).toMatch(/^vault_\d+_[a-z0-9]{6}$/);
      expect(item.title).toBe('اتمام موفقیت‌آمیز فاز ۶');
      expect(item.category).toBe('win');
      expect(item.significance_rating).toBe(5);
      expect(item.version).toBe(1);
      expect(item.is_deleted).toBe(0);
      expect(isValidUtcIso(item.created_at)).toBe(true);
      expect(isValidUtcIso(item.updated_at)).toBe(true);
    });

    it('should create memory vault items across all categories (gratitude, lesson, insight, milestone)', async () => {
      const gratitude = await vaultService.createVaultItem({
        title: 'سلامتی و آرامش ذهن',
        content: 'قدردان یک روز آرام کاری و پیشرفت پایدار هستم.',
        category: 'gratitude',
      });
      expect(gratitude.category).toBe('gratitude');

      const lesson = await vaultService.createVaultItem({
        title: 'اهمیت تایپ‌استریکت استریکت',
        content: 'همیشه تایپ‌های بدون استفاده را بلافاصله حذف یا کلین‌آپ کنید.',
        category: 'lesson',
      });
      expect(lesson.category).toBe('lesson');

      const insight = await vaultService.createVaultItem({
        title: 'تفکیک متادیتا در دیتابیس',
        content: 'الگوی ترش و سافت‌دلیت مدیریت اسنپ‌شات‌ها را بی‌نقص می‌کند.',
        category: 'insight',
      });
      expect(insight.category).toBe('insight');

      const milestone = await vaultService.createVaultItem({
        title: 'رسیدن به فاز ۷ پروژه',
        content: 'بیش از نیمی از اهداف برنامه محقق گردید.',
        category: 'milestone',
      });
      expect(milestone.category).toBe('milestone');
    });

    it('should reject creating vault items with empty title or content', async () => {
      await expect(
        vaultService.createVaultItem({
          title: '',
          content: 'متن بدون عنوان',
        })
      ).rejects.toThrow('عنوان تجربه یا خاطره الزامی است');

      await expect(
        vaultService.createVaultItem({
          title: 'عنوان بدون متن',
          content: '   ',
        })
      ).rejects.toThrow('متن تجربه یا خاطره نمی‌تواند خالی باشد');
    });

    it('should link a Memory Vault item to a journal_entry_id', async () => {
      const item = await vaultService.createVaultItem({
        title: 'بینش حاصل از بازتاب شبانه',
        content: 'متصل به یادداشت روزانه ۶ سپتامبر',
        category: 'insight',
        journalEntryId: testJournalId,
      });

      expect(item.journal_entry_id).toBe(testJournalId);

      const retrieved = await vaultService.getVaultItemById(item.id);
      expect(retrieved?.journal_entry_id).toBe(testJournalId);
    });

    it('should filter vault items by category', async () => {
      const wins = await vaultService.getVaultItems({ category: 'win' });
      expect(wins.every((w) => w.category === 'win')).toBe(true);

      const lessons = await vaultService.getVaultItems({ category: 'lesson' });
      expect(lessons.every((l) => l.category === 'lesson')).toBe(true);
    });

    it('should update a Memory Vault item and increment version', async () => {
      const item = await vaultService.createVaultItem({
        title: 'عنوان اولیه خاطره',
        content: 'متن اولیه',
        category: 'lesson',
      });

      const updated = await vaultService.updateVaultItem(item.id, {
        title: 'عنوان ویرایش‌شده خاطره',
        significanceRating: 4,
      });

      expect(updated.title).toBe('عنوان ویرایش‌شده خاطره');
      expect(updated.significance_rating).toBe(4);
      expect(updated.version).toBe(2);
    });

    it('should compute vault statistics accurately across all categories', async () => {
      const stats = await vaultService.getVaultStats();

      expect(stats.totalCount).toBeGreaterThan(0);
      expect(stats.winsCount).toBeGreaterThan(0);
      expect(stats.gratitudeCount).toBeGreaterThan(0);
      expect(stats.lessonsCount).toBeGreaterThan(0);
      expect(stats.insightsCount).toBeGreaterThan(0);
      expect(stats.milestonesCount).toBeGreaterThan(0);
    });

    it('should soft-delete a Memory Vault item and write JSON audit snapshot to trash', async () => {
      const item = await vaultService.createVaultItem({
        title: 'مورد تستی حذفی والت',
        content: 'این رکورد باید پاک شود.',
        category: 'milestone',
      });

      await vaultService.deleteVaultItem(item.id);

      const retrieved = await vaultService.getVaultItemById(item.id);
      expect(retrieved).toBeNull();

      const trash = await db.query<{ id: string; entity_id: string; payload: string }>(
        "SELECT id, entity_id, payload FROM trash WHERE entity_type = 'memories' AND entity_id = ?",
        [item.id]
      );
      expect(trash.length).toBe(1);
      const parsed = JSON.parse(trash[0].payload);
      expect(parsed.id).toBe(item.id);
      expect(parsed.title).toBe('مورد تستی حذفی والت');
    });
  });
});
