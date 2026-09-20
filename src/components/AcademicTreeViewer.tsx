import React, { useState } from 'react';
import {
  ChevronDown,
  ChevronRight,
  School,
  BookOpen,
  Book as BookIcon,
  Layers,
  Bookmark,
  CheckCircle2,
  Circle,
  Plus,
  Edit3,
  Trash2,
  Brain,
  Flame,
} from 'lucide-react';
import { Badge } from './Badge';
import { Button } from './Button';
import {
  InstitutionNode,
  academicTreeService,
} from '../services/academicTreeService';
import { Topic, Chapter, Section, Book, Subject, Institution } from '../types/database';
import { useFocusStore } from '../store/useFocusStore';
import { useNavigationStore } from '../store/useNavigationStore';

export interface AcademicTreeViewerProps {
  tree: InstitutionNode[];
  onAddSubject?: (institution: Institution) => void;
  onAddBook?: (subject: Subject) => void;
  onAddChapter?: (book: Book) => void;
  onAddSection?: (chapter: Chapter) => void;
  onAddTopic?: (params: { subjectId: string; chapterId: string; sectionId?: string | null }) => void;
  onEditInstitution?: (inst: Institution) => void;
  onEditSubject?: (subj: Subject) => void;
  onEditBook?: (book: Book) => void;
  onEditChapter?: (chap: Chapter) => void;
  onEditSection?: (sec: Section) => void;
  onEditTopic?: (topic: Topic) => void;
  onDeleteItem?: (type: string, id: string, name: string) => void;
  onTopicToggled?: () => void;
  onLogSession?: (topic: Topic) => void;
}

const IMPORTANCE_COLORS: Record<string, { label: string; color: string }> = {
  critical: { label: 'بحرانی', color: 'bg-red-500/10 text-red-600 border-red-500/20' },
  high: { label: 'مهم', color: 'bg-amber-500/10 text-amber-600 border-amber-500/20' },
  medium: { label: 'متوسط', color: 'bg-blue-500/10 text-blue-600 border-blue-500/20' },
  low: { label: 'پایه', color: 'bg-neutral-500/10 text-neutral-600 border-neutral-500/20' },
};

