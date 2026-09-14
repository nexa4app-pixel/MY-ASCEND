import React, { useState, useEffect, useCallback } from 'react';
import {
  School,
  BookOpen,
  Book as BookIcon,
  Plus,
  RefreshCw,
  FolderTree,
  Library,
  GraduationCap,
  Edit3,
  Trash2,
  Brain,
  Activity,
} from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { Card } from '../components/Card';
import { Badge } from '../components/Badge';
import { Button } from '../components/Button';
import { TableSkeleton } from '../components/Skeleton';
import { InstitutionModal } from '../components/InstitutionModal';
import { SubjectModal } from '../components/SubjectModal';
import { BookModal } from '../components/BookModal';
import { TreeItemModal, TreeItemType } from '../components/TreeItemModal';
import { BookProgressCard } from '../components/BookProgressCard';
import { AcademicTreeViewer } from '../components/AcademicTreeViewer';
import { LogSessionModal } from '../components/LogSessionModal';
import { SpacedRepetitionQueue } from '../components/SpacedRepetitionQueue';
import {
  academicTreeService,
  InstitutionNode,
  AcademicStats,
} from '../services/academicTreeService';
import { institutionService } from '../services/institutionService';
import { subjectService } from '../services/subjectService';
import { bookService } from '../services/bookService';
import { learningService } from '../services/learningService';
import { masteryService } from '../services/masteryService';
import {
  Institution,
  Subject,
  Book,
  Chapter,
  Section,
  Topic,
  LearningSession,
  MasteryRecord,
  MasteryTier,
} from '../types/database';

type AcademicTab = 'tree' | 'books' | 'institutions' | 'learning';


