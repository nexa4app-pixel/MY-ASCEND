/**
 * Unified Academic Tree Service
 * Handles Chapters, Sections, Topics, hierarchical tree assembly, and completion toggles.
 */
import { db } from '../db/client';
import {
  Institution,
  Subject,
  Book,
  Chapter,
  Section,
  Topic,
  TopicImportance,
} from '../types/database';
import { getCurrentUtcIsoString } from '../lib/date/utc';
import { settingsService } from './settingsService';
import { logger } from './logger';

export interface CreateChapterInput {
  bookId: string;
  chapterNumber?: number;
  title: string;
  startPage?: number | null;
  endPage?: number | null;
}

export interface UpdateChapterInput {
  chapterNumber?: number;
  title?: string;
  startPage?: number | null;
  endPage?: number | null;
}

export interface CreateSectionInput {
  chapterId: string;
  sectionNumber?: string | null;
  title: string;
  page?: number | null;
}

export interface UpdateSectionInput {
  sectionNumber?: string | null;
  title?: string;
  page?: number | null;
}

export interface CreateTopicInput {
  subjectId: string;
  chapterId: string;
  sectionId?: string | null;
  title: string;
  importanceLevel?: TopicImportance;
}

export interface UpdateTopicInput {
  title?: string;
  sectionId?: string | null;
  importanceLevel?: TopicImportance;
  isCompleted?: number;
}

export interface SectionNode extends Section {
  topics: Topic[];
}

export interface ChapterNode extends Chapter {
  sections: SectionNode[];
  directTopics: Topic[];
}

export interface BookNode extends Book {
  chapters: ChapterNode[];
}

export interface SubjectNode extends Subject {
  books: BookNode[];
}

export interface InstitutionNode extends Institution {
  subjects: SubjectNode[];
}

export interface AcademicStats {
  institutionCount: number;
  subjectCount: number;
  bookCount: number;
  chapterCount: number;
  topicCount: number;
  completedTopicCount: number;
  overallProgressPercent: number;
  totalPages: number;
  readPages: number;
}

class AcademicTreeService {
  private generateId(prefix: string): string {
    const rand = Math.random().toString(36).substring(2, 8);
    return `${prefix}_${Date.now()}_${rand}`;
  }

  // ─── Chapter Methods ───────────────────────────────────────────────────────

  public async createChapter(input: CreateChapterInput): Promise<Chapter> {
    const trimmedTitle = input.title.trim();
    if (!trimmedTitle) {
      throw new Error('عنوان فصل نمی‌تواند خالی باشد.');
    }
    if (!input.bookId) {
      throw new Error('شناسه کتاب (book_id) الزامی است.');
    }

    const id = this.generateId('chap');
    const now = getCurrentUtcIsoString();
    const deviceId = settingsService.getDeviceId();

    let chapterNum = input.chapterNumber;
    if (chapterNum === undefined || chapterNum === null) {
      const maxRows = await db.query<{ max_num: number | null }>(
        'SELECT MAX(chapter_number) as max_num FROM chapters WHERE book_id = ? AND is_deleted = 0',
        [input.bookId]
      );
      chapterNum = (maxRows[0]?.max_num ?? 0) + 1;
    }

    await db.execute(
      `INSERT INTO chapters (
        id, created_at, updated_at, version, device_id, is_deleted, deleted_at,
        book_id, chapter_number, title, start_page, end_page
      ) VALUES (?, ?, ?, 1, ?, 0, NULL, ?, ?, ?, ?, ?)`,
      [
        id,
        now,
        now,
        deviceId,
        input.bookId,
        chapterNum,
        trimmedTitle,
        input.startPage || null,
        input.endPage || null,
      ]
    );

    logger.info(`Created chapter ${id} ("${trimmedTitle}", num=${chapterNum})`, 'AcademicTreeService');

    return {
      id,
      created_at: now,
      updated_at: now,
      version: 1,
      device_id: deviceId,
      is_deleted: 0,
      deleted_at: null,
      book_id: input.bookId,
      chapter_number: chapterNum,
      title: trimmedTitle,
      start_page: input.startPage || null,
      end_page: input.endPage || null,
      section_count: 0,
      topic_count: 0,
      completed_topic_count: 0,
    };
  }

