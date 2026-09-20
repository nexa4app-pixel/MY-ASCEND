/**
 * Interactive AI Interviewer Schedule Importer Engine — MY ASCEND
 * Zod Schema Validation, System Prompt Generator, Resilient JSON Extraction,
 * Conflict Detection, and Atomic SQLite Bulk Commit.
 */

import { z } from 'zod';
import { db } from '../db/client';
import { unifiedScheduleService } from './unifiedScheduleService';
import { taskSchedulerService } from './taskSchedulerService';
import { logger } from './logger';
import { TaskPriority, RecurrencePattern, ModuleLink } from '../types/database';

export const AIImportItemSchema = z.object({
  title: z.string().min(1, 'عنوان نمی‌تواند خالی باشد (Title is required)'),
  description: z.string().optional().nullable(),
  scheduled_start_time: z.string().min(5, 'زمان شروع الزامی است (Start time is required)'),
  scheduled_end_time: z.string().min(5, 'زمان پایان الزامی است (End time is required)'),
  priority: z.enum(['urgent', 'high', 'medium', 'low']).default('medium').optional(),
  module_link: z.enum(['focus_engine', 'academic_center', 'journal', 'none']).default('none').optional(),
  academic_subject_title: z.string().optional().nullable(),
  recurrence_pattern: z.enum(['none', 'daily', 'weekly', 'monthly', 'weekdays']).default('none').optional(),
  recurrence_days: z.array(z.string()).default([]).optional(),
  reminder_offset_minutes: z.number().int().min(0).max(1440).default(15).optional(),
  color_tag: z.string().optional().nullable(),
});

export const AIImportPayloadSchema = z.union([
  z.array(AIImportItemSchema),
  z.object({
    schedule: z.array(AIImportItemSchema),
  }).transform((obj) => obj.schedule),
  z.object({
    items: z.array(AIImportItemSchema),
  }).transform((obj) => obj.items),
  z.object({
    tasks: z.array(AIImportItemSchema),
  }).transform((obj) => obj.tasks),
]);

export type AIImportItem = z.infer<typeof AIImportItemSchema>;

export interface PromptOptions {
  includeAfghanPrayerBuffers: boolean;
  insertAutoBufferBreaks: boolean;
  enableAutoCrossModuleLinking: boolean;
  enableWindowsToastReminders: boolean;
  existingSubjects?: string[];
  userGoalContext?: string;
}

export interface ParseResult {
  success: boolean;
  items?: AIImportItem[];
  error?: string;
  fieldErrors?: { path: string; message: string }[];
}

export interface CommitResult {
  success: boolean;
  importedCount: number;
  linkedSubjectsCount: number;
  error?: string;
}

