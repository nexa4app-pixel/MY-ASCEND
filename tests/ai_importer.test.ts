import { describe, it, expect } from 'vitest';
import {
  aiScheduleImporterService,
  AIImportItemSchema,
  AIImportPayloadSchema,
  AIImportItem,
} from '../src/services/aiScheduleImporterService';

describe('Interactive AI Interviewer Schedule Importer Engine', () => {
  // ─── 1. Prompt Builder ───────────────────────────────────────────────────

  it('should generate master interviewer prompt with all options enabled', () => {
    const prompt = aiScheduleImporterService.generateMasterInterviewerPrompt({
      includeAfghanPrayerBuffers: true,
      insertAutoBufferBreaks: true,
      enableAutoCrossModuleLinking: true,
      enableWindowsToastReminders: true,
      existingSubjects: ['نظریه محاسبات', 'هوش مصنوعی'],
    });

    expect(prompt).toContain('SENIOR PRODUCTIVITY & ACADEMIC COACH');
    expect(prompt).toContain('AFGHAN PRAYER & REST BUFFERS');
    expect(prompt).toContain('Fajr');
    expect(prompt).toContain('Dhuhr');
    expect(prompt).toContain('COGNITIVE BUFFER BREAKS');
    expect(prompt).toContain('CROSS-MODULE LINKAGES');
    expect(prompt).toContain('نظریه محاسبات');
    expect(prompt).toContain('NATIVE WINDOWS TOAST REMINDERS');
    expect(prompt).toContain('STRICT JSON EXPORT FORMAT');
  });

  it('should omit prayer buffers when toggle is false', () => {
    const prompt = aiScheduleImporterService.generateMasterInterviewerPrompt({
      includeAfghanPrayerBuffers: false,
      insertAutoBufferBreaks: false,
      enableAutoCrossModuleLinking: false,
      enableWindowsToastReminders: false,
    });

    expect(prompt).not.toContain('AFGHAN PRAYER & REST BUFFERS');
    expect(prompt).not.toContain('COGNITIVE BUFFER BREAKS');
    expect(prompt).not.toContain('NATIVE WINDOWS TOAST REMINDERS');
  });

  // ─── 2. Zod Schema Validation ─────────────────────────────────────────────

  it('should validate a complete valid schedule item against Zod schema', () => {
    const raw = {
      title: 'مطالعه هوش مصنوعی',
      description: 'فصل جستجوی آگاهانه',
      scheduled_start_time: '2026-09-20T08:00:00.000Z',
      scheduled_end_time: '2026-09-20T09:30:00.000Z',
      priority: 'high',
      module_link: 'academic_center',
      academic_subject_title: 'هوش مصنوعی',
      recurrence_pattern: 'none',
      recurrence_days: [],
      reminder_offset_minutes: 15,
      color_tag: '#0078d4',
    };

    const parsed = AIImportItemSchema.parse(raw);
    expect(parsed.title).toBe('مطالعه هوش مصنوعی');
    expect(parsed.priority).toBe('high');
    expect(parsed.module_link).toBe('academic_center');
    expect(parsed.reminder_offset_minutes).toBe(15);
  });

  it('should fail validation when title is empty', () => {
    const raw = {
      title: '',
      scheduled_start_time: '2026-09-20T08:00:00.000Z',
      scheduled_end_time: '2026-09-20T09:30:00.000Z',
    };

    const res = AIImportItemSchema.safeParse(raw);
    expect(res.success).toBe(false);
  });

  it('should apply defaults for optional fields', () => {
    const raw = {
      title: 'جلسه مرور هفتگی',
      scheduled_start_time: '2026-09-20T10:00:00.000Z',
      scheduled_end_time: '2026-09-20T11:00:00.000Z',
    };

    const parsed = AIImportItemSchema.parse(raw);
    expect(parsed.priority).toBe('medium');
    expect(parsed.module_link).toBe('none');
    expect(parsed.recurrence_pattern).toBe('none');
    expect(parsed.reminder_offset_minutes).toBe(15);
  });

  it('should validate payloads wrapped in object keys (e.g. { schedule: [...] })', () => {
    const payload = {
      schedule: [
        {
          title: 'کار شماره ۱',
          scheduled_start_time: '2026-09-20T08:00:00.000Z',
          scheduled_end_time: '2026-09-20T09:00:00.000Z',
        },
      ],
    };

    const parsed = AIImportPayloadSchema.parse(payload);
    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed.length).toBe(1);
    expect(parsed[0].title).toBe('کار شماره ۱');
  });

  // ─── 3. Resilient JSON Parsing ────────────────────────────────────────────

  it('should parse raw JSON string', () => {
    const jsonStr = JSON.stringify([
      {
        title: 'برنامه‌ریزی روزانه',
        scheduled_start_time: '2026-09-20T08:00:00.000Z',
        scheduled_end_time: '2026-09-20T08:30:00.000Z',
      },
    ]);

    const result = aiScheduleImporterService.parseScheduleJson(jsonStr);
    expect(result.success).toBe(true);
    expect(result.items?.length).toBe(1);
    expect(result.items?.[0].title).toBe('برنامه‌ریزی روزانه');
  });

  it('should strip markdown code fences (```json ... ```)', () => {
    const markdownStr = `
در ادامه برنامه زمان‌بندی تایید شده شما آمده است:
\`\`\`json
[
  {
    "title": "جلسه کدنویسی با تمرکز عمیق",
    "scheduled_start_time": "2026-09-20T09:00:00.000Z",
    "scheduled_end_time": "2026-09-20T10:30:00.000Z",
    "module_link": "focus_engine"
  }
]
\`\`\`
موفق باشید!`;

    const result = aiScheduleImporterService.parseScheduleJson(markdownStr);
    expect(result.success).toBe(true);
    expect(result.items?.length).toBe(1);
    expect(result.items?.[0].title).toBe('جلسه کدنویسی با تمرکز عمیق');
    expect(result.items?.[0].module_link).toBe('focus_engine');
  });

  it('should report friendly error for malformed JSON', () => {
    const brokenJson = `[ { "title": "ناتمام" `;
    const result = aiScheduleImporterService.parseScheduleJson(brokenJson);
    expect(result.success).toBe(false);
    expect(result.error).toContain('خطا در ساختار JSON');
  });

  // ─── 4. Conflict Detection Algorithm ──────────────────────────────────────

  it('should detect overlapping time blocks correctly', () => {
    const items: AIImportItem[] = [
      {
        title: 'بلوک ۱',
        scheduled_start_time: '2026-09-20T08:00:00.000Z',
        scheduled_end_time: '2026-09-20T09:30:00.000Z',
        priority: 'medium',
        module_link: 'none',
        recurrence_pattern: 'none',
        reminder_offset_minutes: 15,
      },
      {
        title: 'بلوک ۲ (تداخل با ۱)',
        scheduled_start_time: '2026-09-20T09:00:00.000Z',
        scheduled_end_time: '2026-09-20T10:00:00.000Z',
        priority: 'high',
        module_link: 'none',
        recurrence_pattern: 'none',
        reminder_offset_minutes: 15,
      },
      {
        title: 'بلوک ۳ (بدون تداخل)',
        scheduled_start_time: '2026-09-20T11:00:00.000Z',
        scheduled_end_time: '2026-09-20T12:00:00.000Z',
        priority: 'low',
        module_link: 'none',
        recurrence_pattern: 'none',
        reminder_offset_minutes: 15,
      },
    ];

    const conflicts = aiScheduleImporterService.detectConflicts(items);
    expect(conflicts.hasConflict).toBe(true);
    expect(conflicts.conflictsCount).toBe(2);
    expect(conflicts.conflictIndices.has(0)).toBe(true);
    expect(conflicts.conflictIndices.has(1)).toBe(true);
    expect(conflicts.conflictIndices.has(2)).toBe(false);
  });

  it('should return no conflicts for strictly sequential or adjacent blocks', () => {
    const items: AIImportItem[] = [
      {
        title: 'بلوک اول',
        scheduled_start_time: '2026-09-20T08:00:00.000Z',
        scheduled_end_time: '2026-09-20T09:00:00.000Z',
      },
      {
        title: 'بلوک دوم (بلافاصله بعد)',
        scheduled_start_time: '2026-09-20T09:00:00.000Z',
        scheduled_end_time: '2026-09-20T10:00:00.000Z',
      },
    ];

    const conflicts = aiScheduleImporterService.detectConflicts(items);
    expect(conflicts.hasConflict).toBe(false);
    expect(conflicts.conflictsCount).toBe(0);
  });

  // ─── 5. Smart Conflict Resolution & Buffer-Time Insertion ─────────────────

  it('should auto-resolve overlapping conflicts by shifting block start and inserting buffer time', () => {
    const conflictingItems: AIImportItem[] = [
      {
        title: 'جلسه اول',
        scheduled_start_time: '2026-09-20T08:00:00.000Z',
        scheduled_end_time: '2026-09-20T09:00:00.000Z', // duration: 60m
      },
      {
        title: 'جلسه دوم متداخل',
        scheduled_start_time: '2026-09-20T08:30:00.000Z', // overlaps with first
        scheduled_end_time: '2026-09-20T09:30:00.000Z', // duration: 60m
      },
    ];

    // Auto-resolve with 15 minutes buffer break
    const resolved = aiScheduleImporterService.autoResolveConflicts(conflictingItems, 15);

    expect(resolved.length).toBe(2);
    // First block unchanged
    expect(resolved[0].scheduled_start_time).toBe('2026-09-20T08:00:00.000Z');
    expect(resolved[0].scheduled_end_time).toBe('2026-09-20T09:00:00.000Z');

    // Second block shifted to 09:00 + 15m = 09:15, with 60m duration => 10:15
    const secondStart = new Date(resolved[1].scheduled_start_time).getTime();
    const secondEnd = new Date(resolved[1].scheduled_end_time).getTime();
    const firstEnd = new Date(resolved[0].scheduled_end_time).getTime();

    expect(secondStart).toBe(firstEnd + 15 * 60 * 1000);
    expect(secondEnd - secondStart).toBe(60 * 60 * 1000);

    // Re-check conflict status
    const postConflicts = aiScheduleImporterService.detectConflicts(resolved);
    expect(postConflicts.hasConflict).toBe(false);
  });
});