  public async getChapters(bookId: string): Promise<Chapter[]> {
    const chapters = await db.query<Chapter>(
      'SELECT * FROM chapters WHERE book_id = ? AND is_deleted = 0 ORDER BY chapter_number ASC',
      [bookId]
    );

    for (const chap of chapters) {
      const secCounts = await db.query<{ count: number }>(
        'SELECT COUNT(*) as count FROM sections WHERE chapter_id = ? AND is_deleted = 0',
        [chap.id]
      );
      chap.section_count = secCounts.length > 0 ? Number(secCounts[0].count) : 0;

      const topicCounts = await db.query<{ is_completed: number; count: number }>(
        'SELECT is_completed, COUNT(*) as count FROM topics WHERE chapter_id = ? AND is_deleted = 0 GROUP BY is_completed',
        [chap.id]
      );

      let totalTopics = 0;
      let completedTopics = 0;
      for (const t of topicCounts) {
        const c = Number(t.count);
        totalTopics += c;
        if (Number(t.is_completed) === 1) completedTopics += c;
      }
      chap.topic_count = totalTopics;
      chap.completed_topic_count = completedTopics;
    }

    return chapters;
  }

  public async getChapterById(id: string): Promise<Chapter | null> {
    const rows = await db.query<Chapter>(
      'SELECT * FROM chapters WHERE id = ? AND is_deleted = 0',
      [id]
    );
    return rows.length > 0 ? rows[0] : null;
  }

  public async updateChapter(id: string, updates: UpdateChapterInput): Promise<void> {
    const existing = await this.getChapterById(id);
    if (!existing) {
      throw new Error(`Chapter ${id} not found.`);
    }

    const now = getCurrentUtcIsoString();
    const title = updates.title !== undefined ? updates.title.trim() : existing.title;
    if (!title) {
      throw new Error('عنوان فصل نمی‌تواند خالی باشد.');
    }

    const chapterNum =
      updates.chapterNumber !== undefined ? Number(updates.chapterNumber) : existing.chapter_number;
    const startPage = updates.startPage !== undefined ? updates.startPage : existing.start_page;
    const endPage = updates.endPage !== undefined ? updates.endPage : existing.end_page;

    await db.execute(
      `UPDATE chapters SET
        title = ?,
        chapter_number = ?,
        start_page = ?,
        end_page = ?,
        updated_at = ?,
        version = version + 1
      WHERE id = ?`,
      [title, chapterNum, startPage, endPage, now, id]
    );

    logger.info(`Updated chapter ${id}`, 'AcademicTreeService');
  }

  public async deleteChapter(id: string): Promise<void> {
    const existing = await this.getChapterById(id);
    if (!existing) return;

    const now = getCurrentUtcIsoString();
    const deviceId = settingsService.getDeviceId();
    const trashId = this.generateId('trash');
    const payload = JSON.stringify(existing);

    await db.execute(
      `UPDATE chapters SET
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
      ) VALUES (?, 'chapters', ?, ?, ?, ?, 1)`,
      [trashId, id, now, deviceId, payload]
    );

    logger.info(`Soft-deleted chapter ${id}`, 'AcademicTreeService');
  }

  // ─── Section Methods ───────────────────────────────────────────────────────

