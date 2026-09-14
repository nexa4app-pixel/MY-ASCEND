/**
 * Academic Book Service
 * Handles CRUD, reading progress calculation, and page progress updates for textbooks.
 */
import { db } from '../db/client';
import { Book } from '../types/database';
import { getCurrentUtcIsoString } from '../lib/date/utc';
import { settingsService } from './settingsService';
import { logger } from './logger';

export interface CreateBookInput {
  title: string;
  subjectId?: string | null;
  authors?: string | null;
  edition?: string | null;
  totalPages?: number | null;
  readPages?: number | null;
  link?: string | null;
}

export interface UpdateBookInput {
  title?: string;
  subjectId?: string | null;
  authors?: string | null;
  edition?: string | null;
  totalPages?: number | null;
  readPages?: number | null;
  link?: string | null;
}

class BookService {
  private generateId(prefix: string): string {
    const rand = Math.random().toString(36).substring(2, 8);
    return `${prefix}_${Date.now()}_${rand}`;
  }

  public async createBook(input: CreateBookInput): Promise<Book> {
    const trimmedTitle = input.title.trim();
    if (!trimmedTitle) {
      throw new Error('عنوان کتاب نمی‌تواند خالی باشد.');
    }

    const id = this.generateId('book');
    const now = getCurrentUtcIsoString();
    const deviceId = settingsService.getDeviceId();
    const totalPages = input.totalPages !== undefined && input.totalPages !== null ? Math.max(0, Number(input.totalPages)) : null;
    const readPages = input.readPages !== undefined && input.readPages !== null ? Math.max(0, Number(input.readPages)) : 0;

    await db.execute(
      `INSERT INTO books (
        id, created_at, updated_at, version, device_id, is_deleted, deleted_at,
        subject_id, title, authors, edition, total_pages, read_pages, link
      ) VALUES (?, ?, ?, 1, ?, 0, NULL, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        now,
        now,
        deviceId,
        input.subjectId || null,
        trimmedTitle,
        input.authors || null,
        input.edition || null,
        totalPages,
        readPages,
        input.link || null,
      ]
    );

    logger.info(`Created book ${id} ("${trimmedTitle}", total=${totalPages}, read=${readPages})`, 'BookService');

    const progressPercent = totalPages && totalPages > 0 ? Math.min(100, Math.round((readPages / totalPages) * 100)) : 0;

    return {
      id,
      created_at: now,
      updated_at: now,
      version: 1,
      device_id: deviceId,
      is_deleted: 0,
      deleted_at: null,
      subject_id: input.subjectId || null,
      title: trimmedTitle,
      authors: input.authors || null,
      edition: input.edition || null,
      total_pages: totalPages,
      read_pages: readPages,
      link: input.link || null,
      chapter_count: 0,
      topic_count: 0,
      completed_topic_count: 0,
      progress_percent: progressPercent,
    };
  }

  public async getBooks(subjectId?: string): Promise<Book[]> {
    let sql = 'SELECT * FROM books WHERE is_deleted = 0';
    const params: unknown[] = [];

    if (subjectId) {
      sql += ' AND subject_id = ?';
      params.push(subjectId);
    }
    sql += ' ORDER BY created_at DESC';

    const books = await db.query<Book>(sql, params);

    for (const book of books) {
      await this.populateBookStats(book);
    }

    return books;
  }

  public async getBookById(id: string): Promise<Book | null> {
    const rows = await db.query<Book>(
      'SELECT * FROM books WHERE id = ? AND is_deleted = 0',
      [id]
    );
    if (rows.length === 0) return null;

    const book = rows[0];
    await this.populateBookStats(book);
    return book;
  }

  private async populateBookStats(book: Book): Promise<void> {
    const chapters = await db.query<{ id: string }>(
      'SELECT id FROM chapters WHERE book_id = ? AND is_deleted = 0',
      [book.id]
    );
    book.chapter_count = chapters.length;

    if (chapters.length > 0) {
      const chapterIds = chapters.map((c) => `'${c.id}'`).join(',');
      const topicCounts = await db.query<{ is_completed: number; count: number }>(
        `SELECT is_completed, COUNT(*) as count FROM topics WHERE chapter_id IN (${chapterIds}) AND is_deleted = 0 GROUP BY is_completed`
      );

      let totalTopics = 0;
      let completedTopics = 0;
      for (const t of topicCounts) {
        const c = Number(t.count);
        totalTopics += c;
        if (Number(t.is_completed) === 1) {
          completedTopics += c;
        }
      }
      book.topic_count = totalTopics;
      book.completed_topic_count = completedTopics;
    } else {
      book.topic_count = 0;
      book.completed_topic_count = 0;
    }

    const total = book.total_pages ?? 0;
    const read = book.read_pages ?? 0;
    book.progress_percent = total > 0 ? Math.min(100, Math.round((read / total) * 100)) : 0;
  }

  public async updateBook(id: string, updates: UpdateBookInput): Promise<void> {
    const existing = await this.getBookById(id);
    if (!existing) {
      throw new Error(`Book ${id} not found.`);
    }

    const now = getCurrentUtcIsoString();
    const title = updates.title !== undefined ? updates.title.trim() : existing.title;
    if (!title) {
      throw new Error('عنوان کتاب نمی‌تواند خالی باشد.');
    }

    const subjectId = updates.subjectId !== undefined ? updates.subjectId : existing.subject_id;
    const authors = updates.authors !== undefined ? updates.authors : existing.authors;
    const edition = updates.edition !== undefined ? updates.edition : existing.edition;
    const totalPages =
      updates.totalPages !== undefined
        ? (updates.totalPages !== null ? Math.max(0, Number(updates.totalPages)) : null)
        : existing.total_pages;
    const readPages =
      updates.readPages !== undefined
        ? (updates.readPages !== null ? Math.max(0, Number(updates.readPages)) : 0)
        : (existing.read_pages ?? 0);
    const link = updates.link !== undefined ? updates.link : existing.link;

    await db.execute(
      `UPDATE books SET
        title = ?,
        subject_id = ?,
        authors = ?,
        edition = ?,
        total_pages = ?,
        read_pages = ?,
        link = ?,
        updated_at = ?,
        version = version + 1
      WHERE id = ?`,
      [title, subjectId, authors, edition, totalPages, readPages, link, now, id]
    );

    logger.info(`Updated book ${id}`, 'BookService');
  }

  /**
   * Fast inline update for reading progress
   */
  public async updateReadingProgress(id: string, readPages: number): Promise<number> {
    const existing = await this.getBookById(id);
    if (!existing) {
      throw new Error(`Book ${id} not found.`);
    }

    const maxPages = existing.total_pages ? existing.total_pages : 999999;
    const clampedPages = Math.max(0, Math.min(Math.round(readPages), maxPages));
    const now = getCurrentUtcIsoString();

    await db.execute(
      `UPDATE books SET
        read_pages = ?,
        updated_at = ?,
        version = version + 1
      WHERE id = ?`,
      [clampedPages, now, id]
    );

    logger.info(`Updated reading progress for book ${id}: ${clampedPages} pages`, 'BookService');
    return clampedPages;
  }

  public async deleteBook(id: string): Promise<void> {
    const existing = await this.getBookById(id);
    if (!existing) return;

    const now = getCurrentUtcIsoString();
    const deviceId = settingsService.getDeviceId();
    const trashId = this.generateId('trash');
    const payload = JSON.stringify(existing);

    await db.execute(
      `UPDATE books SET
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
      ) VALUES (?, 'books', ?, ?, ?, ?, 1)`,
      [trashId, id, now, deviceId, payload]
    );

    logger.info(`Soft-deleted book ${id}`, 'BookService');
  }
}

export const bookService = new BookService();