export const AcademicPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<AcademicTab>('tree');
  const [tree, setTree] = useState<InstitutionNode[]>([]);
  const [books, setBooks] = useState<Book[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [stats, setStats] = useState<AcademicStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Institution Modal
  const [isInstModalOpen, setIsInstModalOpen] = useState(false);
  const [instToEdit, setInstToEdit] = useState<Institution | null>(null);

  // Subject Modal
  const [isSubjModalOpen, setIsSubjModalOpen] = useState(false);
  const [subjToEdit, setSubjToEdit] = useState<Subject | null>(null);
  const [defaultInstId, setDefaultInstId] = useState<string | null>(null);

  // Book Modal
  const [isBookModalOpen, setIsBookModalOpen] = useState(false);
  const [bookToEdit, setBookToEdit] = useState<Book | null>(null);
  const [defaultSubjId, setDefaultSubjId] = useState<string | null>(null);

  // Tree Item Modal (Chapter, Section, Topic)
  const [isTreeItemModalOpen, setIsTreeItemModalOpen] = useState(false);
  const [treeItemType, setTreeItemType] = useState<TreeItemType>('chapter');
  const [treeItemToEdit, setTreeItemToEdit] = useState<Chapter | Section | Topic | null>(null);
  const [treeItemContext, setTreeItemContext] = useState<{
    bookId?: string;
    chapterId?: string;
    sectionId?: string | null;
    subjectId?: string;
  }>({});

  // Phase 05 — Learning & Mastery State
  const [recentSessions, setRecentSessions] = useState<LearningSession[]>([]);
  const [masteryRecords, setMasteryRecords] = useState<MasteryRecord[]>([]);
  const [isLogSessionOpen, setIsLogSessionOpen] = useState(false);
  const [logSessionTopic, setLogSessionTopic] = useState<Topic | null>(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [treeData, allBooks, allSubjects, allInsts, statData, sessions, mastery] = await Promise.all([
        academicTreeService.getFullAcademicTree(),
        bookService.getBooks(),
        subjectService.getSubjects(),
        institutionService.getInstitutions(),
        academicTreeService.getAcademicStats(),
        learningService.getRecentSessions(20),
        masteryService.getAllMasteryRecords(),
      ]);

      setTree(treeData);
      setBooks(allBooks);
      setSubjects(allSubjects);
      setInstitutions(allInsts);
      setStats(statData);
      setRecentSessions(sessions);
      setMasteryRecords(mastery);
    } catch (err) {
      console.error('Failed to load academic data:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handlers for TreeItem Creation
  const handleOpenAddSubject = (inst: Institution) => {
    setSubjToEdit(null);
    setDefaultInstId(inst.id);
    setIsSubjModalOpen(true);
  };

  const handleOpenAddBook = (subj: Subject) => {
    setBookToEdit(null);
    setDefaultSubjId(subj.id);
    setIsBookModalOpen(true);
  };

  const handleOpenAddChapter = (book: Book) => {
    setTreeItemType('chapter');
    setTreeItemToEdit(null);
    setTreeItemContext({ bookId: book.id });
    setIsTreeItemModalOpen(true);
  };

  const handleOpenAddSection = (chap: Chapter) => {
    setTreeItemType('section');
    setTreeItemToEdit(null);
    setTreeItemContext({ chapterId: chap.id });
    setIsTreeItemModalOpen(true);
  };

  const handleOpenAddTopic = (params: {
    subjectId: string;
    chapterId: string;
    sectionId?: string | null;
  }) => {
    setTreeItemType('topic');
    setTreeItemToEdit(null);
    setTreeItemContext(params);
    setIsTreeItemModalOpen(true);
  };

  // Handlers for Editing
  const handleOpenEditInst = (inst: Institution) => {
    setInstToEdit(inst);
    setIsInstModalOpen(true);
  };

  const handleOpenEditSubj = (subj: Subject) => {
    setSubjToEdit(subj);
    setIsSubjModalOpen(true);
  };

  const handleOpenEditBook = (book: Book) => {
    setBookToEdit(book);
    setIsBookModalOpen(true);
  };

  const handleOpenEditChapter = (chap: Chapter) => {
    setTreeItemType('chapter');
    setTreeItemToEdit(chap);
    setIsTreeItemModalOpen(true);
  };

  const handleOpenEditSection = (sec: Section) => {
    setTreeItemType('section');
    setTreeItemToEdit(sec);
    setIsTreeItemModalOpen(true);
  };

  const handleOpenEditTopic = (top: Topic) => {
    setTreeItemType('topic');
    setTreeItemToEdit(top);
    setIsTreeItemModalOpen(true);
  };

  // Soft Delete Dispatcher
  const handleDeleteItem = async (type: string, id: string, name: string) => {
    if (!window.confirm(`آیا از انتقال «${name}» به زباله‌دان اطمینان دارید؟`)) {
      return;
    }

    try {
      switch (type) {
        case 'institutions':
          await institutionService.deleteInstitution(id);
          break;
        case 'subjects':
          await subjectService.deleteSubject(id);
          break;
        case 'books':
          await bookService.deleteBook(id);
          break;
        case 'chapters':
          await academicTreeService.deleteChapter(id);
          break;
        case 'sections':
          await academicTreeService.deleteSection(id);
          break;
        case 'topics':
          await academicTreeService.deleteTopic(id);
          break;
      }
      loadData();
    } catch (err) {
      console.error(`Failed to delete ${type}:`, err);
    }
  };

  // Map for fast subject lookups by book
  const subjectMap = new Map(subjects.map((s) => [s.id, s]));

  // Phase 05 — Open session log modal from topic node
  const handleOpenLogSession = (topic: Topic) => {
    setLogSessionTopic(topic);
    setIsLogSessionOpen(true);
  };

  // Mastery distribution stats derived from masteryRecords
  const masteryDist: Record<MasteryTier, number> = {
    unstudied: 0,
    novice: 0,
    competent: 0,
    proficient: 0,
    mastered: 0,
  };
  for (const r of masteryRecords) {
    masteryDist[r.tier as MasteryTier] = (masteryDist[r.tier as MasteryTier] ?? 0) + 1;
  }
  const totalMasteryRecords = masteryRecords.length || 1;

  return (
    <div className="max-w-6xl mx-auto space-y-5 select-none">
      {/* Page Header */}
      <PageHeader
        title="مرکز آکادمیک و مدیریت یادگیری"
        description="مدیریت سلسله‌مراتبی دانشگاه‌ها، دروس، کتب مرجع، سرفصل‌ها و رهگیری مطالعه"
        badge={<Badge variant="accent" size="md">Phase 05 Active</Badge>}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              icon={<School className="w-3.5 h-3.5" />}
              onClick={() => {
                setInstToEdit(null);
                setIsInstModalOpen(true);
              }}
            >
              + نهاد آموزشی
            </Button>
            <Button
              variant="secondary"
              size="sm"
              icon={<BookOpen className="w-3.5 h-3.5" />}
              onClick={() => {
                setSubjToEdit(null);
                setDefaultInstId(null);
                setIsSubjModalOpen(true);
              }}
            >
              + درس جدید
            </Button>
            <Button
              variant="primary"
              size="sm"
              icon={<BookIcon className="w-3.5 h-3.5" />}
              onClick={() => {
                setBookToEdit(null);
                setDefaultSubjId(null);
                setIsBookModalOpen(true);
              }}
            >
              + کتاب مرجع
            </Button>
          </div>
        }
      />

      {/* Academic Stats Header Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <Card variant="acrylic" className="p-3 text-center">
          <span className="text-[11px] text-[#8a8a8a]">نهادهای آموزشی</span>
          <div className="text-xl font-bold text-[#1f1f1f] dark:text-white mt-1 font-mono">
            {stats?.institutionCount ?? 0}
          </div>
        </Card>

        <Card variant="acrylic" className="p-3 text-center">
          <span className="text-[11px] text-[#8a8a8a]">دروس ثبت‌شده</span>
          <div className="text-xl font-bold text-[#0078d4] dark:text-[#60a5fa] mt-1 font-mono">
            {stats?.subjectCount ?? 0}
          </div>
        </Card>

        <Card variant="acrylic" className="p-3 text-center">
          <span className="text-[11px] text-[#8a8a8a]">کتب و منابع</span>
          <div className="text-xl font-bold text-purple-600 dark:text-purple-400 mt-1 font-mono">
            {stats?.bookCount ?? 0}
          </div>
        </Card>

        <Card variant="acrylic" className="p-3 text-center">
          <span className="text-[11px] text-[#8a8a8a]">مباحث مطالعه‌شده</span>
          <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-1 font-mono">
            {stats?.completedTopicCount ?? 0} / {stats?.topicCount ?? 0}
          </div>
        </Card>

        <Card variant="acrylic" className="p-3 text-center col-span-2 sm:col-span-1">
          <span className="text-[11px] text-[#8a8a8a]">پیشرفت کل مطالعه</span>
          <div className="text-xl font-bold text-emerald-500 mt-1 font-mono">
            {stats?.overallProgressPercent ?? 0}٪
          </div>
        </Card>
      </div>

      {/* Navigation Tabs Bar */}
      <Card variant="acrylic" className="p-2 flex items-center justify-between gap-3">
        <div className="flex items-center gap-1 overflow-x-auto text-xs font-medium">
          {[
            { id: 'tree', label: 'درخت سلسله‌مراتب سرفصل‌ها', icon: FolderTree },
            { id: 'books', label: 'کتب و پیشرفت مطالعه', icon: Library, badge: books.length },
            { id: 'institutions', label: 'دانشگاه‌ها و دروس', icon: GraduationCap, badge: institutions.length },
            { id: 'learning', label: 'یادگیری فعال و مرور فاصله‌دار', icon: Brain, badge: recentSessions.length },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as AcademicTab)}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-md transition-all whitespace-nowrap ${
                  isActive
                    ? 'bg-white dark:bg-[#333] text-[#0078d4] dark:text-[#60a5fa] font-bold shadow-sm'
                    : 'text-[#616161] dark:text-[#adadad] hover:text-black dark:hover:text-white'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
                {tab.badge !== undefined && tab.badge > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-black/10 dark:bg-white/10 font-mono">
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <Button variant="subtle" size="sm" onClick={loadData} aria-label="بروزرسانی اطلاعات">
          <RefreshCw className="w-3.5 h-3.5" />
        </Button>
      </Card>

      {/* Main Tab Content */}
      {isLoading ? (
        <TableSkeleton rows={6} columns={3} />
      ) : (
        <>
          {/* TAB 1: TREE VIEWER */}
          {activeTab === 'tree' && (
            <div className="space-y-3">
              <AcademicTreeViewer
                tree={tree}
                onAddSubject={handleOpenAddSubject}
                onAddBook={handleOpenAddBook}
                onAddChapter={handleOpenAddChapter}
                onAddSection={handleOpenAddSection}
                onAddTopic={handleOpenAddTopic}
                onEditInstitution={handleOpenEditInst}
                onEditSubject={handleOpenEditSubj}
                onEditBook={handleOpenEditBook}
                onEditChapter={handleOpenEditChapter}
                onEditSection={handleOpenEditSection}
                onEditTopic={handleOpenEditTopic}
                onDeleteItem={handleDeleteItem}
                onTopicToggled={loadData}
                onLogSession={handleOpenLogSession}
              />
            </div>
          )}

          {/* TAB 2: BOOKS & READING PROGRESS */}
          {activeTab === 'books' && (
            <div className="space-y-3">
              {books.length === 0 ? (
                <Card variant="acrylic" className="p-12 text-center">
                  <BookIcon className="w-12 h-12 text-black/20 dark:text-white/20 mx-auto mb-3" />
                  <h4 className="text-sm font-bold text-[#1f1f1f] dark:text-white">
                    هیچ کتاب یا منبع درسی ثبت نشده است
                  </h4>
                  <p className="text-xs text-[#8a8a8a] mt-1 max-w-sm mx-auto">
                    برای شروع، از دکمه «+ کتاب مرجع» برای اضافه کردن منابع درسی استفاده کنید.
                  </p>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {books.map((b) => {
                    const subj = b.subject_id ? subjectMap.get(b.subject_id) : null;
                    return (
                      <BookProgressCard
                        key={b.id}
                        book={b}
                        subjectName={subj?.name}
                        subjectColor={subj?.color}
                        onEdit={handleOpenEditBook}
                        onDelete={(book) => handleDeleteItem('books', book.id, book.title)}
                        onProgressUpdated={loadData}
                      />
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: INSTITUTIONS & SUBJECTS OVERVIEW */}
          {activeTab === 'institutions' && (
            <div className="space-y-4">
              {institutions.length === 0 ? (
                <Card variant="acrylic" className="p-12 text-center">
                  <School className="w-12 h-12 text-black/20 dark:text-white/20 mx-auto mb-3" />
                  <h4 className="text-sm font-bold text-[#1f1f1f] dark:text-white">
                    هیچ نهاد آموزشی ثبت نشده است
                  </h4>
                </Card>
              ) : (
                institutions.map((inst) => {
                  const instSubjs = subjects.filter((s) => s.institution_id === inst.id);

                  return (
                    <Card key={inst.id} variant="acrylic" className="p-4 space-y-3 text-start">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <School className="w-4 h-4 text-[#0078d4]" />
                          <h3 className="font-bold text-sm text-[#1f1f1f] dark:text-white">
                            {inst.name}
                          </h3>
                          {inst.degree_or_program && (
                            <Badge variant="neutral" size="sm">
                              {inst.degree_or_program}
                            </Badge>
                          )}
                          {inst.current_term && (
                            <span className="text-xs text-[#8a8a8a]">({inst.current_term})</span>
                          )}
                        </div>

                        <div className="flex items-center gap-1">
                          <Button
                            variant="subtle"
                            size="sm"
                            onClick={() => handleOpenAddSubject(inst)}
                            className="h-7 text-xs gap-1"
                          >
                            <Plus className="w-3 h-3" />
                            <span>افزودن درس</span>
                          </Button>
                          <button
                            onClick={() => handleOpenEditInst(inst)}
                            className="p-1 text-[#8a8a8a] hover:text-black dark:hover:text-white"
                            title="ویرایش"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteItem('institutions', inst.id, inst.name)}
                            className="p-1 text-[#8a8a8a] hover:text-red-500"
                            title="حذف"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Enrolled Subjects under Institution */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 pt-1">
                        {instSubjs.length === 0 ? (
                          <p className="text-xs text-[#8a8a8a] col-span-full">
                            هنوز درسی برای این نهاد ثبت نشده است.
                          </p>
                        ) : (
                          instSubjs.map((s) => (
                            <div
                              key={s.id}
                              className="p-2.5 rounded-lg border border-black/8 dark:border-white/8 bg-black/2 dark:bg-white/2 space-y-1.5"
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-1.5">
                                  <span
                                    className="w-2.5 h-2.5 rounded-full"
                                    style={{ backgroundColor: s.color || '#0078d4' }}
                                  />
                                  <span className="font-semibold text-xs text-[#1f1f1f] dark:text-white">
                                    {s.name}
                                  </span>
                                </div>
                                {s.credits !== undefined && (
                                  <Badge variant="neutral" size="sm">
                                    {s.credits} و
                                  </Badge>
                                )}
                              </div>

                              <div className="flex items-center justify-between text-[11px] text-[#8a8a8a]">
                                <span>{s.instructor || 'بدون مدرس'}</span>
                                <span className="font-mono">{s.code || ''}</span>
                              </div>

                              <div className="flex items-center justify-between pt-1 border-t border-black/5 dark:border-white/5 text-[10px] text-[#8a8a8a]">
                                <span>{s.book_count ?? 0} کتاب مرجع</span>
                                <span>
                                  {s.completed_topic_count ?? 0} / {s.topic_count ?? 0} مبحث
                                </span>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </Card>
                  );
                })
              )}
            </div>
          )}

          {/* TAB 4: ACTIVE LEARNING & SPACED REPETITION */}
          {activeTab === 'learning' && (
            <div className="space-y-4">
              {/* Mastery Distribution Bar */}
              <Card variant="acrylic" className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold text-[#1f1f1f] dark:text-white flex items-center gap-2">
                    <Brain className="w-4 h-4 text-purple-500" />
                    توزیع سطح تسلط مباحث
                  </h3>
                  <span className="text-xs text-[#8a8a8a] font-mono">{masteryRecords.length} مبحث ردیابی‌شده</span>
                </div>
                <div className="flex gap-1 h-3 rounded-full overflow-hidden">
                  {(Object.entries(masteryDist) as [MasteryTier, number][]).map(([tier, count]) => {
                    const pct = Math.round((count / totalMasteryRecords) * 100);
                    const colors: Record<MasteryTier, string> = {
                      unstudied: 'bg-[#8a8a8a]',
                      novice: 'bg-red-400',
                      competent: 'bg-amber-400',
                      proficient: 'bg-blue-400',
                      mastered: 'bg-emerald-500',
                    };
                    return pct > 0 ? (
                      <div
                        key={tier}
                        className={`${colors[tier]} transition-all`}
                        style={{ width: `${pct}%` }}
                        title={`${tier}: ${count} (${pct}%)`}
                      />
                    ) : null;
                  })}
                </div>
                <div className="flex flex-wrap gap-3 mt-3">
                  {([
                    { tier: 'unstudied' as MasteryTier, label: 'نخوانده', color: 'bg-[#8a8a8a]' },
                    { tier: 'novice' as MasteryTier, label: 'مبتدی', color: 'bg-red-400' },
                    { tier: 'competent' as MasteryTier, label: 'آشنا', color: 'bg-amber-400' },
                    { tier: 'proficient' as MasteryTier, label: 'ماهر', color: 'bg-blue-400' },
                    { tier: 'mastered' as MasteryTier, label: 'مسلط', color: 'bg-emerald-500' },
                  ]).map(({ tier, label, color }) => (
                    <div key={tier} className="flex items-center gap-1.5 text-[11px] text-[#8a8a8a]">
                      <span className={`w-2 h-2 rounded-full ${color}`} />
                      {label}: <span className="font-mono font-semibold text-[#1f1f1f] dark:text-white">{masteryDist[tier]}</span>
                    </div>
                  ))}
                </div>
              </Card>

              {/* Spaced Repetition Queue */}
              <SpacedRepetitionQueue
                onQueueUpdated={loadData}
                onOpenLogSession={(topicId, _subjectId) => {
                  setLogSessionTopic({ id: topicId, title: topicId } as unknown as Topic);
                  setIsLogSessionOpen(true);
                }}
              />

              {/* Recent Sessions Table */}
              <Card variant="acrylic" className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold text-[#1f1f1f] dark:text-white flex items-center gap-2">
                    <Activity className="w-4 h-4 text-blue-500" />
                    جلسات یادگیری اخیر
                  </h3>
                  <Button
                    variant="primary"
                    size="sm"
                    icon={<Brain className="w-3.5 h-3.5" />}
                    onClick={() => { setLogSessionTopic(null); setIsLogSessionOpen(true); }}
                  >
                    ثبت جلسه جدید
                  </Button>
                </div>
                {recentSessions.length === 0 ? (
                  <p className="text-xs text-[#8a8a8a] text-center py-6">
                    هنوز جلسه‌ای ثبت نشده است. از دکمه «ثبت جلسه جدید» یا آیکون 🧠 روی مباحث درخت استفاده کنید.
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-black/8 dark:border-white/8 text-[#8a8a8a]">
                          <th className="text-start py-2 font-medium">تاریخ</th>
                          <th className="text-start py-2 font-medium">نوع فعالیت</th>
                          <th className="text-start py-2 font-medium">موضوع / درس</th>
                          <th className="text-center py-2 font-medium">مدت (دقیقه)</th>
                          <th className="text-center py-2 font-medium">درک مطلب</th>
                          <th className="text-start py-2 font-medium">یادداشت</th>
                        </tr>
                      </thead>
                      <tbody>
                        {recentSessions.map((session) => {
                          const activityLabels: Record<string, string> = {
                            study: 'مطالعه',
                            practice: 'تمرین',
                            review: 'مرور',
                            teaching: 'تدریس',
                          };
                          const subj = session.subject_id ? subjects.find((s) => s.id === session.subject_id) : null;
                          return (
                            <tr
                              key={session.id}
                              className="border-b border-black/5 dark:border-white/5 hover:bg-black/3 dark:hover:bg-white/3"
                            >
                              <td className="py-2 text-[#8a8a8a] font-mono">
                                {new Date(session.started_at).toLocaleDateString('fa-IR')}
                              </td>
                              <td className="py-2">
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-[#0078d4]/10 text-[#0078d4] dark:text-[#60a5fa]">
                                  {activityLabels[session.activity_type] ?? session.activity_type}
                                </span>
                              </td>
                              <td className="py-2 text-[#1f1f1f] dark:text-white">
                                {subj?.name ?? session.subject_id ?? '—'}
                              </td>
                              <td className="py-2 text-center font-mono">{session.duration_minutes ?? '—'}</td>
                              <td className="py-2 text-center">
                                {session.comprehension_rating != null
                                  ? '★'.repeat(session.comprehension_rating) + '☆'.repeat(5 - session.comprehension_rating)
                                  : '—'}
                              </td>
                              <td className="py-2 text-[#8a8a8a] max-w-[180px] truncate">
                                {session.summary ?? '—'}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </Card>
            </div>
          )}
        </>
      )}

      {/* Creation & Edit Modals */}
      <InstitutionModal
        isOpen={isInstModalOpen}
        onClose={() => setIsInstModalOpen(false)}
        institutionToEdit={instToEdit}
        onSaved={loadData}
      />

      <SubjectModal
        isOpen={isSubjModalOpen}
        onClose={() => setIsSubjModalOpen(false)}
        subjectToEdit={subjToEdit}
        defaultInstitutionId={defaultInstId}
        onSaved={loadData}
      />

      <BookModal
        isOpen={isBookModalOpen}
        onClose={() => setIsBookModalOpen(false)}
        bookToEdit={bookToEdit}
        defaultSubjectId={defaultSubjId}
        onSaved={loadData}
      />

      <TreeItemModal
        isOpen={isTreeItemModalOpen}
        onClose={() => setIsTreeItemModalOpen(false)}
        type={treeItemType}
        bookId={treeItemContext.bookId}
        chapterId={treeItemContext.chapterId}
        sectionId={treeItemContext.sectionId}
        subjectId={treeItemContext.subjectId}
        itemToEdit={treeItemToEdit}
        onSaved={loadData}
      />

      {/* Phase 05 — Log Session Modal */}
      <LogSessionModal
        isOpen={isLogSessionOpen}
        onClose={() => { setIsLogSessionOpen(false); setLogSessionTopic(null); }}
        defaultTopicId={logSessionTopic?.id ?? null}
        onSessionSaved={loadData}
      />
    </div>
  );
};