  public async createSection(input: CreateSectionInput): Promise<Section> {
    const trimmedTitle = input.title.trim();
    if (!trimmedTitle) {
      throw new Error('عنوان بخش نمی‌تواند خالی باشد.');
    }
    if (!input.chapterId) {
      throw new Error('شناسه فصل (chapter_id) الزامی است.');
    }

    const id = this.generateId('sec');
    const now = getCurrentUtcIsoString();
    const deviceId = settingsService.getDeviceId();

    await db.execute(
      `INSERT INTO sections (
        id, created_at, updated_at, version, device_id, is_deleted, deleted_at,
        chapter_id, section_number, title, page
      ) VALUES (?, ?, ?, 1, ?, 0, NULL, ?, ?, ?, ?)`,
      [
        id,
        now,
        now,
        deviceId,
        input.chapterId,
        input.sectionNumber || null,
        trimmedTitle,
        input.page || null,
      ]
    );

    logger.info(`Created section ${id} ("${trimmedTitle}")`, 'AcademicTreeService');

    return {
      id,
      created_at: now,
      updated_at: now,
      version: 1,
      device_id: deviceId,
      is_deleted: 0,
      deleted_at: null,
      chapter_id: input.chapterId,
      section_number: input.sectionNumber || null,
      title: trimmedTitle,
      page: input.page || null,
      topic_count: 0,
      completed_topic_count: 0,
    };
  }

  public async getSections(chapterId: string): Promise<Section[]> {
    const sections = await db.query<Section>(
      'SELECT * FROM sections WHERE chapter_id = ? AND is_deleted = 0 ORDER BY created_at ASC',
      [chapterId]
    );

    for (const sec of sections) {
      const topicCounts = await db.query<{ is_completed: number; count: number }>(
        'SELECT is_completed, COUNT(*) as count FROM topics WHERE section_id = ? AND is_deleted = 0 GROUP BY is_completed',
        [sec.id]
      );

      let totalTopics = 0;
      let completedTopics = 0;
      for (const t of topicCounts) {
        const c = Number(t.count);
        totalTopics += c;
        if (Number(t.is_completed) === 1) completedTopics += c;
      }
      sec.topic_count = totalTopics;
      sec.completed_topic_count = completedTopics;
    }

    return sections;
  }

  public async getSectionById(id: string): Promise<Section | null> {
    const rows = await db.query<Section>(
      'SELECT * FROM sections WHERE id = ? AND is_deleted = 0',
      [id]
    );
    return rows.length > 0 ? rows[0] : null;
  }

  public async updateSection(id: string, updates: UpdateSectionInput): Promise<void> {
    const existing = await this.getSectionById(id);
    if (!existing) {
      throw new Error(`Section ${id} not found.`);
    }

    const now = getCurrentUtcIsoString();
    const title = updates.title !== undefined ? updates.title.trim() : existing.title;
    if (!title) {
      throw new Error('عنوان بخش نمی‌تواند خالی باشد.');
    }

    const sectionNum =
      updates.sectionNumber !== undefined ? updates.sectionNumber : existing.section_number;
    const page = updates.page !== undefined ? updates.page : existing.page;

    await db.execute(
      `UPDATE sections SET
        title = ?,
        section_number = ?,
        page = ?,
        updated_at = ?,
        version = version + 1
      WHERE id = ?`,
      [title, sectionNum, page, now, id]
    );

    logger.info(`Updated section ${id}`, 'AcademicTreeService');
  }

  public async deleteSection(id: string): Promise<void> {
    const existing = await this.getSectionById(id);
    if (!existing) return;

    const now = getCurrentUtcIsoString();
    const deviceId = settingsService.getDeviceId();
    const trashId = this.generateId('trash');
    const payload = JSON.stringify(existing);

    await db.execute(
      `UPDATE sections SET
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
      ) VALUES (?, 'sections', ?, ?, ?, ?, 1)`,
      [trashId, id, now, deviceId, payload]
    );

    logger.info(`Soft-deleted section ${id}`, 'AcademicTreeService');
  }

  // ─── Topic Methods ─────────────────────────────────────────────────────────