class AIScheduleImporterService {
  /**
   * Builds the Master Interviewer Prompt for external AI models (ChatGPT, Claude, Gemini)
   */
  public generateMasterInterviewerPrompt(options: PromptOptions): string {
    const prayerDirective = options.includeAfghanPrayerBuffers
      ? `
- **AFGHAN PRAYER & REST BUFFERS (Kabul Time / Asia:Kabul UTC+04:30):**
  You MUST protect and schedule around the 5 daily prayer windows with mindful buffers:
  * Fajr (صبح): 04:45 - 05:15 (Morning prayer & reflection)
  * Dhuhr (پیشین): 11:55 - 12:35 (Midday prayer & lunch rest)
  * Asr (دیگر): 15:45 - 16:15 (Afternoon prayer & recharge)
  * Maghrib (شام): 18:10 - 18:45 (Sunset prayer & evening transition)
  * Isha (خفتن): 19:40 - 20:15 (Night prayer & daily wind-down)
  DO NOT schedule intensive academic study or deep focus during these sacred buffer zones.`
      : '';

    const bufferDirective = options.insertAutoBufferBreaks
      ? `
- **COGNITIVE BUFFER BREAKS:**
  Always insert a 10 to 15-minute rest/buffer block between consecutive intense sessions (45m-90m deep work). Label these blocks with title "تجدید قوا / Buffer Break" and module_link: "none".`
      : '';

    const crossLinkDirective = options.enableAutoCrossModuleLinking
      ? `
- **CROSS-MODULE LINKAGES:**
  * For university/school study sessions, assign module_link: "academic_center" and set "academic_subject_title" to the exact subject name${
    options.existingSubjects && options.existingSubjects.length > 0
      ? ` (Available active subjects: ${options.existingSubjects.map((s) => `"${s}"`).join(', ')})`
      : ''
  }.
  * For deep work, writing, programming, or focused execution, assign module_link: "focus_engine".
  * For evening reflections, journaling, or day reviews, assign module_link: "journal".
  * For general errands, breaks, or routine chores, assign module_link: "none".`
      : '';

    const toastDirective = options.enableWindowsToastReminders
      ? `
- **NATIVE WINDOWS TOAST REMINDERS:**
  Assign reminder_offset_minutes: 15 to important tasks and academic sessions so MY ASCEND triggers desktop alerts before start.`
      : '';

    return `# ROLE & IDENTITY: SENIOR PRODUCTIVITY & ACADEMIC COACH — MY ASCEND

You are the Senior Executive Productivity Architect and Academic Performance Coach for the **MY ASCEND** desktop operating system. Your mission is to interview the user interactively, uncover their core goals, cognitive rhythms, and academic/professional commitments, construct an optimized daily or weekly time-blocked schedule, and export it into MY ASCEND's strict JSON import schema.

---

### INTERACTIVE INTERVIEW PROTOCOL (Step-by-Step):
1. **Welcome & Rapid Assessment**: Greet the user in Dari/Persian (or English if addressed in English) warmly and professionally. Ask about:
   - Their primary academic courses or major work projects.
   - Their target date or week (e.g., this week, tomorrow, or a specific date in ISO YYYY-MM-DD format).
   - Their peak cognitive hours (Early Morning, Afternoon, or Night Owl).
   - Any fixed commitments (classes, work shifts, meetings).
2. **Co-Crafting the Schedule**: Formulate an initial balanced draft. Ask the user if they'd like adjustments to session lengths, break times, or focus priorities.
3. **Approval & Schema Export**: Once the user approves the drafted schedule, output the FINAL result in a SINGLE raw JSON code block adhering strictly to the schema below.

---

### CRITICAL SCHEDULING RULES:
${prayerDirective}
${bufferDirective}
${crossLinkDirective}
${toastDirective}
- Use valid ISO-8601 DateTime strings for \`scheduled_start_time\` and \`scheduled_end_time\` (e.g. \`2026-09-20T08:00:00.000Z\` or local ISO format \`2026-09-20T08:00:00+04:30\`).
- Ensure no accidental overlapping time slots.

---

### STRICT JSON EXPORT FORMAT:
When generating the final approved schedule, output ONLY a valid JSON array or object in this exact schema:

\`\`\`json
[
  {
    "title": "مطالعه نظریه محاسبات (Turing Machines)",
    "description": "حل تمارین فصل سوم و مرور حالات توقف",
    "scheduled_start_time": "2026-09-20T08:00:00+04:30",
    "scheduled_end_time": "2026-09-20T09:30:00+04:30",
    "priority": "high",
    "module_link": "academic_center",
    "academic_subject_title": "نظریه محاسبات",
    "recurrence_pattern": "none",
    "recurrence_days": [],
    "reminder_offset_minutes": 15,
    "color_tag": "#0078d4"
  },
  {
    "title": "جلسه تمرکز عمیق برنامه‌نویسی",
    "description": "توسعه ماژول هوش مصنوعی سیستم",
    "scheduled_start_time": "2026-09-20T09:45:00+04:30",
    "scheduled_end_time": "2026-09-20T11:15:00+04:30",
    "priority": "urgent",
    "module_link": "focus_engine",
    "academic_subject_title": null,
    "recurrence_pattern": "none",
    "recurrence_days": [],
    "reminder_offset_minutes": 15,
    "color_tag": "#d83b01"
  }
]
\`\`\`

Start by asking the user for their goals and commitments for the schedule!`;
  }

