import { describe, it, expect, beforeAll } from 'vitest';
import { db } from '../src/db/client';
import { institutionService } from '../src/services/institutionService';
import { subjectService } from '../src/services/subjectService';
import { bookService } from '../src/services/bookService';
import { academicTreeService } from '../src/services/academicTreeService';
import { isValidUtcIso } from '../src/lib/date/utc';

describe('Phase 04: Academic Engine — Institutions, Subjects, Books & Hierarchy', () => {
  beforeAll(async () => {
    // Clean all academic tables before running the test suite
    await db.execute('DELETE FROM topics');
    await db.execute('DELETE FROM sections');
    await db.execute('DELETE FROM chapters');
    await db.execute('DELETE FROM books');
    await db.execute('DELETE FROM subjects');
    await db.execute('DELETE FROM institutions');
    await db.execute("DELETE FROM trash WHERE entity_type IN ('institutions', 'subjects', 'books', 'chapters', 'sections', 'topics')");
  });

  // ─── 1. Institution CRUD & Metadata ───────────────────────────────────────

  it('should create an institution with universal metadata and UTC ISO-8601 timestamps', async () => {
    const inst = await institutionService.createInstitution({
      name: 'دانشگاه صنعتی شریف',
      type: 'university',
      degreeOrProgram: 'کارشناسی مهندسی کامپیوتر',
      currentTerm: 'نیمسال اول ۱۴۰۴-۱۴۰۵',
    });

    expect(inst.id).toMatch(/^inst_\d+_[a-z0-9]{6}$/);
    expect(inst.name).toBe('دانشگاه صنعتی شریف');
    expect(inst.type).toBe('university');
    expect(inst.degree_or_program).toBe('کارشناسی مهندسی کامپیوتر');
    expect(inst.current_term).toBe('نیمسال اول ۱۴۰۴-۱۴۰۵');
    expect(inst.version).toBe(1);
    expect(inst.is_deleted).toBe(0);
    expect(inst.deleted_at).toBeNull();
    expect(isValidUtcIso(inst.created_at)).toBe(true);
    expect(isValidUtcIso(inst.updated_at)).toBe(true);
    expect(inst.device_id).toBeDefined();
    expect(inst.profile_id).toBeDefined();
  });

  it('should reject creating an institution with empty or whitespace name', async () => {
    await expect(
      institutionService.createInstitution({ name: '   ' })
    ).rejects.toThrow('نام نهاد آموزشی نمی‌تواند خالی باشد.');
  });

  it('should retrieve, update, and soft-delete an institution with trash snapshot', async () => {
    const inst = await institutionService.createInstitution({
      name: 'دانشکده فنی موقت',
      type: 'institute',
    });

    // Update
    await institutionService.updateInstitution(inst.id, {
      name: 'دانشکده فنی نهایی',
      currentTerm: 'ترم تابستان',
    });

    const updated = await institutionService.getInstitutionById(inst.id);
    expect(updated).not.toBeNull();
    expect(updated!.name).toBe('دانشکده فنی نهایی');
    expect(updated!.current_term).toBe('ترم تابستان');
    expect(updated!.version).toBe(2);

    // Soft delete
    await institutionService.deleteInstitution(inst.id);

    const deleted = await institutionService.getInstitutionById(inst.id);
    expect(deleted).toBeNull();

    // Verify trash snapshot
    const trash = await db.query<{ entity_type: string; entity_id: string; payload: string; can_restore: number }>(
      "SELECT * FROM trash WHERE entity_id = ? AND entity_type = 'institutions'",
      [inst.id]
    );
    expect(trash.length).toBe(1);
    expect(trash[0].can_restore).toBe(1);
    const snap = JSON.parse(trash[0].payload);
    expect(snap.name).toBe('دانشکده فنی نهایی');
  });

  // ─── 2. Subject CRUD & Metadata ───────────────────────────────────────────

  it('should create a subject linked to an institution with universal metadata', async () => {
    const inst = await institutionService.createInstitution({ name: 'دانشگاه تهران' });

    const subject = await subjectService.createSubject({
      institutionId: inst.id,
      name: 'ریاضی مهندسی',
      code: 'MATH-201',
      credits: 3.0,
      instructor: 'دکتر محمدی',
      color: '#0078d4',
    });

    expect(subject.id).toMatch(/^subj_\d+_[a-z0-9]{6}$/);
    expect(subject.name).toBe('ریاضی مهندسی');
    expect(subject.institution_id).toBe(inst.id);
    expect(subject.code).toBe('MATH-201');
    expect(subject.credits).toBe(3.0);
    expect(subject.instructor).toBe('دکتر محمدی');
    expect(subject.color).toBe('#0078d4');
    expect(subject.version).toBe(1);
    expect(isValidUtcIso(subject.created_at)).toBe(true);
  });

  it('should reject creating a subject without institution_id or with empty name', async () => {
    await expect(
      subjectService.createSubject({ institutionId: '', name: 'مدارهای منطقی' })
    ).rejects.toThrow();

    await expect(
      subjectService.createSubject({ institutionId: 'inst_123', name: '   ' })
    ).rejects.toThrow('نام درس نمی‌تواند خالی باشد.');
  });

  it('should soft-delete a subject and write audit snapshot to trash', async () => {
    const inst = await institutionService.createInstitution({ name: 'دانشگاه امیرکبیر' });
    const subj = await subjectService.createSubject({
      institutionId: inst.id,
      name: 'فیزیک پایه ۲',
    });

    await subjectService.deleteSubject(subj.id);

    const check = await subjectService.getSubjectById(subj.id);
    expect(check).toBeNull();

    const trash = await db.query<{ entity_type: string; payload: string }>(
      "SELECT * FROM trash WHERE entity_id = ? AND entity_type = 'subjects'",
      [subj.id]
    );
    expect(trash.length).toBe(1);
    const snap = JSON.parse(trash[0].payload);
    expect(snap.title || snap.name).toBe('فیزیک پایه ۲');
  });

  // ─── 3. Book CRUD, Progress Tracking & Inline Updates ─────────────────────

  it('should create a book with total_pages, read_pages, and calculate progress', async () => {
    const inst = await institutionService.createInstitution({ name: 'دانشگاه علم و صنعت' });
    const subj = await subjectService.createSubject({ institutionId: inst.id, name: 'معماری کامپیوتر' });

    const book = await bookService.createBook({
      subjectId: subj.id,
      title: 'طراحی مدار و ساختار کامپیوتر پترسون و هنسی',
      authors: 'دیوید پترسون، جان هنسی',
      edition: 'ویرایش ۵',
      totalPages: 500,
      readPages: 150,
      link: 'https://example.com/books/paterson.pdf',
    });

    expect(book.id).toMatch(/^book_\d+_[a-z0-9]{6}$/);
    expect(book.title).toBe('طراحی مدار و ساختار کامپیوتر پترسون و هنسی');
    expect(book.subject_id).toBe(subj.id);
    expect(book.total_pages).toBe(500);
    expect(book.read_pages).toBe(150);
    expect(book.link).toBe('https://example.com/books/paterson.pdf');
    expect(book.progress_percent).toBe(30); // 150 / 500 = 30%
    expect(isValidUtcIso(book.created_at)).toBe(true);
  });

  it('should compute 0% progress when total_pages is 0 or null', async () => {
    const book = await bookService.createBook({
      title: 'جزوه دست‌نویس بدون شماره صفحه',
      totalPages: null,
      readPages: 0,
    });

    expect(book.progress_percent).toBe(0);
  });

  it('should update reading progress inline via updateReadingProgress with bounds clamping', async () => {
    const book = await bookService.createBook({
      title: 'سیستم‌های عامل سیلبرشاتس',
      totalPages: 800,
      readPages: 100,
    });

    // Valid progress advance
    const updated1 = await bookService.updateReadingProgress(book.id, 240);
    expect(updated1).toBe(240);

    const check1 = await bookService.getBookById(book.id);
    expect(check1!.read_pages).toBe(240);
    expect(check1!.progress_percent).toBe(30); // 240 / 800 = 30%

    // Clamping: exceeding total_pages must cap at total_pages
    const updated2 = await bookService.updateReadingProgress(book.id, 9999);
    expect(updated2).toBe(800);

    const check2 = await bookService.getBookById(book.id);
    expect(check2!.read_pages).toBe(800);
    expect(check2!.progress_percent).toBe(100);

    // Clamping: negative numbers must clamp to 0
    const updated3 = await bookService.updateReadingProgress(book.id, -50);
    expect(updated3).toBe(0);
  });

  it('should soft-delete a book and write audit snapshot to trash', async () => {
    const book = await bookService.createBook({ title: 'کتاب آزمایشی برای حذف' });
    await bookService.deleteBook(book.id);

    const check = await bookService.getBookById(book.id);
    expect(check).toBeNull();

    const trash = await db.query<{ entity_type: string; payload: string }>(
      "SELECT * FROM trash WHERE entity_id = ? AND entity_type = 'books'",
      [book.id]
    );
    expect(trash.length).toBe(1);
    const snap = JSON.parse(trash[0].payload);
    expect(snap.title).toBe('کتاب آزمایشی برای حذف');
  });

  // ─── 4. Chapters, Sections, Topics & Strict Hierarchy Rules ───────────────

  it('should create a chapter linked to a book with page boundaries', async () => {
    const book = await bookService.createBook({ title: 'کتاب مرجع یادگیری ماشین' });

    const chap = await academicTreeService.createChapter({
      bookId: book.id,
      chapterNumber: 1,
      title: 'مقدمه‌ای بر یادگیری با نظارت',
      startPage: 1,
      endPage: 45,
    });

    expect(chap.id).toMatch(/^chap_\d+_[a-z0-9]{6}$/);
    expect(chap.book_id).toBe(book.id);
    expect(chap.chapter_number).toBe(1);
    expect(chap.title).toBe('مقدمه‌ای بر یادگیری با نظارت');
    expect(chap.start_page).toBe(1);
    expect(chap.end_page).toBe(45);
    expect(isValidUtcIso(chap.created_at)).toBe(true);
  });

  it('should create a section linked to a chapter', async () => {
    const book = await bookService.createBook({ title: 'کتاب شبکه‌های کامپیوتری' });
    const chap = await academicTreeService.createChapter({ bookId: book.id, title: 'لایه انتقال' });

    const sec = await academicTreeService.createSection({
      chapterId: chap.id,
      sectionNumber: '3-1',
      title: 'پروتکل TCP و برقراری ارتباط 3-Way Handshake',
      page: 180,
    });

    expect(sec.id).toMatch(/^sec_\d+_[a-z0-9]{6}$/);
    expect(sec.chapter_id).toBe(chap.id);
    expect(sec.section_number).toBe('3-1');
    expect(sec.title).toBe('پروتکل TCP و برقراری ارتباط 3-Way Handshake');
    expect(sec.page).toBe(180);
    expect(isValidUtcIso(sec.created_at)).toBe(true);
  });

  it('should create a topic strictly with chapter_id and optional section_id (direct chapter topic)', async () => {
    const inst = await institutionService.createInstitution({ name: 'دانشگاه خواجه نصیر' });
    const subj = await subjectService.createSubject({ institutionId: inst.id, name: 'سیگنال‌ها و سیستم‌ها' });
    const book = await bookService.createBook({ subjectId: subj.id, title: 'سیگنال‌ها و سیستم‌های اوپنهام' });
    const chap = await academicTreeService.createChapter({ bookId: book.id, title: 'تبدیل فوریه زمان پیوسته' });

    // Topic directly under Chapter (section_id is null)
    const directTopic = await academicTreeService.createTopic({
      subjectId: subj.id,
      chapterId: chap.id,
      sectionId: null,
      title: 'ویژگی تقارن و دوگانی در تبدیل فوریه',
      importanceLevel: 'high',
    });

    expect(directTopic.id).toMatch(/^topic_\d+_[a-z0-9]{6}$/);
    expect(directTopic.chapter_id).toBe(chap.id);
    expect(directTopic.section_id).toBeNull();
    expect(directTopic.title).toBe('ویژگی تقارن و دوگانی در تبدیل فوریه');
    expect(directTopic.importance_level).toBe('high');
    expect(directTopic.is_completed).toBe(0);
    expect(isValidUtcIso(directTopic.created_at)).toBe(true);
  });

  it('should create a topic inside a section', async () => {
    const inst = await institutionService.createInstitution({ name: 'دانشگاه بهشتی' });
    const subj = await subjectService.createSubject({ institutionId: inst.id, name: 'هوش مصنوعی' });
    const book = await bookService.createBook({ subjectId: subj.id, title: 'هوش مصنوعی مدرن' });
    const chap = await academicTreeService.createChapter({ bookId: book.id, title: 'الگوریتم‌های جستجو' });
    const sec = await academicTreeService.createSection({ chapterId: chap.id, title: 'جستجوهای آگاهانه' });

    // Topic inside Section
    const sectionTopic = await academicTreeService.createTopic({
      subjectId: subj.id,
      chapterId: chap.id,
      sectionId: sec.id,
      title: 'الگوریتم A* و شرط پذیرش تابع هیوریستیک (Admissible)',
      importanceLevel: 'critical',
    });

    expect(sectionTopic.chapter_id).toBe(chap.id);
    expect(sectionTopic.section_id).toBe(sec.id);
    expect(sectionTopic.importance_level).toBe('critical');
    expect(sectionTopic.is_completed).toBe(0);
  });

  it('should strictly reject creating a topic without chapter_id or without subject_id', async () => {
    // Missing chapter_id
    await expect(
      academicTreeService.createTopic({
        subjectId: 'subj_123',
        chapterId: '',
        title: 'مبحث نامعتبر بدون فصل',
      })
    ).rejects.toThrow('شناسه فصل (chapter_id) برای مبحث الزامی و غیرقابل چشم‌پوشی است.');

    // Missing subject_id
    await expect(
      academicTreeService.createTopic({
        subjectId: '',
        chapterId: 'chap_123',
        title: 'مبحث نامعتبر بدون درس',
      })
    ).rejects.toThrow('شناسه درس (subject_id) برای مبحث الزامی است.');
  });

  // ─── 5. Topic Completion Toggling ─────────────────────────────────────────

  it('should toggle topic is_completed status between 0 and 1, incrementing version', async () => {
    const inst = await institutionService.createInstitution({ name: 'دانشگاه صنعتی اصفهان' });
    const subj = await subjectService.createSubject({ institutionId: inst.id, name: 'الگوریتم‌ها' });
    const book = await bookService.createBook({ subjectId: subj.id, title: 'مقدمه‌ای بر الگوریتم‌ها CLRS' });
    const chap = await academicTreeService.createChapter({ bookId: book.id, title: 'برنامه‌نویسی پویا' });
    const topic = await academicTreeService.createTopic({
      subjectId: subj.id,
      chapterId: chap.id,
      title: 'مسئله کوله‌پشتی 0/1',
    });

    expect(topic.is_completed).toBe(0);
    expect(topic.version).toBe(1);

    // Toggle 0 ➔ 1
    const toggled1 = await academicTreeService.toggleTopicCompletion(topic.id);
    expect(toggled1.is_completed).toBe(1);
    expect(toggled1.version).toBe(2);
    expect(isValidUtcIso(toggled1.updated_at)).toBe(true);

    // Toggle 1 ➔ 0
    const toggled2 = await academicTreeService.toggleTopicCompletion(topic.id);
    expect(toggled2.is_completed).toBe(0);
    expect(toggled2.version).toBe(3);
  });

  // ─── 6. Soft Delete for Chapter, Section, Topic ───────────────────────────

  it('should soft-delete chapter, section, and topic writing snapshots to trash', async () => {
    const book = await bookService.createBook({ title: 'کتاب تست حذف چندسطحی' });
    const chap = await academicTreeService.createChapter({ bookId: book.id, title: 'فصل حذفی' });
    const sec = await academicTreeService.createSection({ chapterId: chap.id, title: 'بخش حذفی' });
    const topic = await academicTreeService.createTopic({
      subjectId: 'subj_test',
      chapterId: chap.id,
      sectionId: sec.id,
      title: 'مبحث حذفی',
    });

    // Delete topic
    await academicTreeService.deleteTopic(topic.id);
    expect(await academicTreeService.getTopicById(topic.id)).toBeNull();

    // Delete section
    await academicTreeService.deleteSection(sec.id);
    expect(await academicTreeService.getSectionById(sec.id)).toBeNull();

    // Delete chapter
    await academicTreeService.deleteChapter(chap.id);
    expect(await academicTreeService.getChapterById(chap.id)).toBeNull();

    // Verify all 3 snapshots in trash
    const trashRecords = await db.query<{ entity_type: string; entity_id: string }>(
      "SELECT entity_type, entity_id FROM trash WHERE entity_id IN (?, ?, ?)",
      [topic.id, sec.id, chap.id]
    );
    expect(trashRecords.length).toBe(3);
    const types = trashRecords.map((r) => r.entity_type);
    expect(types).toContain('topics');
    expect(types).toContain('sections');
    expect(types).toContain('chapters');
  });

  // ─── 7. Full Hierarchical Academic Tree Query ─────────────────────────────

  it('should assemble complete hierarchical tree: Institution ➔ Subject ➔ Book ➔ Chapter ➔ Section ➔ Topic', async () => {
    const inst = await institutionService.createInstitution({ name: 'دانشگاه جامع فردوسی مشهد' });
    const subj = await subjectService.createSubject({ institutionId: inst.id, name: 'پایگاه داده‌ها' });
    const book = await bookService.createBook({
      subjectId: subj.id,
      title: 'مفاهیم سیستم‌های پایگاه داده دیت',
      totalPages: 400,
      readPages: 100,
    });
    const chap = await academicTreeService.createChapter({ bookId: book.id, title: 'نرمال‌سازی و وابستگی‌های تابعی' });
    const sec = await academicTreeService.createSection({ chapterId: chap.id, title: 'فرم نرمال BCNF' });

    // One direct topic
    await academicTreeService.createTopic({
      subjectId: subj.id,
      chapterId: chap.id,
      sectionId: null,
      title: 'مبحث مستقیم فرم 3NF',
    });

    // One topic in section
    await academicTreeService.createTopic({
      subjectId: subj.id,
      chapterId: chap.id,
      sectionId: sec.id,
      title: 'مبحث در بخش تست نقض BCNF',
    });

    const fullTree = await academicTreeService.getFullAcademicTree(inst.id);
    expect(fullTree.length).toBe(1);

    const instNode = fullTree[0];
    expect(instNode.name).toBe('دانشگاه جامع فردوسی مشهد');
    expect(instNode.subjects.length).toBe(1);

    const subjNode = instNode.subjects[0];
    expect(subjNode.name).toBe('پایگاه داده‌ها');
    expect(subjNode.books.length).toBe(1);

    const bookNode = subjNode.books[0];
    expect(bookNode.title).toBe('مفاهیم سیستم‌های پایگاه داده دیت');
    expect(bookNode.chapters.length).toBe(1);

    const chapNode = bookNode.chapters[0];
    expect(chapNode.title).toBe('نرمال‌سازی و وابستگی‌های تابعی');
    expect(chapNode.directTopics.length).toBe(1);
    expect(chapNode.directTopics[0].title).toBe('مبحث مستقیم فرم 3NF');
    expect(chapNode.sections.length).toBe(1);

    const secNode = chapNode.sections[0];
    expect(secNode.title).toBe('فرم نرمال BCNF');
    expect(secNode.topics.length).toBe(1);
    expect(secNode.topics[0].title).toBe('مبحث در بخش تست نقض BCNF');
  });

  // ─── 8. Academic Statistics Aggregation ───────────────────────────────────

  it('should compute global academic stats accurately', async () => {
    const stats = await academicTreeService.getAcademicStats();

    expect(stats.institutionCount).toBeGreaterThanOrEqual(1);
    expect(stats.subjectCount).toBeGreaterThanOrEqual(1);
    expect(stats.bookCount).toBeGreaterThanOrEqual(1);
    expect(stats.overallProgressPercent).toBeGreaterThanOrEqual(0);
    expect(stats.overallProgressPercent).toBeLessThanOrEqual(100);
  });
});