  /**
   * Topic Foreign Key Rule:
   * topics.chapter_id MUST be NOT NULL (Every topic strictly belongs to a Chapter).
   * topics.section_id is NULLable (A topic can directly belong to a Chapter or be inside a Section).
   */
  public async createTopic(input: CreateTopicInput): Promise<Topic> {
    const trimmedTitle = input.title.trim();
    if (!trimmedTitle) {
      throw new Error('عنوان مبحث نمی‌تواند خالی باشد.');
    }
    if (!input.chapterId) {
      throw new Error('شناسه فصل (chapter_id) برای مبحث الزامی و غیرقابل چشم‌پوشی است.');
    }
    if (!input.subjectId) {
      throw new Error('شناسه درس (subject_id) برای مبحث الزامی است.');
    }

    const id = this.generateId('topic');
    const now = getCurrentUtcIsoString();
    const deviceId = settingsService.getDeviceId();
    const importance = input.importanceLevel || 'medium';

    await db.execute(
      `INSERT INTO topics (
        id, created_at, updated_at, version, device_id, is_deleted, deleted_at,
        subject_id, chapter_id, section_id, title, importance_level, is_completed
      ) VALUES (?, ?, ?, 1, ?, 0, NULL, ?, ?, ?, ?, ?, 0)`,
      [
        id,
        now,
        now,
        deviceId,
        input.subjectId,
        input.chapterId,
        input.sectionId || null,
        trimmedTitle,
        importance,
      ]
    );

    logger.info(`Created topic ${id} ("${trimmedTitle}", chapter=${input.chapterId})`, 'AcademicTreeService');

    return {
      id,
      created_at: now,
      updated_at: now,
      version: 1,
      device_id: deviceId,
      is_deleted: 0,
      deleted_at: null,
      subject_id: input.subjectId,
      chapter_id: input.chapterId,
      section_id: input.sectionId || null,
      title: trimmedTitle,
      importance_level: importance,
      is_completed: 0,
    };
  }

  public async getTopics(filter: {
    chapterId?: string;
    sectionId?: string | null;
    subjectId?: string;
  }): Promise<Topic[]> {
    let sql = 'SELECT * FROM topics WHERE is_deleted = 0';
    const params: unknown[] = [];

    if (filter.subjectId) {
      sql += ' AND subject_id = ?';
      params.push(filter.subjectId);
    }
    if (filter.chapterId) {
      sql += ' AND chapter_id = ?';
      params.push(filter.chapterId);
    }
    if (filter.sectionId !== undefined) {
      if (filter.sectionId === null) {
        sql += ' AND section_id IS NULL';
      } else {
        sql += ' AND section_id = ?';
        params.push(filter.sectionId);
      }
    }

    sql += ' ORDER BY created_at ASC';
    return await db.query<Topic>(sql, params);
  }

  public async getTopicById(id: string): Promise<Topic | null> {
    const rows = await db.query<Topic>(
      'SELECT * FROM topics WHERE id = ? AND is_deleted = 0',
      [id]
    );
    return rows.length > 0 ? rows[0] : null;
  }

  /**
   * Toggles topic completion status between 0 and 1.
   * Increments version and updates updated_at.
   */
  public async toggleTopicCompletion(id: string): Promise<Topic> {
    const existing = await this.getTopicById(id);
    if (!existing) {
      throw new Error(`Topic ${id} not found.`);
    }

    const nextCompleted = existing.is_completed === 1 ? 0 : 1;
    const now = getCurrentUtcIsoString();

    await db.execute(
      `UPDATE topics SET
        is_completed = ?,
        updated_at = ?,
        version = version + 1
      WHERE id = ?`,
      [nextCompleted, now, id]
    );

    logger.info(`Toggled completion for topic ${id} to ${nextCompleted}`, 'AcademicTreeService');

    return {
      ...existing,
      is_completed: nextCompleted,
      updated_at: now,
      version: existing.version + 1,
    };
  }

