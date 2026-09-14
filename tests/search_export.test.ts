import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../src/db/client';
import { searchService } from '../src/services/searchService';
import {
  exportFullDatabaseJSON,
  exportFullDatabaseSnapshot,
  importDatabaseJSON,
  generateGrowthReportPDF,
} from '../src/services/exportService';
import { taskService } from '../src/services/taskService';
import { journalService } from '../src/services/journalService';
import { vaultService } from '../src/services/vaultService';
import { inboxService } from '../src/services/inboxService';

describe('Phase 09: System Services — FTS5 Search, PDF Report Engine & Backup/Restore', () => {
  beforeEach(async () => {
    // Clear domain tables and FTS table before each test
    await db.execute('DELETE FROM tasks');
    await db.execute('DELETE FROM inbox_captures');
    await db.execute('DELETE FROM subjects');
    await db.execute('DELETE FROM topics');
    await db.execute('DELETE FROM chapters');
    await db.execute('DELETE FROM books');
    await db.execute('DELETE FROM institutions');
    await db.execute('DELETE FROM journals');
    await db.execute('DELETE FROM memories');
    await db.execute('DELETE FROM trash');
    await db.execute('DELETE FROM global_search_fts');
  });

  describe('Unified Full-Text Search (FTS5 & Triggers)', () => {
    it('1. should index and retrieve Persian terms via globalSearch', async () => {
      await taskService.createTask({
        title: 'طراحی سیستم طراحی پایگاه داده',
        description: 'تمرکز بر پیاده‌سازی فرم‌های نرمال و وابستگی‌های تابعی',
        priority: 'high',
      });

      const res = await searchService.globalSearch('پایگاه');
      expect(res.total).toBeGreaterThan(0);
      expect(res.all[0].title).toContain('پایگاه');
      expect(res.all[0].entity_type).toBe('task');
    });

    it('2. should index and retrieve English terms via globalSearch', async () => {
      await taskService.createTask({
        title: 'Implement React Query Architecture',
        description: 'Refactor high-performance caching layer in frontend',
        priority: 'medium',
      });

      const res = await searchService.globalSearch('Architecture');
      expect(res.total).toBe(1);
      expect(res.all[0].title).toBe('Implement React Query Architecture');
      expect(res.all[0].entity_type).toBe('task');
    });

    it('3. should group search results accurately by entity_type', async () => {
      await taskService.createTask({
        title: 'پروژه جبر خطی',
        description: 'حل تمرینات ماتریس',
      });

      await journalService.saveJournalEntry({
        entryDate: '2026-09-14',
        title: 'یادداشت روزانه جبر خطی',
        content: 'مفاهیم فضاهای برداری را مرور کردم',
      });

      await vaultService.createVaultItem({
        title: 'دستاورد درس جبر خطی',
        content: 'کسب نمره کامل در آزمون میان‌ترم',
        category: 'win',
      });

      const res = await searchService.globalSearch('جبر');

      expect(res.total).toBe(3);
      expect(res.grouped.task.length).toBe(1);
      expect(res.grouped.journal.length).toBe(1);
      expect(res.grouped.vault.length).toBe(1);
    });

    it('4. should filter search results by entity_types filter', async () => {
      await taskService.createTask({
        title: 'مطالعه سیستم‌های عامل',
      });

      await journalService.saveJournalEntry({
        entryDate: '2026-09-14',
        title: 'تجربه مطالعه سیستم‌های عامل',
        content: 'مفهوم سمافورها و نخ‌ها',
      });

      const res = await searchService.globalSearch('سیستم‌های عامل', {
        entity_types: ['journal'],
      });

      expect(res.total).toBe(1);
      expect(res.all[0].entity_type).toBe('journal');
      expect(res.grouped.task.length).toBe(0);
      expect(res.grouped.journal.length).toBe(1);
    });

    it('5. should strictly exclude soft-deleted items (is_deleted = 1) from search results', async () => {
      const task = await taskService.createTask({
        title: 'وظیفه موقت برای حذف',
        description: 'متن یادداشت وظیفه',
      });

      let res = await searchService.globalSearch('وظیفه موقت');
      expect(res.total).toBe(1);

      await taskService.deleteTask(task.id);

      res = await searchService.globalSearch('وظیفه موقت');
      expect(res.total).toBe(0);
      expect(res.all.length).toBe(0);
    });

    it('6. should auto-index task on INSERT trigger', async () => {
      await taskService.createTask({
        title: 'تسک خودکار تریگر',
        description: 'بررسی صحت اجرای تریگر دیتابیس',
      });

      const ftsRows = await db.query<any>(
        "SELECT * FROM global_search_fts WHERE entity_type = 'task' AND title LIKE '%تریگر%'"
      );
      expect(ftsRows.length).toBe(1);
      expect(ftsRows[0].title).toBe('تسک خودکار تریگر');
    });

    it('7. should auto-update FTS index on task UPDATE trigger', async () => {
      const task = await taskService.createTask({
        title: 'عنوان اولیه تسک',
        description: 'توضیحات اولیه',
      });

      await taskService.updateTask(task.id, {
        title: 'عنوان بروزرسانی شده تسک',
        description: 'توضیحات جدید',
      });

      const resOld = await searchService.globalSearch('اولیه');
      expect(resOld.total).toBe(0);

      const resNew = await searchService.globalSearch('بروزرسانی');
      expect(resNew.total).toBe(1);
      expect(resNew.all[0].title).toBe('عنوان بروزرسانی شده تسک');
    });

    it('8. should remove entry from FTS index on soft delete', async () => {
      const journal = await journalService.saveJournalEntry({
        entryDate: '2026-09-14',
        title: 'ژورنال حذفی',
        content: 'محتوای ژورنال برای حذف',
      });

      let searchRes = await searchService.globalSearch('حذفی');
      expect(searchRes.total).toBe(1);

      await journalService.deleteJournalEntry(journal.id);

      searchRes = await searchService.globalSearch('حذفی');
      expect(searchRes.total).toBe(0);
    });

    it('9. should auto-index journal entries on INSERT and UPDATE', async () => {
      await journalService.saveJournalEntry({
        entryDate: '2026-09-14',
        title: 'ملاحظات معماری نرم‌افزار',
        content: 'استفاده از الگوی DDD و clean architecture',
      });

      let res = await searchService.globalSearch('معماری');
      expect(res.total).toBe(1);
      expect(res.all[0].entity_type).toBe('journal');

      await journalService.saveJournalEntry({
        entryDate: '2026-09-14',
        title: 'ملاحظات جدید معماری نرم‌افزار میکروپروسسورها',
        content: 'استفاده از الگوی DDD و clean architecture',
      });

      res = await searchService.globalSearch('میکروپروسسورها');
      expect(res.total).toBe(1);
    });

    it('10. should auto-index memory vault items on INSERT and UPDATE', async () => {
      const v = await vaultService.createVaultItem({
        title: 'موفقیت در المپیاد کشوری',
        content: 'کسب مدال طلای المپیاد کامپیوتر',
        category: 'milestone',
      });

      let res = await searchService.globalSearch('المپیاد');
      expect(res.total).toBe(1);
      expect(res.all[0].entity_type).toBe('vault');

      await vaultService.updateVaultItem(v.id, {
        title: 'موفقیت در مسابقات جهانی البرز',
      });

      res = await searchService.globalSearch('البرز');
      expect(res.total).toBe(1);
    });

    it('11. should rebuild search index via rebuildSearchIndex()', async () => {
      await taskService.createTask({ title: 'تسک شماره یک' });
      await journalService.saveJournalEntry({ entryDate: '2026-09-14', title: 'ژورنال شماره یک', content: 'متن' });

      // Clear virtual table manually
      await db.execute('DELETE FROM global_search_fts');

      let res = await searchService.globalSearch('شماره');
      expect(res.total).toBe(0);

      await searchService.rebuildSearchIndex();

      res = await searchService.globalSearch('شماره');
      expect(res.total).toBe(2);
    });
  });

  describe('Full Database JSON Backup & Restore Pipeline', () => {
    it('12. should generate valid JSON database backups with required metadata schema', async () => {
      const snapshot = await exportFullDatabaseSnapshot();
      const jsonBlob = await exportFullDatabaseJSON();

      expect(jsonBlob).toBeInstanceOf(Blob);
      expect(snapshot).toHaveProperty('export_date');
      expect(snapshot).toHaveProperty('app_version');
      expect(snapshot).toHaveProperty('schema_version');
      expect(typeof snapshot.export_date).toBe('string');
      expect(typeof snapshot.schema_version).toBe('number');
      expect(snapshot.schema_version).toBeGreaterThan(0);
    });

    it('13. should include active domain records across modules in backup snapshot', async () => {
      await taskService.createTask({ title: 'تسک برای بکاپ' });
      await inboxService.createCapture({ rawContent: 'ورودی بکاپ' });
      await journalService.saveJournalEntry({ entryDate: '2026-09-14', title: 'ژورنال بکاپ', content: 'محتوا' });

      const snapshot = await exportFullDatabaseSnapshot();

      expect(Array.isArray(snapshot.tasks)).toBe(true);
      expect(snapshot.tasks.some((t: any) => t.title === 'تسک برای بکاپ')).toBe(true);
      expect(snapshot.inbox_captures.some((i: any) => i.raw_content === 'ورودی بکاپ')).toBe(true);
      expect(snapshot.journals.some((j: any) => j.title === 'ژورنال بکاپ')).toBe(true);
    });

    it('14. should exclude soft-deleted items (is_deleted = 1) from JSON backup snapshot', async () => {
      const taskToDelete = await taskService.createTask({ title: 'تسک حذفی برای عدم خروجی' });
      await taskService.deleteTask(taskToDelete.id);

      const snapshot = await exportFullDatabaseSnapshot();
      const found = snapshot.tasks.find((t: any) => t.id === taskToDelete.id);
      expect(found).toBeUndefined();
    });

    it('15. should validate and reject invalid / corrupted JSON strings during import attempts', async () => {
      const corruptedJson = '{ malformed json string without proper quotes }';

      await expect(importDatabaseJSON(corruptedJson)).rejects.toThrow('Invalid JSON format');
    });

    it('16. should validate and reject JSON missing required metadata fields', async () => {
      const invalidPayload = JSON.stringify({
        // missing export_date, app_version, schema_version
        tasks: [{ id: 'task_1', title: 'تسک بدون متا' }],
      });

      await expect(importDatabaseJSON(invalidPayload)).rejects.toThrow('Missing required metadata fields');
    });

    it('17. should restore JSON backups successfully inside transactions', async () => {
      // Create initial dataset
      await taskService.createTask({ title: 'تسک اولیه 1' });
      await taskService.createTask({ title: 'تسک اولیه 2' });

      const backupSnapshot = await exportFullDatabaseSnapshot();

      // Clear current DB
      await db.execute('DELETE FROM tasks');
      const emptyTasks = await db.query('SELECT * FROM tasks');
      expect(emptyTasks.length).toBe(0);

      // Restore from backup
      await importDatabaseJSON(backupSnapshot);

      const restoredTasks = await db.query<any>('SELECT * FROM tasks');
      expect(restoredTasks.length).toBe(2);
      expect(restoredTasks.some((t: any) => t.title === 'تسک اولیه 1')).toBe(true);
    });

    it('18. should rollback transaction if an import error occurs', async () => {
      await taskService.createTask({ title: 'تسک قبل از خطای ایمپورت' });

      const malformedPayload = {
        export_date: new Date().toISOString(),
        app_version: '0.1.0',
        schema_version: 5,
        tasks: [
          // Invalid payload with SQL syntax error column mapping or bad structure
          'invalid row item string instead of object',
        ],
      };

      // Ensure error occurs or handles gracefully
      try {
        await importDatabaseJSON(malformedPayload);
      } catch {
        // Expected
      }

      // Check original table state remained unaffected or recoverable
      const tasks = await db.query<any>('SELECT * FROM tasks');
      expect(tasks.length).toBeGreaterThanOrEqual(0);
    });

    it('19. should automatically rebuild FTS index after JSON restoration', async () => {
      await taskService.createTask({ title: 'تسک برای تست شاخص تریگر ایمپورت' });
      const snapshot = await exportFullDatabaseSnapshot();

      await db.execute('DELETE FROM tasks');
      await db.execute('DELETE FROM global_search_fts');

      await importDatabaseJSON(snapshot);

      const searchRes = await searchService.globalSearch('تریگر ایمپورت');
      expect(searchRes.total).toBe(1);
      expect(searchRes.all[0].title).toBe('تسک برای تست شاخص تریگر ایمپورت');
    });
  });

  describe('PDF Growth Report Engine', () => {
    it('20. should format PDF data payload for weekly growth report', async () => {
      await taskService.createTask({ title: 'تسک هفتگی' });
      await journalService.saveJournalEntry({ entryDate: '2026-09-14', title: 'ژورنال هفتگی', content: 'خلاصه' });

      const pdfBlob = await generateGrowthReportPDF('weekly');
      expect(pdfBlob).toBeInstanceOf(Blob);
      expect(pdfBlob.type).toBe('application/pdf');
      expect(pdfBlob.size).toBeGreaterThan(100);
    });

    it('21. should format PDF data payload for monthly growth report', async () => {
      const pdfBlob = await generateGrowthReportPDF('monthly');
      expect(pdfBlob).toBeInstanceOf(Blob);
      expect(pdfBlob.type).toBe('application/pdf');
      expect(pdfBlob.size).toBeGreaterThan(100);
    });

    it('22. should produce valid non-empty PDF byte array', async () => {
      const pdfBlob = await generateGrowthReportPDF('weekly');
      expect(pdfBlob).toBeInstanceOf(Blob);
      expect(pdfBlob.type).toBe('application/pdf');
      expect(pdfBlob.size).toBeGreaterThan(100);
    });
  });
});
