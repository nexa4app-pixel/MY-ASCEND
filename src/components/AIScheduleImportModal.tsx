import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Copy,
  Check,
  Upload,
  AlertTriangle,
  Clock,
  ArrowRight,
  ArrowLeft,
  BookOpen,
  Flame,
  CheckCircle2,
  RefreshCw,
} from 'lucide-react';
import { Modal } from './Modal';
import { Button } from './Button';
import { Toggle } from './Toggle';
import { Badge } from './Badge';
import {
  aiScheduleImporterService,
  AIImportItem,
  PromptOptions,
} from '../services/aiScheduleImporterService';
import { db } from '../db/client';
import { toast } from '../store/useToastStore';

export interface AIScheduleImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportSuccess?: () => void;
}

type ImportStep = 1 | 2 | 3 | 4;

export const AIScheduleImportModal: React.FC<AIScheduleImportModalProps> = ({
  isOpen,
  onClose,
  onImportSuccess,
}) => {
  const [currentStep, setCurrentStep] = useState<ImportStep>(1);

  // Step 1: Prompt Options
  const [promptOptions, setPromptOptions] = useState<PromptOptions>({
    includeAfghanPrayerBuffers: true,
    insertAutoBufferBreaks: true,
    enableAutoCrossModuleLinking: true,
    enableWindowsToastReminders: true,
  });
  const [isCopied, setIsCopied] = useState(false);
  const [activeSubjects, setActiveSubjects] = useState<string[]>([]);

  // Step 2: Input & Parsing
  const [jsonInput, setJsonInput] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ path: string; message: string }[]>([]);

  // Step 3: Parsed Items & Conflict Resolver
  const [parsedItems, setParsedItems] = useState<AIImportItem[]>([]);
  const [conflictsCount, setConflictsCount] = useState<number>(0);
  const [conflictIndices, setConflictIndices] = useState<Set<number>>(new Set());

  // Step 4: Atomic Commit
  const [isCommitting, setIsCommitting] = useState(false);
  const [commitResult, setCommitResult] = useState<{ importedCount: number; linkedSubjectsCount: number } | null>(null);

  // Load active academic subjects for prompt context
  useEffect(() => {
    if (isOpen) {
      db.query<{ name: string }>('SELECT name FROM subjects WHERE is_deleted = 0')
        .then((rows) => setActiveSubjects(rows.map((r) => r.name)))
        .catch(() => setActiveSubjects([]));

      // Reset wizard state on open
      setCurrentStep(1);
      setParseError(null);
      setFieldErrors([]);
      setCommitResult(null);
    }
  }, [isOpen]);

  // Handle Copy Prompt
  const handleCopyPrompt = async () => {
    try {
      const prompt = aiScheduleImporterService.generateMasterInterviewerPrompt({
        ...promptOptions,
        existingSubjects: activeSubjects,
      });
      await navigator.clipboard.writeText(prompt);
      setIsCopied(true);
      toast.success('پرامپت ارشد مدیریت زمان با موفقیت کپی شد!');
      setTimeout(() => setIsCopied(false), 3000);
    } catch {
      toast.error('خطا در کپی پرامپت به کلیپ‌بورد.');
    }
  };

  // Handle Drag & Drop of .json file
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (file.type === 'application/json' || file.name.endsWith('.json')) {
        const reader = new FileReader();
        reader.onload = (event) => {
          const content = event.target?.result as string;
          setJsonInput(content);
          toast.info(`فایل ${file.name} بارگذاری شد.`);
        };
        reader.readAsText(file);
      } else {
        toast.error('لطفاً یک فایل معتبر با پسوند .json انتخاب کنید.');
      }
    }
  };

  // Step 2 -> 3: Parse and Validate JSON
  const handleParseAndProceed = () => {
    setParseError(null);
    setFieldErrors([]);

    const result = aiScheduleImporterService.parseScheduleJson(jsonInput);
    if (!result.success) {
      setParseError(result.error || 'خطای اعتبارسنجی JSON');
      setFieldErrors(result.fieldErrors || []);
      toast.error('خطا در اعتبارسنجی داده‌های ورودی');
      return;
    }

    const items = result.items || [];
    setParsedItems(items);

    // Run conflict detection
    const conflicts = aiScheduleImporterService.detectConflicts(items);
    setConflictsCount(conflicts.conflictsCount);
    setConflictIndices(conflicts.conflictIndices);

    setCurrentStep(3);
    toast.success(`${items.length} آیتم زمان‌بندی با موفقیت اعتبارسنجی شد.`);
  };

  // Step 3: Auto-Resolve Conflicts
  const handleAutoResolveConflicts = () => {
    const resolved = aiScheduleImporterService.autoResolveConflicts(parsedItems, 15);
    setParsedItems([...resolved]);

    const conflicts = aiScheduleImporterService.detectConflicts(resolved);
    setConflictsCount(conflicts.conflictsCount);
    setConflictIndices(conflicts.conflictIndices);

    toast.success('هم‌پوشانی‌ها برطرف شد و زمان‌های استراحت افزوده گردید.');
  };

  // Step 3 -> 4: Atomic Commit
  const handleCommitImport = async () => {
    setIsCommitting(true);
    try {
      const res = await aiScheduleImporterService.commitScheduleImport(parsedItems);
      if (res.success) {
        setCommitResult({
          importedCount: res.importedCount,
          linkedSubjectsCount: res.linkedSubjectsCount,
        });
        setCurrentStep(4);
        toast.success(`${res.importedCount} برنامه در تقویم و موتور وظایف ثبت شد.`);
        if (onImportSuccess) {
          onImportSuccess();
        }
      } else {
        toast.error(res.error || 'خطا در ثبت تراکنش پایگاه داده');
      }
    } catch (err: any) {
      toast.error(err.message || 'خطا در ثبت برنامه');
    } finally {
      setIsCommitting(false);
    }
  };

  const formatTimeRange = (startStr: string, endStr: string) => {
    try {
      const s = new Date(startStr);
      const e = new Date(endStr);
      const sTime = `${String(s.getHours()).padStart(2, '0')}:${String(s.getMinutes()).padStart(2, '0')}`;
      const eTime = `${String(e.getHours()).padStart(2, '0')}:${String(e.getMinutes()).padStart(2, '0')}`;
      return `${sTime} - ${eTime}`;
    } catch {
      return `${startStr} - ${endStr}`;
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="موتور هوشمند واردسازی برنامه زمان‌بندی (AI Schedule Engine)"
      description="تولید پرامپت ارشد، مصاحبه تعاملی، اعتبارسنجی Zod و حل هوشمند تداخل‌ها"
      size="xl"
      footer={
        <div className="flex items-center justify-between w-full">
          {/* Step Indicator */}
          <div className="flex items-center gap-1.5 text-xs text-[#8a8a8a]">
            <span>مرحله {currentStep} از ۴:</span>
            <span className="font-bold text-[#1f1f1f] dark:text-white">
              {currentStep === 1 && 'تنظیم و کپی پرامپت'}
              {currentStep === 2 && 'ورود و تحلیل JSON'}
              {currentStep === 3 && 'پیش‌نمایش و حل تداخل'}
              {currentStep === 4 && 'تکمیل و ثبت در سیستم'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {currentStep === 2 && (
              <Button variant="secondary" size="sm" onClick={() => setCurrentStep(1)}>
                <ArrowRight className="w-3.5 h-3.5 ms-1 rtl:rotate-180" />
                مرحله قبل
              </Button>
            )}

            {currentStep === 3 && (
              <Button variant="secondary" size="sm" onClick={() => setCurrentStep(2)}>
                <ArrowRight className="w-3.5 h-3.5 ms-1 rtl:rotate-180" />
                ویرایش JSON
              </Button>
            )}

            {currentStep === 1 && (
              <Button
                variant="primary"
                size="sm"
                onClick={() => setCurrentStep(2)}
                icon={<ArrowLeft className="w-3.5 h-3.5 rtl:rotate-180" />}
              >
                رفتن به مرحله ورود JSON
              </Button>
            )}

            {currentStep === 2 && (
              <Button
                variant="primary"
                size="sm"
                onClick={handleParseAndProceed}
                disabled={!jsonInput.trim()}
                icon={<ArrowLeft className="w-3.5 h-3.5 rtl:rotate-180" />}
              >
                اعتبارسنجی و پیش‌نمایش
              </Button>
            )}

            {currentStep === 3 && (
              <Button
                variant="primary"
                size="sm"
                onClick={handleCommitImport}
                disabled={isCommitting || parsedItems.length === 0}
                icon={isCommitting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
              >
                {isCommitting ? 'در حال ثبت در پایگاه داده...' : 'ثبت نهایی در تقویم و تسک‌ها'}
              </Button>
            )}

            {currentStep === 4 && (
              <Button variant="primary" size="sm" onClick={onClose}>
                بستن و مشاهده تقویم
              </Button>
            )}
          </div>
        </div>
      }
    >
      {/* ─── STEP 1: PROMPT BUILDER ─── */}
      {currentStep === 1 && (
        <div className="space-y-4">
          <div className="p-3.5 rounded-xl bg-[#0078d4]/10 dark:bg-[#0078d4]/15 border border-[#0078d4]/20 flex items-start gap-3 text-start">
            <Sparkles className="w-5 h-5 text-[#0078d4] shrink-0 mt-0.5" />
            <div className="space-y-1 text-xs">
              <p className="font-bold text-[#0078d4] dark:text-[#60a5fa]">
                پرامپت مصاحبه‌گر ارشد مدیریت زمان و بهره‌وری MY ASCEND
              </p>
              <p className="text-[#555] dark:text-[#bbb] leading-relaxed">
                این پرامپت را کپی کنید و در ChatGPT، Claude یا Gemini قرار دهید. هوش مصنوعی با شما مصاحبه کرده، اهداف و ریتم کاری‌تان را می‌پرسد و برنامه نهایی را در قالب کد JSON منطبق بر اسکیمای استاندارد تحویل می‌دهد.
              </p>
            </div>
          </div>

          {/* Config switches */}
          <div className="p-4 rounded-xl bg-black/3 dark:bg-white/3 border border-black/5 dark:border-white/5 space-y-3.5">
            <div className="text-xs font-bold text-[#1f1f1f] dark:text-white">تنظیمات هوشمند پرامپت:</div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-white dark:bg-[#333] border border-black/5 dark:border-white/5">
                <span className="text-xs text-[#1f1f1f] dark:text-white font-medium">
                  پوشش اوقات نماز و استراحت (کابل)
                </span>
                <Toggle
                  checked={promptOptions.includeAfghanPrayerBuffers}
                  onChange={(checked) =>
                    setPromptOptions((prev) => ({ ...prev, includeAfghanPrayerBuffers: checked }))
                  }
                />
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-lg bg-white dark:bg-[#333] border border-black/5 dark:border-white/5">
                <span className="text-xs text-[#1f1f1f] dark:text-white font-medium">
                  فاصله‌های استراحت خودکار (۱۰-۱۵ دقیقه)
                </span>
                <Toggle
                  checked={promptOptions.insertAutoBufferBreaks}
                  onChange={(checked) =>
                    setPromptOptions((prev) => ({ ...prev, insertAutoBufferBreaks: checked }))
                  }
                />
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-lg bg-white dark:bg-[#333] border border-black/5 dark:border-white/5">
                <span className="text-xs text-[#1f1f1f] dark:text-white font-medium">
                  پیوند خودکار با مرکز اکادمیک و تمرکز عمیق
                </span>
                <Toggle
                  checked={promptOptions.enableAutoCrossModuleLinking}
                  onChange={(checked) =>
                    setPromptOptions((prev) => ({ ...prev, enableAutoCrossModuleLinking: checked }))
                  }
                />
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-lg bg-white dark:bg-[#333] border border-black/5 dark:border-white/5">
                <span className="text-xs text-[#1f1f1f] dark:text-white font-medium">
                  فعال‌سازی هشدارهای پس‌زمینه ویندوز (تست)
                </span>
                <Toggle
                  checked={promptOptions.enableWindowsToastReminders}
                  onChange={(checked) =>
                    setPromptOptions((prev) => ({ ...prev, enableWindowsToastReminders: checked }))
                  }
                />
              </div>
            </div>
          </div>

          {/* Active Academic Subjects Badge List */}
          {activeSubjects.length > 0 && (
            <div className="space-y-1 text-xs">
              <span className="text-[#8a8a8a]">دروس اکادمیک فعال شما که در پرامپت قید می‌شوند:</span>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {activeSubjects.map((name) => (
                  <Badge key={name} variant="accent" size="sm">
                    {name}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Copy Prompt Action Button */}
          <div className="pt-2 flex justify-center">
            <Button
              variant="primary"
              size="md"
              onClick={handleCopyPrompt}
              className="w-full py-2.5 text-sm font-bold shadow-md"
              icon={isCopied ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
            >
              {isCopied ? 'پرامپت کپی شد! آماده برای استفاده در مدل هوش مصنوعی' : 'کپی پرامپت مصاحبه‌گر ارشد (Copy Master Prompt)'}
            </Button>
          </div>
        </div>
      )}

      {/* ─── STEP 2: JSON INPUT & PARSING ─── */}
      {currentStep === 2 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#1f1f1f] dark:text-white">
              کد JSON خروجی مصاحبه را وارد کنید:
            </span>
            <span className="text-[11px] text-[#8a8a8a]">
              پشتیبانی از قالب مستقیم یا مارک‌داون (```json)
            </span>
          </div>

          {/* Drag and Drop Zone */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`p-4 rounded-xl border-2 border-dashed transition-colors flex flex-col items-center justify-center gap-2 text-center cursor-pointer ${
              isDragging
                ? 'border-[#0078d4] bg-[#0078d4]/10'
                : 'border-black/15 dark:border-white/15 hover:border-[#0078d4]/50'
            }`}
          >
            <Upload className="w-6 h-6 text-[#8a8a8a]" />
            <div className="text-xs text-[#1f1f1f] dark:text-white font-medium">
              فایل JSON را به اینجا بکشید یا کد را در کادر زیر جای‌گذاری (Paste) کنید
            </div>
          </div>

          {/* Text Area */}
          <div className="space-y-1">
            <textarea
              rows={9}
              value={jsonInput}
              onChange={(e) => setJsonInput(e.target.value)}
              placeholder={`[\n  {\n    "title": "مطالعه ریاضی مهندسی",\n    "scheduled_start_time": "2026-09-20T08:00:00+04:30",\n    "scheduled_end_time": "2026-09-20T09:30:00+04:30",\n    "module_link": "academic_center",\n    "priority": "high"\n  }\n]`}
              className="w-full p-3 font-mono text-xs rounded-xl bg-black/3 dark:bg-white/3 border border-black/15 dark:border-white/15 focus:outline-none focus:border-[#0078d4] text-[#1f1f1f] dark:text-white resize-y"
              dir="ltr"
            />
          </div>

          {/* Error display */}
          {parseError && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs space-y-1.5 text-start">
              <div className="flex items-center gap-2 font-bold">
                <AlertTriangle className="w-4 h-4" />
                <span>{parseError}</span>
              </div>
              {fieldErrors.length > 0 && (
                <ul className="list-disc list-inside space-y-0.5 text-[11px] ps-2">
                  {fieldErrors.map((err, i) => (
                    <li key={i}>
                      <span className="font-mono font-semibold">{err.path}</span>: {err.message}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      )}

      {/* ─── STEP 3: TIMELINE PREVIEW & CONFLICT RESOLVER ─── */}
      {currentStep === 3 && (
        <div className="space-y-4">
          {/* Conflict Banner & 1-Click Resolve Button */}
          {conflictsCount > 0 ? (
            <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between gap-3 text-start">
              <div className="flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400">
                <AlertTriangle className="w-5 h-5 shrink-0" />
                <div>
                  <span className="font-bold">{conflictsCount} تداخل زمانی شناسایی شد!</span>
                  <p className="text-[11px] opacity-90 mt-0.5">
                    برخی بخش‌های زمانی دارای هم‌پوشانی هستند. با فشردن دکمه زیر، ساعات کاری به صورت خودکار با افزودن فاصله تنفس اصلاح می‌شوند.
                  </p>
                </div>
              </div>

              <Button
                variant="primary"
                size="sm"
                onClick={handleAutoResolveConflicts}
                className="shrink-0 bg-amber-600 hover:bg-amber-700 text-white"
                icon={<RefreshCw className="w-3.5 h-3.5" />}
              >
                حل خودکار تداخل‌ها
              </Button>
            </div>
          ) : (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs flex items-center gap-2 text-start">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>تمام بخش‌های زمانی هماهنگ بوده و بدون تداخل هستند.</span>
            </div>
          )}

          {/* Timeline Items Preview */}
          <div className="space-y-2 max-h-[350px] overflow-y-auto pe-1">
            {parsedItems.map((item, index) => {
              const isConflicting = conflictIndices.has(index);

              return (
                <div
                  key={index}
                  className={`p-3 rounded-xl border transition-all text-start flex items-center justify-between gap-3 ${
                    isConflicting
                      ? 'bg-rose-500/5 border-rose-500/40 shadow-sm'
                      : 'bg-black/2 dark:bg-white/2 border-black/8 dark:border-white/8 hover:border-black/15 dark:hover:border-white/15'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-black/5 dark:bg-white/5 shrink-0 text-center font-mono">
                      <Clock className="w-4 h-4 mx-auto text-[#0078d4]" />
                      <span className="text-[10px] text-[#666] dark:text-[#aaa] block mt-1">
                        {formatTimeRange(item.scheduled_start_time, item.scheduled_end_time)}
                      </span>
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-[#1f1f1f] dark:text-white">
                          {item.title}
                        </span>
                        {isConflicting && (
                          <Badge variant="error" size="sm">
                            ⚠️ هم‌پوشانی زمانی
                          </Badge>
                        )}
                      </div>

                      {item.description && (
                        <p className="text-[11px] text-[#666] dark:text-[#aaa] line-clamp-1">
                          {item.description}
                        </p>
                      )}

                      <div className="flex items-center gap-1.5 pt-0.5">
                        {item.module_link === 'academic_center' && (
                          <Badge variant="accent" size="sm">
                            <BookOpen className="w-2.5 h-2.5 me-1 inline" />
                            {item.academic_subject_title || 'مرکز اکادمیک'}
                          </Badge>
                        )}

                        {item.module_link === 'focus_engine' && (
                          <Badge variant="warning" size="sm">
                            <Flame className="w-2.5 h-2.5 me-1 inline" />
                            تمرکز عمیق
                          </Badge>
                        )}

                        {item.priority && item.priority !== 'medium' && (
                          <Badge
                            variant={item.priority === 'urgent' ? 'error' : 'neutral'}
                            size="sm"
                          >
                            {item.priority}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="text-end font-mono text-[10px] text-[#8a8a8a]">
                    {item.reminder_offset_minutes
                      ? `هشدار: ${item.reminder_offset_minutes} دقیقه قبل`
                      : 'بدون هشدار'}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ─── STEP 4: ATOMIC COMMIT CONFIRMATION ─── */}
      {currentStep === 4 && (
        <div className="p-6 text-center space-y-4">
          <div className="w-14 h-14 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto border border-emerald-500/20">
            <CheckCircle2 className="w-8 h-8" />
          </div>

          <div className="space-y-1">
            <h3 className="text-base font-bold text-[#1f1f1f] dark:text-white">
              برنامه زمان‌بندی با موفقیت ثبت شد!
            </h3>
            <p className="text-xs text-[#8a8a8a]">
              تمام تسک‌ها و بلوک‌های تقویم به صورت هم‌گام در پایگاه داده محلی ذخیره شدند.
            </p>
          </div>

          {commitResult && (
            <div className="grid grid-cols-2 gap-3 max-w-sm mx-auto text-start">
              <div className="p-3 rounded-xl bg-black/3 dark:bg-white/3 border border-black/5 dark:border-white/5">
                <span className="text-[11px] text-[#8a8a8a] block">تعداد آیتم‌های ثبت‌شده:</span>
                <span className="text-lg font-bold text-[#1f1f1f] dark:text-white font-mono">
                  {commitResult.importedCount}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-black/3 dark:bg-white/3 border border-black/5 dark:border-white/5">
                <span className="text-[11px] text-[#8a8a8a] block">دروس پیوندخورده:</span>
                <span className="text-lg font-bold text-[#0078d4] dark:text-[#60a5fa] font-mono">
                  {commitResult.linkedSubjectsCount}
                </span>
              </div>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
};