  public async updateTopic(id: string, updates: UpdateTopicInput): Promise<void> {
    const existing = await this.getTopicById(id);
    if (!existing) {
      throw new Error(`Topic ${id} not found.`);
    }

    const now = getCurrentUtcIsoString();
    const title = updates.title !== undefined ? updates.title.trim() : existing.title;
    if (!title) {
      throw new Error('عنوان مبحث نمی‌تواند خالی باشد.');
    }

    const sectionId = updates.sectionId !== undefined ? updates.sectionId : existing.section_id;
    const importance = updates.importanceLevel !== undefined ? updates.importanceLevel : existing.importance_level;
    const isCompleted = updates.isCompleted !== undefined ? updates.isCompleted : existing.is_completed;

    await db.execute(
      `UPDATE topics SET
        title = ?,
        section_id = ?,
        importance_level = ?,
        is_completed = ?,
        updated_at = ?,
        version = version + 1
      WHERE id = ?`,
      [title, sectionId, importance, isCompleted, now, id]
    );

    logger.info(`Updated topic ${id}`, 'AcademicTreeService');
  }

  public async deleteTopic(id: string): Promise<void> {
    const existing = await this.getTopicById(id);
    if (!existing) return;

    const now = getCurrentUtcIsoString();
    const deviceId = settingsService.getDeviceId();
    const trashId = this.generateId('trash');
    const payload = JSON.stringify(existing);

    await db.execute(
      `UPDATE topics SET
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
      ) VALUES (?, 'topics', ?, ?, ?, ?, 1)`,
      [trashId, id, now, deviceId, payload]
    );

    logger.info(`Soft-deleted topic ${id}`, 'AcademicTreeService');
  }

  // ─── Hierarchy & Tree Query ────────────────────────────────────────────────

  /**
   * Builds and returns the entire academic tree:
   * Institution ➔ Subject ➔ Book ➔ Chapter ➔ Sections & Direct Topics ➔ Topics
   */
  public async getFullAcademicTree(institutionId?: string): Promise<InstitutionNode[]> {
    let instSql = 'SELECT * FROM institutions WHERE is_deleted = 0';
    const instParams: unknown[] = [];
    if (institutionId) {
      instSql += ' AND id = ?';
      instParams.push(institutionId);
    }
    instSql += ' ORDER BY created_at DESC';

    const institutions = await db.query<Institution>(instSql, instParams);
    const tree: InstitutionNode[] = [];

    for (const inst of institutions) {
      const subjects = await db.query<Subject>(
        'SELECT * FROM subjects WHERE institution_id = ? AND is_deleted = 0 ORDER BY created_at DESC',
        [inst.id]
      );

      const subjectNodes: SubjectNode[] = [];

      for (const subj of subjects) {
        const books = await db.query<Book>(
          'SELECT * FROM books WHERE subject_id = ? AND is_deleted = 0 ORDER BY created_at DESC',
          [subj.id]
        );

        const bookNodes: BookNode[] = [];

        for (const book of books) {
          const chapters = await db.query<Chapter>(
            'SELECT * FROM chapters WHERE book_id = ? AND is_deleted = 0 ORDER BY chapter_number ASC',
            [book.id]
          );

          const chapterNodes: ChapterNode[] = [];

          for (const chap of chapters) {
            const sections = await db.query<Section>(
              'SELECT * FROM sections WHERE chapter_id = ? AND is_deleted = 0 ORDER BY created_at ASC',
              [chap.id]
            );

            // Fetch direct topics under this chapter (section_id IS NULL)
            const directTopics = await db.query<Topic>(
              'SELECT * FROM topics WHERE chapter_id = ? AND section_id IS NULL AND is_deleted = 0 ORDER BY created_at ASC',
              [chap.id]
            );

            const sectionNodes: SectionNode[] = [];

            for (const sec of sections) {
              const secTopics = await db.query<Topic>(
                'SELECT * FROM topics WHERE section_id = ? AND is_deleted = 0 ORDER BY created_at ASC',
                [sec.id]
              );
              sec.topic_count = secTopics.length;
              sec.completed_topic_count = secTopics.filter((t) => t.is_completed === 1).length;

              sectionNodes.push({
                ...sec,
                topics: secTopics,
              });
            }

            const allChapTopicsCount =
              directTopics.length +
              sectionNodes.reduce((acc, s) => acc + (s.topic_count ?? 0), 0);
            const allChapCompletedCount =
              directTopics.filter((t) => t.is_completed === 1).length +
              sectionNodes.reduce((acc, s) => acc + (s.completed_topic_count ?? 0), 0);

            chap.section_count = sections.length;
            chap.topic_count = allChapTopicsCount;
            chap.completed_topic_count = allChapCompletedCount;

            chapterNodes.push({
              ...chap,
              sections: sectionNodes,
              directTopics,
            });
          }

          const bookTopicsTotal = chapterNodes.reduce((acc, c) => acc + (c.topic_count ?? 0), 0);
          const bookTopicsCompleted = chapterNodes.reduce(
            (acc, c) => acc + (c.completed_topic_count ?? 0),
            0
          );

          book.chapter_count = chapters.length;
          book.topic_count = bookTopicsTotal;
          book.completed_topic_count = bookTopicsCompleted;
          const totalP = book.total_pages ?? 0;
          const readP = book.read_pages ?? 0;
          book.progress_percent = totalP > 0 ? Math.min(100, Math.round((readP / totalP) * 100)) : 0;

          bookNodes.push({
            ...book,
            chapters: chapterNodes,
          });
        }

        subj.book_count = books.length;
        subj.topic_count = bookNodes.reduce((acc, b) => acc + (b.topic_count ?? 0), 0);
        subj.completed_topic_count = bookNodes.reduce(
          (acc, b) => acc + (b.completed_topic_count ?? 0),
          0
        );

        subjectNodes.push({
          ...subj,
          books: bookNodes,
        });
      }

      inst.subject_count = subjects.length;
      tree.push({
        ...inst,
        subjects: subjectNodes,
      });
    }

    return tree;
  }