export const AcademicTreeViewer: React.FC<AcademicTreeViewerProps> = ({
  tree,
  onAddSubject,
  onAddBook,
  onAddChapter,
  onAddSection,
  onAddTopic,
  onEditInstitution,
  onEditSubject,
  onEditBook,
  onEditChapter,
  onEditSection,
  onEditTopic,
  onDeleteItem,
  onTopicToggled,
  onLogSession,
}) => {
  // Collapsed sets
  const [collapsedInsts, setCollapsedInsts] = useState<Set<string>>(new Set());
  const [collapsedSubjs, setCollapsedSubjs] = useState<Set<string>>(new Set());
  const [collapsedBooks, setCollapsedBooks] = useState<Set<string>>(new Set());
  const [collapsedChaps, setCollapsedChaps] = useState<Set<string>>(new Set());
  const [collapsedSecs, setCollapsedSecs] = useState<Set<string>>(new Set());

  const toggleInst = (id: string) => {
    setCollapsedInsts((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSubj = (id: string) => {
    setCollapsedSubjs((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleBook = (id: string) => {
    setCollapsedBooks((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleChap = (id: string) => {
    setCollapsedChaps((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSec = (id: string) => {
    setCollapsedSecs((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleToggleTopic = async (topicId: string) => {
    try {
      await academicTreeService.toggleTopicCompletion(topicId);
      onTopicToggled?.();
    } catch (err) {
      console.error('Failed to toggle topic completion:', err);
    }
  };

  if (tree.length === 0) {
    return (
      <div className="p-12 text-center border border-dashed border-black/10 dark:border-white/10 rounded-xl">
        <School className="w-12 h-12 text-black/20 dark:text-white/20 mx-auto mb-3" />
        <h4 className="text-sm font-bold text-[#1f1f1f] dark:text-white">
          ساختار آکادمیکی ثبت نشده است
        </h4>
        <p className="text-xs text-[#8a8a8a] mt-1 max-w-sm mx-auto">
          با افزودن دانشگاه یا موسسه آموزشی، دروس، کتب و سرفصل‌های خود را مدیریت کنید.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3 select-none text-start">
      {tree.map((inst) => {
        const isInstCollapsed = collapsedInsts.has(inst.id);

        return (
          <div
            key={inst.id}
            className="border border-black/8 dark:border-white/8 rounded-xl bg-white/50 dark:bg-[#252525]/50 overflow-hidden"
          >
            {/* ─── LEVEL 1: INSTITUTION ─── */}
            <div className="flex items-center justify-between p-3 bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 transition-colors">
              <div
                className="flex items-center gap-2 cursor-pointer flex-1"
                onClick={() => toggleInst(inst.id)}
              >
                {isInstCollapsed ? (
                  <ChevronRight className="w-4 h-4 text-[#8a8a8a]" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-[#8a8a8a]" />
                )}
                <School className="w-4 h-4 text-[#0078d4]" />
                <span className="font-bold text-sm text-[#1f1f1f] dark:text-white">
                  {inst.name}
                </span>
                {inst.degree_or_program && (
                  <Badge variant="neutral" size="sm">
                    {inst.degree_or_program}
                  </Badge>
                )}
                {inst.current_term && (
                  <span className="text-xs text-[#8a8a8a]">({inst.current_term})</span>
                )}
                <span className="text-[11px] text-[#8a8a8a] font-mono">
                  [{inst.subjects.length} درس]
                </span>
              </div>

              {/* Institution Actions */}
              <div className="flex items-center gap-1">
                {onAddSubject && (
                  <Button
                    variant="subtle"
                    size="sm"
                    onClick={() => onAddSubject(inst)}
                    className="h-7 text-xs gap-1"
                  >
                    <Plus className="w-3 h-3" />
                    <span>درس جدید</span>
                  </Button>
                )}
                {onEditInstitution && (
                  <button
                    onClick={() => onEditInstitution(inst)}
                    className="p-1 text-[#8a8a8a] hover:text-black dark:hover:text-white transition-colors"
                    title="ویرایش دانشگاه"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                )}
                {onDeleteItem && (
                  <button
                    onClick={() => onDeleteItem('institutions', inst.id, inst.name)}
                    className="p-1 text-[#8a8a8a] hover:text-red-500 transition-colors"
                    title="حذف دانشگاه"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Institution Children (Subjects) */}
            {!isInstCollapsed && (
              <div className="p-2 space-y-2 ps-6 border-t border-black/5 dark:border-white/5">
                {inst.subjects.length === 0 ? (
                  <p className="text-xs text-[#8a8a8a] py-2">
                    هیچ درسی برای این نهاد ثبت نشده است. از دکمه «درس جدید» استفاده کنید.
                  </p>
                ) : (
                  inst.subjects.map((subj) => {
                    const isSubjCollapsed = collapsedSubjs.has(subj.id);

                    return (
                      <div
                        key={subj.id}
                        className="border border-black/5 dark:border-white/5 rounded-lg bg-black/2 dark:bg-white/2"
                      >
                        {/* ─── LEVEL 2: SUBJECT ─── */}
                        <div className="flex items-center justify-between p-2.5 hover:bg-black/5 dark:hover:bg-white/5 transition-colors rounded-lg">
                          <div
                            className="flex items-center gap-2 cursor-pointer flex-1"
                            onClick={() => toggleSubj(subj.id)}
                          >
                            {isSubjCollapsed ? (
                              <ChevronRight className="w-3.5 h-3.5 text-[#8a8a8a]" />
                            ) : (
                              <ChevronDown className="w-3.5 h-3.5 text-[#8a8a8a]" />
                            )}
                            <span
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: subj.color || '#0078d4' }}
                            />
                            <BookOpen className="w-4 h-4 text-[#1f1f1f] dark:text-white" />
                            <span className="font-semibold text-xs text-[#1f1f1f] dark:text-white">
                              {subj.name}
                            </span>
                            {subj.code && (
                              <span className="text-[11px] font-mono text-[#8a8a8a]">
                                ({subj.code})
                              </span>
                            )}
                            {subj.credits !== undefined && (
                              <Badge variant="neutral" size="sm">
                                {subj.credits} واحد
                              </Badge>
                            )}
                            <span className="text-[11px] text-[#8a8a8a]">
                              [{subj.books.length} کتاب]
                            </span>
                          </div>

                          {/* Subject Actions */}
                          <div className="flex items-center gap-1">
                            {onAddBook && (
                              <Button
                                variant="subtle"
                                size="sm"
                                onClick={() => onAddBook(subj)}
                                className="h-6 text-[11px] gap-1"
                              >
                                <Plus className="w-2.5 h-2.5" />
                                <span>کتاب مرجع</span>
                              </Button>
                            )}
                            {onEditSubject && (
                              <button
                                onClick={() => onEditSubject(subj)}
                                className="p-1 text-[#8a8a8a] hover:text-black dark:hover:text-white transition-colors"
                                title="ویرایش درس"
                              >
                                <Edit3 className="w-3 h-3" />
                              </button>
                            )}
                            {onDeleteItem && (
                              <button
                                onClick={() => onDeleteItem('subjects', subj.id, subj.name)}
                                className="p-1 text-[#8a8a8a] hover:text-red-500 transition-colors"
                                title="حذف درس"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Subject Children (Books) */}
                        {!isSubjCollapsed && (
                          <div className="p-2 space-y-2 ps-6 border-t border-black/5 dark:border-white/5">
                            {subj.books.length === 0 ? (
                              <p className="text-xs text-[#8a8a8a] py-1">
                                هیچ کتابی اضافه نشده است. با «کتاب مرجع» منبع اضافه کنید.
                              </p>
                            ) : (
                              subj.books.map((book) => {
                                const isBookCollapsed = collapsedBooks.has(book.id);

                                return (
                                  <div
                                    key={book.id}
                                    className="border border-black/5 dark:border-white/5 rounded-md bg-white/40 dark:bg-black/20"
                                  >
                                    {/* ─── LEVEL 3: BOOK ─── */}
                                    <div className="flex items-center justify-between p-2 hover:bg-black/5 dark:hover:bg-white/5 transition-colors rounded-md">
                                      <div
                                        className="flex items-center gap-2 cursor-pointer flex-1"
                                        onClick={() => toggleBook(book.id)}
                                      >
                                        {isBookCollapsed ? (
                                          <ChevronRight className="w-3.5 h-3.5 text-[#8a8a8a]" />
                                        ) : (
                                          <ChevronDown className="w-3.5 h-3.5 text-[#8a8a8a]" />
                                        )}
                                        <BookIcon className="w-3.5 h-3.5 text-emerald-600" />
                                        <span className="font-medium text-xs text-[#1f1f1f] dark:text-white">
                                          {book.title}
                                        </span>
                                        {book.total_pages && (
                                          <span className="text-[10px] text-[#8a8a8a] font-mono">
                                            ({book.read_pages ?? 0}/{book.total_pages} ص)
                                          </span>
                                        )}
                                        <span className="text-[10px] text-emerald-600 font-mono font-bold">
                                          {book.progress_percent ?? 0}٪
                                        </span>
                                      </div>

                                      {/* Book Actions */}
                                      <div className="flex items-center gap-1">
                                        {onAddChapter && (
                                          <Button
                                            variant="subtle"
                                            size="sm"
                                            onClick={() => onAddChapter(book)}
                                            className="h-6 text-[10px] gap-1"
                                          >
                                            <Plus className="w-2.5 h-2.5" />
                                            <span>فصل جدید</span>
                                          </Button>
                                        )}
                                        {onEditBook && (
                                          <button
                                            onClick={() => onEditBook(book)}
                                            className="p-1 text-[#8a8a8a] hover:text-black dark:hover:text-white transition-colors"
                                            title="ویرایش کتاب"
                                          >
                                            <Edit3 className="w-3 h-3" />
                                          </button>
                                        )}
                                        {onDeleteItem && (
                                          <button
                                            onClick={() => onDeleteItem('books', book.id, book.title)}
                                            className="p-1 text-[#8a8a8a] hover:text-red-500 transition-colors"
                                            title="حذف کتاب"
                                          >
                                            <Trash2 className="w-3 h-3" />
                                          </button>
                                        )}
                                      </div>
                                    </div>

                                    {/* Book Children (Chapters) */}
                                    {!isBookCollapsed && (
                                      <div className="p-2 space-y-2 ps-6 border-t border-black/5 dark:border-white/5">
                                        {book.chapters.length === 0 ? (
                                          <p className="text-[11px] text-[#8a8a8a] py-1">
                                            فصلی ثبت نشده است. با دکمه «فصل جدید» ایجاد کنید.
                                          </p>
                                        ) : (
                                          book.chapters.map((chap) => {
                                            const isChapCollapsed = collapsedChaps.has(chap.id);

                                            return (
                                              <div
                                                key={chap.id}
                                                className="border-s-2 border-[#0078d4]/40 ps-2 space-y-1.5"
                                              >
                                                {/* ─── LEVEL 4: CHAPTER ─── */}
                                                <div className="flex items-center justify-between p-1.5 hover:bg-black/5 dark:hover:bg-white/5 transition-colors rounded">
                                                  <div
                                                    className="flex items-center gap-1.5 cursor-pointer flex-1"
                                                    onClick={() => toggleChap(chap.id)}
                                                  >
                                                    {isChapCollapsed ? (
                                                      <ChevronRight className="w-3 h-3 text-[#8a8a8a]" />
                                                    ) : (
                                                      <ChevronDown className="w-3 h-3 text-[#8a8a8a]" />
                                                    )}
                                                    <Layers className="w-3 h-3 text-purple-500" />
                                                    <span className="text-xs font-semibold text-[#1f1f1f] dark:text-white">
                                                      فصل {chap.chapter_number}: {chap.title}
                                                    </span>
                                                    {chap.start_page && (
                                                      <span className="text-[10px] text-[#8a8a8a] font-mono">
                                                        (ص {chap.start_page}
                                                        {chap.end_page ? `-${chap.end_page}` : ''})
                                                      </span>
                                                    )}
                                                    <span className="text-[10px] text-[#8a8a8a] font-mono">
                                                      [{chap.completed_topic_count ?? 0}/{chap.topic_count ?? 0} مبحث]
                                                    </span>
                                                  </div>

                                                  {/* Chapter Actions */}
                                                  <div className="flex items-center gap-1">
                                                    {onAddSection && (
                                                      <Button
                                                        variant="subtle"
                                                        size="sm"
                                                        onClick={() => onAddSection(chap)}
                                                        className="h-5 text-[10px] px-1.5"
                                                      >
                                                        + بخش
                                                      </Button>
                                                    )}
                                                    {onAddTopic && (
                                                      <Button
                                                        variant="subtle"
                                                        size="sm"
                                                        onClick={() =>
                                                          onAddTopic({
                                                            subjectId: subj.id,
                                                            chapterId: chap.id,
                                                          })
                                                        }
                                                        className="h-5 text-[10px] px-1.5 text-blue-600"
                                                      >
                                                        + مبحث مستقیم
                                                      </Button>
                                                    )}
                                                    {onEditChapter && (
                                                      <button
                                                        onClick={() => onEditChapter(chap)}
                                                        className="p-1 text-[#8a8a8a] hover:text-black dark:hover:text-white"
                                                        title="ویرایش فصل"
                                                      >
                                                        <Edit3 className="w-2.5 h-2.5" />
                                                      </button>
                                                    )}
                                                    {onDeleteItem && (
                                                      <button
                                                        onClick={() =>
                                                          onDeleteItem('chapters', chap.id, chap.title)
                                                        }
                                                        className="p-1 text-[#8a8a8a] hover:text-red-500"
                                                        title="حذف فصل"
                                                      >
                                                        <Trash2 className="w-2.5 h-2.5" />
                                                      </button>
                                                    )}
                                                  </div>
                                                </div>

                                                {/* Chapter Content: Sections and Direct Topics */}
                                                {!isChapCollapsed && (
                                                  <div className="ps-4 space-y-1.5">
                                                    {/* Direct Topics under Chapter (section_id IS NULL) */}
                                                    {chap.directTopics.map((topic) => (
                                                      <TopicItem
                                                        key={topic.id}
                                                        topic={topic}
                                                        onToggle={() => handleToggleTopic(topic.id)}
                                                        onEdit={onEditTopic}
                                                        onDelete={(t) =>
                                                          onDeleteItem?.('topics', t.id, t.title)
                                                        }
                                                        onLogSession={onLogSession}
                                                      />
                                                    ))}

                                                    {/* Sections under Chapter */}
                                                    {chap.sections.map((sec) => {
                                                      const isSecCollapsed = collapsedSecs.has(sec.id);

                                                      return (
                                                        <div
                                                          key={sec.id}
                                                          className="border-s border-amber-500/50 ps-2 space-y-1"
                                                        >
                                                          {/* ─── LEVEL 5: SECTION ─── */}
                                                          <div className="flex items-center justify-between p-1 hover:bg-black/5 dark:hover:bg-white/5 transition-colors rounded">
                                                            <div
                                                              className="flex items-center gap-1.5 cursor-pointer flex-1"
                                                              onClick={() => toggleSec(sec.id)}
                                                            >
                                                              {isSecCollapsed ? (
                                                                <ChevronRight className="w-2.5 h-2.5 text-[#8a8a8a]" />
                                                              ) : (
                                                                <ChevronDown className="w-2.5 h-2.5 text-[#8a8a8a]" />
                                                              )}
                                                              <Bookmark className="w-3 h-3 text-amber-500" />
                                                              <span className="text-[11px] font-medium text-[#1f1f1f] dark:text-white">
                                                                {sec.section_number
                                                                  ? `${sec.section_number}: `
                                                                  : ''}
                                                                {sec.title}
                                                              </span>
                                                              {sec.page && (
                                                                <span className="text-[10px] text-[#8a8a8a] font-mono">
                                                                  (ص {sec.page})
                                                                </span>
                                                              )}
                                                            </div>

                                                            {/* Section Actions */}
                                                            <div className="flex items-center gap-1">
                                                              {onAddTopic && (
                                                                <Button
                                                                  variant="subtle"
                                                                  size="sm"
                                                                  onClick={() =>
                                                                    onAddTopic({
                                                                      subjectId: subj.id,
                                                                      chapterId: chap.id,
                                                                      sectionId: sec.id,
                                                                    })
                                                                  }
                                                                  className="h-5 text-[9px] px-1 text-blue-600"
                                                                >
                                                                  + مبحث
                                                                </Button>
                                                              )}
                                                              {onEditSection && (
                                                                <button
                                                                  onClick={() => onEditSection(sec)}
                                                                  className="p-0.5 text-[#8a8a8a] hover:text-black dark:hover:text-white"
                                                                  title="ویرایش بخش"
                                                                >
                                                                  <Edit3 className="w-2.5 h-2.5" />
                                                                </button>
                                                              )}
                                                              {onDeleteItem && (
                                                                <button
                                                                  onClick={() =>
                                                                    onDeleteItem('sections', sec.id, sec.title)
                                                                  }
                                                                  className="p-0.5 text-[#8a8a8a] hover:text-red-500"
                                                                  title="حذف بخش"
                                                                >
                                                                  <Trash2 className="w-2.5 h-2.5" />
                                                                </button>
                                                              )}
                                                            </div>
                                                          </div>
                                                          {/* Section Topics */}
                                                          {!isSecCollapsed && (
                                                            <div className="ps-3 space-y-1">
                                                              {sec.topics.map((topic) => (
                                                                <TopicItem
                                                                  key={topic.id}
                                                                  topic={topic}
                                                                  onToggle={() =>
                                                                    handleToggleTopic(topic.id)
                                                                  }
                                                                  onEdit={onEditTopic}
                                                                  onDelete={(t) =>
                                                                    onDeleteItem?.('topics', t.id, t.title)
                                                                  }
                                                                  onLogSession={onLogSession}
                                                                />
                                                              ))}
                                                            </div>
                                                          )}
                                                        </div>
                                                      );
                                                    })}
                                                  </div>
                                                )}
                                              </div>
                                            );
                                          })
                                        )}
                                      </div>
                                    )}
                                  </div>
                                );
                              })
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

// ─── Sub-Component for Topic Leaf Nodes ───

interface TopicItemProps {
  topic: Topic;
  onToggle: () => void;
  onEdit?: (topic: Topic) => void;
  onDelete?: (topic: Topic) => void;
  onLogSession?: (topic: Topic) => void;
}

const TopicItem: React.FC<TopicItemProps> = ({ topic, onToggle, onEdit, onDelete, onLogSession }) => {
  const isDone = topic.is_completed === 1;
  const imp = IMPORTANCE_COLORS[topic.importance_level] || IMPORTANCE_COLORS.medium;

  const handleStartFocus = (e: React.MouseEvent) => {
    e.stopPropagation();
    useFocusStore.getState().setSelectedTopic(topic.id, topic.subject_id, topic.title);
    useFocusStore.getState().setTimerMode('pomodoro', 25);
    useFocusStore.getState().startTimer();
    useNavigationStore.getState().navigate('focus');
  };

  return (
    <div
      className={`flex items-center justify-between p-1 rounded transition-colors group ${
        isDone ? 'bg-emerald-500/5' : 'hover:bg-black/5 dark:hover:bg-white/5'
      }`}
    >
      <div className="flex items-center gap-2 flex-1 cursor-pointer" onClick={onToggle}>
        <button
          type="button"
          className="focus:outline-none"
          title={isDone ? 'علامت‌گذاری به‌عنوان خوانده‌نشده' : 'تکمیل مبحث'}
        >
          {isDone ? (
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
          ) : (
            <Circle className="w-3.5 h-3.5 text-[#8a8a8a] group-hover:text-[#0078d4]" />
          )}
        </button>

        <span
          className={`text-xs ${
            isDone
               ? 'line-through text-[#8a8a8a] dark:text-[#777]'
              : 'text-[#1f1f1f] dark:text-white'
          }`}
        >
          {topic.title}
        </span>

        {/* Importance Badge */}
        <span
          className={`px-1.5 py-0.2 rounded text-[9px] font-semibold border ${imp.color}`}
        >
          {imp.label}
        </span>
      </div>

      {/* Action buttons on hover */}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          type="button"
          onClick={handleStartFocus}
          className="p-0.5 text-amber-500 hover:text-amber-600 dark:hover:text-amber-400"
          title="شروع مطالعه با تایمر تمرکز (Start Focus Timer)"
        >
          <Flame className="w-2.5 h-2.5" />
        </button>
        {onLogSession && (
          <button
            onClick={(e) => { e.stopPropagation(); onLogSession(topic); }}
            className="p-0.5 text-[#8a8a8a] hover:text-purple-500 dark:hover:text-purple-400"
            title="ثبت جلسه یادگیری"
          >
            <Brain className="w-2.5 h-2.5" />
          </button>
        )}
        {onEdit && (
          <button
            onClick={() => onEdit(topic)}
            className="p-0.5 text-[#8a8a8a] hover:text-black dark:hover:text-white"
            title="ویرایش مبحث"
          >
            <Edit3 className="w-2.5 h-2.5" />
          </button>
        )}
        {onDelete && (
          <button
            onClick={() => onDelete(topic)}
            className="p-0.5 text-[#8a8a8a] hover:text-red-500"
            title="حذف مبحث"
          >
            <Trash2 className="w-2.5 h-2.5" />
          </button>
        )}
      </div>
    </div>
  );
};
