import { describe, it, expect, beforeAll } from 'vitest';
import { db } from '../src/db/client';
import { inboxService } from '../src/services/inboxService';
import { isValidUtcIso } from '../src/lib/date/utc';

describe('Phase 02: Inbox Service & Triage Engine', () => {
  beforeAll(async () => {
    // Ensure database client is initialized and clean
    await db.execute('DELETE FROM inbox_captures');
    await db.execute('DELETE FROM tasks');
    await db.execute('DELETE FROM notes');
    await db.execute('DELETE FROM journals');
    await db.execute('DELETE FROM trash');
  });

  it('should create a rapid capture with universal metadata and UTC ISO timestamps', async () => {
    const capture = await inboxService.createCapture({
      rawContent: 'Buy organic milk and sourdough bread',
      source: 'quick_capture',
    });

    expect(capture.id).toBeDefined();
    expect(capture.raw_content).toBe('Buy organic milk and sourdough bread');
    expect(capture.source).toBe('quick_capture');
    expect(capture.status).toBe('unprocessed');
    expect(capture.version).toBe(1);
    expect(capture.is_deleted).toBe(0);
    expect(capture.deleted_at).toBeNull();
    expect(isValidUtcIso(capture.created_at)).toBe(true);
    expect(isValidUtcIso(capture.updated_at)).toBe(true);
    expect(capture.device_id).toBeDefined();
  });

  it('should throw error when attempting to capture empty or whitespace content', async () => {
    await expect(
      inboxService.createCapture({ rawContent: '   ' })
    ).rejects.toThrow('Capture content cannot be empty.');
  });

  it('should retrieve and filter captures by status, source, and search keyword', async () => {
    await inboxService.createCapture({
      rawContent: 'https://react.dev/reference/react',
      source: 'link',
    });
    await inboxService.createCapture({
      rawContent: 'Review chapter 4 of algorithm textbook',
      source: 'task_candidate',
    });

    // Filter by source
    const links = await inboxService.getCaptures({ source: 'link' });
    expect(links.length).toBe(1);
    expect(links[0].source).toBe('link');

    // Filter by search query
    const searchResults = await inboxService.getCaptures({ search: 'algorithm' });
    expect(searchResults.length).toBe(1);
    expect(searchResults[0].raw_content).toContain('algorithm');
  });

  it('should update capture content and status', async () => {
    const item = await inboxService.createCapture({
      rawContent: 'Original note thought',
      source: 'note',
    });

    await inboxService.updateCapture(item.id, {
      raw_content: 'Updated note thought with more details',
    });

    const updated = await inboxService.getCaptureById(item.id);
    expect(updated).not.toBeNull();
    expect(updated?.raw_content).toBe('Updated note thought with more details');
    expect(updated?.version).toBe(2);
  });

  it('should promote capture to Task with status set strictly to "inbox"', async () => {
    const item = await inboxService.createCapture({
      rawContent: 'Submit annual tax declaration\nMust include freelance deductions',
      source: 'task_candidate',
    });

    const task = await inboxService.promoteToTask(item.id, undefined, 'high');

    // Verify task attributes
    expect(task.id).toBeDefined();
    expect(task.title).toBe('Submit annual tax declaration');
    expect(task.description).toBe('Must include freelance deductions');
    expect(task.priority).toBe('high');
    // Strict requirement: status must be 'inbox'
    expect(task.status).toBe('inbox');
    expect(task.version).toBe(1);
    expect(isValidUtcIso(task.created_at)).toBe(true);

    // Verify capture is now marked as processed
    const captureAfter = await inboxService.getCaptureById(item.id);
    expect(captureAfter?.status).toBe('processed');
    expect(captureAfter?.processed_at).not.toBeNull();
  });

  it('should promote capture to Note and mark capture as processed', async () => {
    const item = await inboxService.createCapture({
      rawContent: 'Microservices vs Monoliths summary\nKeep simple until scaling demands it.',
      source: 'note',
    });

    const note = await inboxService.promoteToNote(item.id, 'Microservices Architecture Note');

    expect(note.id).toBeDefined();
    expect(note.title).toBe('Microservices Architecture Note');
    expect(note.content).toContain('Keep simple until scaling demands it.');
    expect(note.is_pinned).toBe(0);

    const captureAfter = await inboxService.getCaptureById(item.id);
    expect(captureAfter?.status).toBe('processed');
  });

  it('should promote capture to Journal enforcing UTC YYYY-MM-DD entry_date format', async () => {
    const item1 = await inboxService.createCapture({
      rawContent: 'Had an inspiring discussion with the research team this morning.',
      source: 'quick_capture',
    });

    const journal1 = await inboxService.promoteToJournal(item1.id);
    const todayUtc = new Date().toISOString().split('T')[0];

    expect(journal1.id).toBeDefined();
    expect(journal1.entry_date).toBe(todayUtc);
    expect(journal1.content).toContain('Had an inspiring discussion');

    // When promoting a second capture on the same day, it should cleanly append to preserve entry_date uniqueness
    const item2 = await inboxService.createCapture({
      rawContent: 'Reflected on daily goals during evening walk.',
      source: 'quick_capture',
    });

    const journal2 = await inboxService.promoteToJournal(item2.id);
    expect(journal2.id).toBe(journal1.id);
    expect(journal2.entry_date).toBe(todayUtc);
    expect(journal2.content).toContain('inspiring discussion');
    expect(journal2.content).toContain('Reflected on daily goals');
  });

  it('should perform accurate soft delete and write full JSON snapshot into trash table', async () => {
    const item = await inboxService.createCapture({
      rawContent: 'Temporary draft to be deleted',
      source: 'quick_capture',
    });

    await inboxService.deleteCapture(item.id);

    // Should not appear in active getCaptures
    const active = await inboxService.getCaptures();
    expect(active.some((c) => c.id === item.id)).toBe(false);

    // Verify row in database has is_deleted = 1 and deleted_at set
    const rows = await db.query(
      'SELECT id, is_deleted, deleted_at FROM inbox_captures WHERE id = ?',
      [item.id]
    );
    expect(rows.length).toBe(1);
    expect(Number((rows[0] as { is_deleted: number }).is_deleted)).toBe(1);
    expect((rows[0] as { deleted_at: string }).deleted_at).not.toBeNull();

    // Verify snapshot exists in trash table
    const trashRows = await db.query(
      "SELECT * FROM trash WHERE entity_type = 'inbox_captures' AND entity_id = ?",
      [item.id]
    );
    expect(trashRows.length).toBe(1);
    const trashRecord = trashRows[0] as { payload: string; can_restore: number };
    expect(trashRecord.can_restore).toBe(1);
    const parsedPayload = JSON.parse(trashRecord.payload);
    expect(parsedPayload.raw_content).toBe('Temporary draft to be deleted');
  });

  it('should calculate accurate triage progress stats', async () => {
    const stats = await inboxService.getTriageStats();
    expect(stats.total).toBeGreaterThanOrEqual(1);
    expect(stats.progressPercent).toBeGreaterThanOrEqual(0);
    expect(stats.progressPercent).toBeLessThanOrEqual(100);
  });
});