  /**
   * Aggregates global statistics for the Academic workspace header.
   */
  public async getAcademicStats(): Promise<AcademicStats> {
    const [instRows, subjRows, bookRows, chapRows, topicRows] = await Promise.all([
      db.query<{ count: number }>('SELECT COUNT(*) as count FROM institutions WHERE is_deleted = 0'),
      db.query<{ count: number }>('SELECT COUNT(*) as count FROM subjects WHERE is_deleted = 0'),
      db.query<{ total_p: number | null; read_p: number | null; count: number }>(
        'SELECT COUNT(*) as count, SUM(total_pages) as total_p, SUM(read_pages) as read_p FROM books WHERE is_deleted = 0'
      ),
      db.query<{ count: number }>('SELECT COUNT(*) as count FROM chapters WHERE is_deleted = 0'),
      db.query<{ is_completed: number; count: number }>(
        'SELECT is_completed, COUNT(*) as count FROM topics WHERE is_deleted = 0 GROUP BY is_completed'
      ),
    ]);

    const institutionCount = instRows[0]?.count ?? 0;
    const subjectCount = subjRows[0]?.count ?? 0;
    const bookCount = bookRows[0]?.count ?? 0;
    const totalPages = Number(bookRows[0]?.total_p ?? 0);
    const readPages = Number(bookRows[0]?.read_p ?? 0);
    const chapterCount = chapRows[0]?.count ?? 0;

    let topicCount = 0;
    let completedTopicCount = 0;
    for (const t of topicRows) {
      const c = Number(t.count);
      topicCount += c;
      if (Number(t.is_completed) === 1) completedTopicCount += c;
    }

    // Overall progress is based on total read pages vs total pages across books
    // and/or topics completion
    const overallProgressPercent =
      totalPages > 0
        ? Math.min(100, Math.round((readPages / totalPages) * 100))
        : topicCount > 0
          ? Math.min(100, Math.round((completedTopicCount / topicCount) * 100))
          : 0;

    return {
      institutionCount,
      subjectCount,
      bookCount,
      chapterCount,
      topicCount,
      completedTopicCount,
      overallProgressPercent,
      totalPages,
      readPages,
    };
  }
}

export const academicTreeService = new AcademicTreeService();
