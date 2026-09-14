import React, { useEffect, useRef } from 'react';
import { Search, X, CheckSquare, BookOpen, Book, FileText, Inbox, Award, ArrowRight } from 'lucide-react';
import { useSearchStore } from '../../stores/searchStore';
import { searchService, SearchEntityType, SearchResult } from '../../services/searchService';
import { useNavigationStore } from '../../store/useNavigationStore';
import { Badge } from '../Badge';

const ENTITY_CONFIG: Record<
  SearchEntityType | 'all',
  { labelFa: string; labelEn: string; icon: React.ComponentType<{ className?: string }>; color: string }
> = {
  all: { labelFa: 'همه', labelEn: 'All', icon: Search, color: 'text-blue-500' },
  task: { labelFa: 'وظایف', labelEn: 'Tasks', icon: CheckSquare, color: 'text-emerald-500' },
  topic: { labelFa: 'مباحث', labelEn: 'Topics', icon: BookOpen, color: 'text-indigo-500' },
  journal: { labelFa: 'ژورنال', labelEn: 'Journal', icon: FileText, color: 'text-amber-500' },
  vault: { labelFa: 'صندوق خاطرات', labelEn: 'Vault', icon: Award, color: 'text-purple-500' },
  inbox: { labelFa: 'صندوق ورودی', labelEn: 'Inbox', icon: Inbox, color: 'text-sky-500' },
  subject: { labelFa: 'دروس', labelEn: 'Subjects', icon: Book, color: 'text-cyan-500' },
};