  /**
   * Resilient JSON extraction and Zod schema validation
   */
  public parseScheduleJson(rawInput: string): ParseResult {
    if (!rawInput || !rawInput.trim()) {
      return { success: false, error: 'متن ورودی نمی‌تواند خالی باشد.' };
    }

    let cleaned = rawInput.trim();

    // Strip markdown code block wrappers if present (e.g. ```json ... ```)
    const markdownRegex = /```(?:json)?\s*([\s\S]*?)\s*```/i;
    const match = cleaned.match(markdownRegex);
    if (match && match[1]) {
      cleaned = match[1].trim();
    } else {
      // Find outermost '[' and ']' or '{' and '}'
      const firstBracket = cleaned.indexOf('[');
      const lastBracket = cleaned.lastIndexOf(']');
      const firstBrace = cleaned.indexOf('{');
      const lastBrace = cleaned.lastIndexOf('}');

      if (firstBracket !== -1 && lastBracket > firstBracket) {
        cleaned = cleaned.substring(firstBracket, lastBracket + 1);
      } else if (firstBrace !== -1 && lastBrace > firstBrace) {
        cleaned = cleaned.substring(firstBrace, lastBrace + 1);
      }
    }

    // Try parsing JSON
    let parsedJson: any;
    try {
      parsedJson = JSON.parse(cleaned);
    } catch (err: any) {
      return {
        success: false,
        error: `خطا در ساختار JSON: ${err.message || 'قالب داده نامعتبر است'}`,
      };
    }

    // Validate with Zod
    const validation = AIImportPayloadSchema.safeParse(parsedJson);
    if (!validation.success) {
      const fieldErrors = validation.error.issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message,
      }));

      return {
        success: false,
        error: 'اعتبارسنجی فیلدهای JSON با شکست مواجه شد. لطفاً خطاهای زیر را بررسی نمایید.',
        fieldErrors,
      };
    }

    // Normalizing dates to ISO strings if needed
    const items = validation.data.map((item) => {
      let start = item.scheduled_start_time;
      let end = item.scheduled_end_time;

      // Handle simple time strings like "09:00" by attaching today's date
      const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
      const todayDate = new Date().toISOString().split('T')[0];

      if (timeRegex.test(start)) {
        start = `${todayDate}T${start}:00.000Z`;
      }
      if (timeRegex.test(end)) {
        end = `${todayDate}T${end}:00.000Z`;
      }

      return {
        ...item,
        scheduled_start_time: start,
        scheduled_end_time: end,
      };
    });

    return {
      success: true,
      items,
    };
  }

  /**
   * Conflict Detection on parsed AI items
   */
  public detectConflicts(items: AIImportItem[]): { hasConflict: boolean; conflictsCount: number; conflictIndices: Set<number> } {
    const conflictIndices = new Set<number>();

    for (let i = 0; i < items.length; i++) {
      for (let j = i + 1; j < items.length; j++) {
        const aStart = new Date(items[i].scheduled_start_time).getTime();
        const aEnd = new Date(items[i].scheduled_end_time).getTime();
        const bStart = new Date(items[j].scheduled_start_time).getTime();
        const bEnd = new Date(items[j].scheduled_end_time).getTime();

        if (aStart < bEnd && aEnd > bStart) {
          conflictIndices.add(i);
          conflictIndices.add(j);
        }
      }
    }

    return {
      hasConflict: conflictIndices.size > 0,
      conflictsCount: conflictIndices.size,
      conflictIndices,
    };
  }

  /**
   * Auto-Resolve Conflicts: Shifts conflicting items by duration + bufferMinutes
   */
  public autoResolveConflicts(items: AIImportItem[], bufferMinutes: number = 15): AIImportItem[] {
    return unifiedScheduleService.resolveConflicts(items, bufferMinutes);
  }

  /**
   * Atomic Bulk Commit into SQLite in a single transaction
   */
  public async commitScheduleImport(items: AIImportItem[]): Promise<CommitResult> {
    if (items.length === 0) {
      return { success: true, importedCount: 0, linkedSubjectsCount: 0 };
    }

    try {
      // Query active subjects for auto-linking
      const subjects = await db.query<{ id: string; name: string }>('SELECT id, name FROM subjects WHERE is_deleted = 0');
      let linkedSubjectsCount = 0;

      // Begin atomic transaction
      await db.execute('BEGIN TRANSACTION');

      for (const item of items) {
        let subjectId: string | null = null;

        if (item.module_link === 'academic_center' && item.academic_subject_title) {
          const target = item.academic_subject_title.trim().toLowerCase();
          const matched = subjects.find(
            (s) => s.name.toLowerCase() === target || s.name.toLowerCase().includes(target)
          );
          if (matched) {
            subjectId = matched.id;
            linkedSubjectsCount++;
          }
        }

        await unifiedScheduleService.createScheduledTask({
          title: item.title,
          description: item.description,
          scheduledStartTime: item.scheduled_start_time,
          scheduledEndTime: item.scheduled_end_time,
          priority: (item.priority as TaskPriority) || 'medium',
          status: 'todo',
          moduleLink: (item.module_link as ModuleLink) || 'none',
          academicSubjectId: subjectId,
          recurrencePattern: (item.recurrence_pattern as RecurrencePattern) || 'none',
          recurrenceDays: item.recurrence_days || [],
          reminderOffsetMinutes: item.reminder_offset_minutes ?? 15,
          colorTag: item.color_tag || (item.module_link === 'focus_engine' ? '#d83b01' : '#0078d4'),
        });
      }

      await db.execute('COMMIT');
      logger.info(`Bulk committed ${items.length} items to SQLite successfully.`, 'AIScheduleImporterService');

      // Schedule background notification checks
      try {
        await taskSchedulerService.checkDueTasks();
      } catch (err) {
        console.warn('Background checkDueTasks triggered after import:', err);
      }

      return {
        success: true,
        importedCount: items.length,
        linkedSubjectsCount,
      };
    } catch (err: any) {
      await db.execute('ROLLBACK');
      logger.error('Failed to commit schedule import transaction, rolled back:', 'AIScheduleImporterService', err);
      return {
        success: false,
        importedCount: 0,
        linkedSubjectsCount: 0,
        error: err.message || 'خطا در ثبت تراکنش پایگاه داده',
      };
    }
  }
}

export const aiScheduleImporterService = new AIScheduleImporterService();