export const GlobalSearchModal: React.FC = () => {
  const {
    showSearchModal,
    closeModal,
    query,
    setQuery,
    selectedEntityType,
    setSelectedEntityType,
    results,
    setResults,
    selectedIndex,
    setSelectedIndex,
    isLoading,
    setIsLoading,
  } = useSearchStore();

  const navigate = useNavigationStore((state) => state.navigate);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input when modal opens
  useEffect(() => {
    if (showSearchModal) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [showSearchModal]);

  // Execute debounced search when query or entity type filter changes
  useEffect(() => {
    if (!showSearchModal) return;

    if (!query.trim()) {
      setResults([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const timer = setTimeout(async () => {
      try {
        const filters = selectedEntityType !== 'all' ? { entity_types: [selectedEntityType] } : undefined;
        const searchRes = await searchService.globalSearch(query, filters);
        setResults(searchRes.all);
      } catch {
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    }, 150);

    return () => clearTimeout(timer);
  }, [query, selectedEntityType, showSearchModal, setResults, setIsLoading]);

  // Handle keyboard navigation (Up, Down, Enter, Escape)
  useEffect(() => {
    if (!showSearchModal) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        closeModal();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (results.length > 0) {
          setSelectedIndex((prev) => (prev + 1) % results.length);
        }
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (results.length > 0) {
          setSelectedIndex((prev) => (prev - 1 + results.length) % results.length);
        }
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (results.length > 0 && results[selectedIndex]) {
          const target = results[selectedIndex];
          navigate(target.route as any);
          closeModal();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showSearchModal, results, selectedIndex, closeModal, navigate, setSelectedIndex]);

  if (!showSearchModal) return null;

  const handleSelectResult = (result: SearchResult) => {
    navigate(result.route as any);
    closeModal();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 px-4 bg-black/50 dark:bg-black/70 backdrop-blur-sm animate-in fade-in duration-150 select-none">
      <div
        className="w-full max-w-2xl bg-white dark:bg-[#252526] border border-black/10 dark:border-white/10 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh] transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Header Input */}
        <div className="flex items-center px-4 py-3.5 border-b border-black/10 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.02]">
          <Search className="w-5 h-5 text-[#0078d4] me-3 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="جستجو در تمامی بخش‌ها... (وظایف، مباحث، ژورنال، خاطرات)"
            className="w-full bg-transparent text-sm sm:text-base font-medium text-[#1f1f1f] dark:text-white placeholder:text-[#8a8a8a] focus:outline-none"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="p-1 rounded-md text-[#8a8a8a] hover:text-[#1f1f1f] dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 me-2"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <kbd className="hidden sm:inline-flex items-center px-2 py-0.5 text-xs text-[#8a8a8a] bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded font-mono">
            ESC
          </kbd>
        </div>

        {/* Filter Badges */}
        <div className="flex items-center gap-1.5 px-4 py-2 border-b border-black/5 dark:border-white/5 overflow-x-auto no-scrollbar bg-black/[0.01] dark:bg-white/[0.01]">
          {(['all', 'task', 'topic', 'journal', 'vault', 'inbox', 'subject'] as (SearchEntityType | 'all')[]).map((type) => {
            const config = ENTITY_CONFIG[type];
            const isSelected = selectedEntityType === type;
            const Icon = config.icon;
            return (
              <button
                key={type}
                onClick={() => setSelectedEntityType(type)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold transition-all shrink-0 ${
                  isSelected
                    ? 'bg-[#0078d4] text-white shadow-sm'
                    : 'text-[#616161] dark:text-[#adadad] hover:bg-black/5 dark:hover:bg-white/5'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isSelected ? 'text-white' : config.color}`} />
                <span>{config.labelFa}</span>
              </button>
            );
          })}
        </div>

        {/* Search Results Content Viewport */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1 min-h-[160px] max-h-[400px]">
          {isLoading && (
            <div className="flex items-center justify-center py-10 text-xs text-[#8a8a8a]">
              <div className="w-5 h-5 border-2 border-[#0078d4] border-t-transparent rounded-full animate-spin me-2" />
              <span>در حال جستجو در داده‌ها...</span>
            </div>
          )}

          {!isLoading && !query.trim() && (
            <div className="flex flex-col items-center justify-center py-10 text-center text-[#8a8a8a] space-y-2">
              <Search className="w-8 h-8 opacity-40 text-[#0078d4]" />
              <p className="text-xs font-medium">عبارت مورد نظر خود را برای جستجوی آنی وارد کنید</p>
              <p className="text-[11px] opacity-75">پشتیبانی کامل از جستجوی فارسی و انگلیسی</p>
            </div>
          )}

          {!isLoading && query.trim() && results.length === 0 && (
            <div className="flex flex-col items-center justify-center py-10 text-center text-[#8a8a8a] space-y-1">
              <p className="text-xs font-semibold text-[#1f1f1f] dark:text-white">نتیجه‌ای یافت نشد</p>
              <p className="text-[11px]">هیچ موردی مطابق با "{query}" در پایگاه داده پیدا نشد.</p>
            </div>
          )}

          {!isLoading &&
            results.map((item, index) => {
              const isSelected = index === selectedIndex;
              const config = ENTITY_CONFIG[item.entity_type] || ENTITY_CONFIG.all;
              const Icon = config.icon;

              return (
                <div
                  key={`${item.entity_type}_${item.entity_id}_${index}`}
                  onClick={() => handleSelectResult(item)}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={`flex items-start gap-3 p-2.5 rounded-lg cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-[#0078d4]/10 dark:bg-[#0078d4]/20 border border-[#0078d4]/30'
                      : 'hover:bg-black/5 dark:hover:bg-white/5 border border-transparent'
                  }`}
                >
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                      isSelected ? 'bg-[#0078d4] text-white' : 'bg-black/5 dark:bg-white/5 ' + config.color
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>

                  <div className="flex-1 min-w-0 text-start">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="text-xs sm:text-sm font-semibold text-[#1f1f1f] dark:text-white truncate">
                        {item.title || 'بدون عنوان'}
                      </h4>
                      <Badge variant="neutral" size="sm" className="shrink-0 text-[10px]">
                        {config.labelFa}
                      </Badge>
                    </div>

                    {item.content && (
                      <p className="text-xs text-[#616161] dark:text-[#adadad] line-clamp-1 mt-0.5">
                        {item.content}
                      </p>
                    )}
                  </div>

                  {isSelected && <ArrowRight className="w-4 h-4 text-[#0078d4] shrink-0 self-center me-1" />}
                </div>
              );
            })}
        </div>

        {/* Footer Shortcut Instructions */}
        <div className="flex items-center justify-between px-4 py-2.5 border-t border-black/10 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.02] text-[11px] text-[#8a8a8a]">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-black/5 dark:bg-white/5 rounded border border-black/10 dark:border-white/10 font-mono">↑↓</kbd>{' '}
              پیمایش
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-black/5 dark:bg-white/5 rounded border border-black/10 dark:border-white/10 font-mono">↵</kbd>{' '}
              انتخاب
            </span>
          </div>

          <div className="flex items-center gap-1 font-mono text-[10px]">
            <span>MY ASCEND FTS5 Engine</span>
          </div>
        </div>
      </div>
    </div>
  );
};
