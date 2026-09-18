export type Locale = 'fa' | 'en';
export type Direction = 'rtl' | 'ltr';

export const translations = {
  fa: {
    // Navigation & Routes
    routes: {
      dashboard: 'داشبورد',
      inbox: 'صندوق ورودی',
      tasks: 'وظایف و اقدام',
      focus: 'موتور تمرکز',
      schedule: 'تقویم و زمان‌بندی',
      management: 'مدیریت و اهداف',
      academic: 'مرکز آکادمیک',
      journal: 'دفترچه خاطرات و تجارب',
      analytics: 'تحلیل و رشد (AGS)',
      life: 'سبک زندگی',
      settings: 'تنظیمات',
      diagnostic: 'عیب‌یابی پایگاه داده',
    },

    // Persona
    persona: {
      personal: 'شخصی',
      academic: 'آکادمیک',
      professional: 'کاری و حرفه‌ای',
    },

    // Topbar & Actions
    topbar: {
      searchPlaceholder: 'جستجوی سراسری...',
      searchTooltip: 'جستجوی پیشرفته در تمام سیستم (Ctrl+K)',
      quickCapture: 'ثبت سریع',
      quickCaptureTooltip: 'ثبت سریع یادداشت یا ایده (Ctrl+Shift+C)',
      activeFocus: 'جلسه تمرکز فعال',
      toggleTheme: 'تغییر پوسته (سیستم / تاریک / روشن)',
      toggleLanguage: 'تغییر زبان به انگلیسی (LTR)',
      today: 'امروز',
    },

    // Common UI
    common: {
      save: 'ذخیره',
      cancel: 'انصراف',
      delete: 'حذف',
      edit: 'ویرایش',
      close: 'بستن',
      refresh: 'بروزرسانی',
      loading: 'در حال بارگذاری...',
      empty: 'موردی یافت نشد',
      filter: 'فیلتر',
      all: 'همه',
      active: 'فعال',
      completed: 'تکمیل‌شده',
      pending: 'در انتظار',
      archived: 'بایگانی‌شده',
      total: 'کل',
      back: 'بازگشت',
      confirm: 'تأیید',
      actions: 'عملیات',
      search: 'جستجو',
      details: 'جزئیات',
      status: 'وضعیت',
      priority: 'اولویت',
      date: 'تاریخ',
      title: 'عنوان',
      description: 'توضیحات',
      category: 'دسته‌بندی',
      tags: 'برچسب‌ها',
      notes: 'یادداشت‌ها',
      reload: 'بارگذاری مجدد',
      success: 'عملیات با موفقیت انجام شد',
      error: 'خطایی رخ داد',
    },

    // Dashboard
    dashboard: {
      title: 'داشبورد جامع فردی و آکادمیک',
      description: 'سامانه یکپارچه مدیریت حافظه، رشد فردی، تمرکز و یادگیری آکادمیک MY ASCEND',
      badge: 'نسخه فعال',
      welcomeTitle: 'خوش آمدید به MY ASCEND',
      welcomeSubtitle: 'زیرساخت ابری محلی، آماده و پایدار',
      welcomeDesc: 'تمام خدمات پایگاه داده SQLite، تمرکز عمیق، مدیریت ماتریس آیزنهاور، الگوریتم تکرار فاصله‌دار و ژورنال روزانه در اختیار شماست.',
      quickStats: 'خلاصه وضعیت',
      tasksCompleted: 'وظایف تکمیل‌شده',
      focusMinutes: 'دقیقه تمرکز عمیق',
      masteredTopics: 'مباحث مسلط‌شده',
      journalEntries: 'یادداشت‌های ژورنال',
      recentActivity: 'فعالیت‌های اخیر',
      pillarsTitle: 'ستون‌های ساختاری سیستم',
      pillarDbTitle: 'موتور پایگاه داده محلی',
      pillarDbDesc: 'پایگاه داده رمزنگاری‌شده محلی با ۳۲ جدول استاندارد، کشینگ سریع و پشتیبان‌گیری آنی.',
      pillarFluentTitle: 'طراحی شیشه‌ای مایکروسافت',
      pillarFluentDesc: 'رابط کاربری مدرن Fluent با سطوح مایکا، کنتراست پویا و تایپوگرافی چشم‌نواز.',
      pillarAscendTitle: 'شاخص رشد فردی (AGS)',
      pillarAscendDesc: 'الگوریتم جامع امتیازدهی به رشد تحصیلی، بهره‌وری و خودآگاهی فردی.',
    },

    // Inbox
    inbox: {
      title: 'صندوق ورودی و غربال‌گری',
      description: 'سامانه دریافت سریع افکار، ایده‌ها و تبدیل هوشمند به یادداشت، وظیفه یا بازتاب روزانه',
      badge: 'فاز ورودی‌ها',
      newCapture: 'ثبت ورودی جدید',
      inputPlaceholder: 'چه چیزی در ذهن دارید؟ بنویسید و دکمه ثبت را بزنید...',
      emptyState: 'صندوق ورودی شما خالی است. هر ایده، فکر یا وظیفه‌ای دارید فوراً ثبت کنید.',
      typeText: 'متن',
      typeLink: 'پیوند',
      typeAudio: 'صوتی',
      typeIdea: 'ایده',
      promoteToTask: 'تبدیل به وظیفه',
      promoteToJournal: 'انتقال به ژورنال',
      promoteToNote: 'ذخیره در یادداشت‌ها',
      triagedSuccess: 'ورودی با موفقیت پردازش شد',
      captureCreated: 'ورودی جدید ثبت شد',
      captureDeleted: 'ورودی حذف و به سطل بازیافت منتقل شد',
    },

    // Tasks & Eisenhower
    tasks: {
      title: 'مدیریت وظایف و موتور اقدام',
      description: 'اولویت‌بندی بر اساس ماتریس آیزنهاور، مدیریت پروژه‌ها و رهگیری پیشرفت',
      badge: 'موتور اقدام',
      newTask: 'وظیفه جدید',
      filterAll: 'همه وظایف',
      filterToday: 'وظایف امروز',
      filterUpcoming: 'آینده',
      filterCompleted: 'تکمیل‌شده‌ها',
      q1Title: 'مهم و فوری (انجام سریع)',
      q1Desc: 'بحران‌ها، ددلاین‌های نزدیک و موارد حیاتی',
      q2Title: 'مهم و غیرفوری (برنامه‌ریزی و رشد)',
      q2Desc: 'آموزش، اهداف بلندمدت و سلامت',
      q3Title: 'غیرمهم و فوری (واگذاری یا مدیریت)',
      q3Desc: 'وققفه‌ها، تماس‌ها و کارهای اداری جاری',
      q4Title: 'غیرمهم و غیرفوری (حذف یا بازنگری)',
      q4Desc: 'کارهای اتلاف وقت و موارد حاشیه‌ای',
      emptyQuadrant: 'وظیفه‌ای در این ربع وجود ندارد',
      taskCreated: 'وظیفه با موفقیت ایجاد شد',
      taskUpdated: 'وظیفه بروزرسانی شد',
      taskDeleted: 'وظیفه حذف شد',
      toggleComplete: 'تغییر وضعیت انجام',
    },

    // Focus & Pomodoro
    focus: {
      title: 'موتور تمرکز و تایمر پومودورو',
      description: 'تایمرهای هوشمند تمرکز عمیق، مدیریت وقفه‌ها و جریان فکری پایدار',
      badge: 'تمرکز عمیق',
      modePomodoro: 'پومودورو (۲۵ دقیقه)',
      modeFlow50: 'جریان فکری (۵۰ دقیقه)',
      modeDeep90: 'تمرکز عمیق (۹۰ دقیقه)',
      modeCustom: 'سفارشی',
      start: 'شروع تمرکز',
      pause: 'مکث',
      resume: 'ادامه',
      reset: 'بازنشانی',
      interruption: 'ثبت وقفه',
      completedRounds: 'دورهای کامل‌شده',
      todayFocusTime: 'تمرکز امروز',
      focusStreak: 'زنجیره تمرکز',
      sessionCompleted: 'جلسه تمرکز با موفقیت به پایان رسید!',
    },

    // Schedule & Time Blocks
    schedule: {
      title: 'تقویم و بلوک‌های زمانی',
      description: 'برنامه‌ریزی روزانه و هفتگی به شیوه Time-Boxing و رصد تداخل جلسات',
      badge: 'برنامه‌ریزی زمانی',
      newEvent: 'جلسه یا رویداد جدید',
      viewWeek: 'هفته',
      viewDay: 'روز',
      viewMonth: 'ماه',
      today: 'برو به امروز',
    },

    // Academic & Spaced Repetition
    academic: {
      title: 'مرکز آکادمیک و مدیریت یادگیری',
      description: 'مدیریت سلسله‌مراتبی دروس، کتاب‌های مرجع، سرفصل‌ها و الگوریتم تکرار فاصله‌دار (SM-2)',
      badge: 'موتور یادگیری',
      institutions: 'نهادهای آموزشی',
      subjects: 'دروس',
      books: 'کتب مرجع',
      topics: 'مباحث درسی',
      spacedRepetitionQueue: 'صف مرور هوشمند (تکرار فاصله‌دار)',
      dueToday: 'موعد امروز',
      studied: 'مطالعه‌شده',
      mastered: 'مسلط‌شده',
      reviewAgain: 'مرور مجدد',
    },

    // Journal & Memory Vault
    journal: {
      title: 'دفترچه خاطرات، تجارب و رشد فردی',
      description: 'ثبت تأملات روزانه، پایش سطح انرژی و خلق‌وخو و نگهداری دستاوردهای زندگی',
      badge: 'صندوق خاطرات',
      tabReflection: 'بازتاب و یادداشت امروز',
      tabVault: 'صندوق دستاوردها و خاطرات (Memory Vault)',
      tabTimeline: 'گاه‌شمار و آرشیو',
      howAreYouFeeling: 'امروز حالت چطوره؟ (خلق‌وخو)',
      energyLevel: 'سطح انرژی',
      gratitudePrompt: 'امروز بابت چه چیزی شکرگزاری؟',
      winsPrompt: 'بزرگترین دستاورد یا پیروزی امروز چه بود؟',
      lessonsPrompt: 'چه درس یا بینشی آموختی؟',
      saveEntry: 'ذخیره بازتاب روزانه',
      savedSuccess: 'یادداشت روزانه ذخیره شد',
    },

    // Analytics & AGS
    analytics: {
      title: 'تحلیل‌ها و شاخص پیشرفت (AGS)',
      description: 'سنجش چندبُعدی بهره‌وری، یادگیری مستمر، سلامت روان و صعود فردی',
      badge: 'شاخص رشد',
      overallScore: 'امتیاز کل شاخص رشد (AGS)',
      productivitySub: 'بُعد بهره‌وری و اقدام',
      learningSub: 'بُعد یادگیری و تسلط علمی',
      wellBeingSub: 'بُعد سلامت ذهن و تعادل',
      exportPdf: 'دریافت گزارش رشد (PDF)',
    },

    // Settings
    settings: {
      title: 'تنظیمات سامانه',
      description: 'شخصی‌سازی رابط کاربری، امنیت، زبان، پشتیبان‌گیری و پایگاه داده',
      badge: 'تنظیمات',
      languageSection: 'زبان و چیدمان رابط کاربری',
      languageFa: 'فارسی (راست‌به‌چپ — RTL)',
      languageEn: 'English (Left-to-Right — LTR)',
      themeSection: 'پوسته و ظاهر گرافیکی',
      themeLight: 'روشن (Mica Light)',
      themeDark: 'تاریک (Mica Dark)',
      themeSystem: 'پیروی از سیستم‌عامل',
      securitySection: 'امنیت و رمز عبور (PIN)',
      backupSection: 'پشتیبان‌گیری و بازیابی داده‌ها',
      exportBackup: 'دریافت نسخه پشتیبان (JSON)',
      importBackup: 'بازیابی از فایل پشتیبان',
      diagnosticSection: 'عیب‌یابی پایگاه داده',
    },

    // Toast Messages
    toast: {
      success: 'موفقیت‌آمیز',
      error: 'خطا در سیستم',
      warning: 'هشدار',
      info: 'اطلاع',
      localeChanged: 'زبان برنامه به فارسی تغییر یافت.',
      themeChanged: 'پوسته برنامه بروزرسانی شد.',
      backupSuccess: 'پشتیبان کامل با موفقیت دانلود شد.',
      restoreSuccess: 'اطلاعات با موفقیت بازیابی شد.',
    },
  },

  en: {
    // Navigation & Routes
    routes: {
      dashboard: 'Dashboard',
      inbox: 'Inbox',
      tasks: 'Tasks & Planning',
      focus: 'Focus Timer',
      schedule: 'Schedule & Blocks',
      management: 'Management & Goals',
      academic: 'Academic Center',
      journal: 'Daily Journal & Vault',
      analytics: 'Analytics & Growth',
      life: 'Life & Wellness',
      settings: 'Settings',
      diagnostic: 'DB Diagnostic',
    },

    // Persona
    persona: {
      personal: 'Personal',
      academic: 'Academic',
      professional: 'Professional',
    },

    // Topbar & Actions
    topbar: {
      searchPlaceholder: 'Search across system...',
      searchTooltip: 'Global Search across all entities (Ctrl+K)',
      quickCapture: 'Quick Capture',
      quickCaptureTooltip: 'Quick capture note or thought (Ctrl+Shift+C)',
      activeFocus: 'Focus Session Active',
      toggleTheme: 'Toggle Theme (System / Dark / Light)',
      toggleLanguage: 'Switch language to Persian (RTL)',
      today: 'Today',
    },

    // Common UI
    common: {
      save: 'Save',
      cancel: 'Cancel',
      delete: 'Delete',
      edit: 'Edit',
      close: 'Close',
      refresh: 'Refresh',
      loading: 'Loading...',
      empty: 'No items found',
      filter: 'Filter',
      all: 'All',
      active: 'Active',
      completed: 'Completed',
      pending: 'Pending',
      archived: 'Archived',
      total: 'Total',
      back: 'Back',
      confirm: 'Confirm',
      actions: 'Actions',
      search: 'Search',
      details: 'Details',
      status: 'Status',
      priority: 'Priority',
      date: 'Date',
      title: 'Title',
      description: 'Description',
      category: 'Category',
      tags: 'Tags',
      notes: 'Notes',
      reload: 'Reload',
      success: 'Operation completed successfully',
      error: 'An error occurred',
    },

    // Dashboard
    dashboard: {
      title: 'Personal & Academic Dashboard',
      description: 'Unified workspace for memory management, personal growth, deep focus, and academic mastery',
      badge: 'Active System',
      welcomeTitle: 'Welcome to MY ASCEND',
      welcomeSubtitle: 'Local-First Architecture, Reliable & Secure',
      welcomeDesc: 'All core subsystems are ready: encrypted SQLite storage, deep focus timers, Eisenhower matrix, SuperMemo-2 spaced repetition, and personal growth journaling.',
      quickStats: 'Quick Overview',
      tasksCompleted: 'Completed Tasks',
      focusMinutes: 'Deep Focus Minutes',
      masteredTopics: 'Mastered Topics',
      journalEntries: 'Journal Reflections',
      recentActivity: 'Recent Activity',
      pillarsTitle: 'Core System Pillars',
      pillarDbTitle: 'Local SQLite Engine',
      pillarDbDesc: 'Encrypted local database with 32 structured tables, high-performance indexing, and atomic backup/restore.',
      pillarFluentTitle: 'Microsoft Fluent Design',
      pillarFluentDesc: 'Refined Mica surfaces, soft translucent elevation, accessible components, and instant dark/light themes.',
      pillarAscendTitle: 'Ascend Growth Score (AGS)',
      pillarAscendDesc: 'Multi-factor index scoring productivity, academic mastery, and mindful self-reflection.',
    },

    // Inbox
    inbox: {
      title: 'Inbox & Triage Engine',
      description: 'Instant thought capture workspace: triage entries into actionable tasks, notes, or reflections',
      badge: 'Triage Engine',
      newCapture: 'New Capture',
      inputPlaceholder: "What's on your mind? Type and press Enter or click Capture...",
      emptyState: 'Your inbox is clear. Capture any passing thoughts, fleeting ideas, or tasks immediately.',
      typeText: 'Text',
      typeLink: 'Link',
      typeAudio: 'Audio',
      typeIdea: 'Idea',
      promoteToTask: 'Promote to Task',
      promoteToJournal: 'Convert to Journal',
      promoteToNote: 'Save to Notes',
      triagedSuccess: 'Capture triaged successfully',
      captureCreated: 'New capture saved',
      captureDeleted: 'Capture moved to trash',
    },

    // Tasks & Eisenhower
    tasks: {
      title: 'Tasks & Action Engine',
      description: 'Eisenhower matrix prioritization, project planning, and execution tracking',
      badge: 'Action Engine',
      newTask: 'New Task',
      filterAll: 'All Tasks',
      filterToday: 'Today',
      filterUpcoming: 'Upcoming',
      filterCompleted: 'Completed',
      q1Title: 'Important & Urgent (Do First)',
      q1Desc: 'Crises, impending deadlines, and critical commitments',
      q2Title: 'Important & Not Urgent (Schedule & Growth)',
      q2Desc: 'Learning, long-term planning, and well-being',
      q3Title: 'Not Important & Urgent (Delegate / Batch)',
      q3Desc: 'Interruptions, administrative chores, and low-value requests',
      q4Title: 'Not Important & Not Urgent (Eliminate)',
      q4Desc: 'Time-wasters and trivial busywork',
      emptyQuadrant: 'No tasks in this quadrant',
      taskCreated: 'Task created successfully',
      taskUpdated: 'Task updated',
      taskDeleted: 'Task deleted',
      toggleComplete: 'Toggle completion status',
    },

    // Focus & Pomodoro
    focus: {
      title: 'Focus Engine & Pomodoro Timer',
      description: 'Intelligent deep work timer, distraction logging, and flow state cultivation',
      badge: 'Deep Focus',
      modePomodoro: 'Pomodoro (25m)',
      modeFlow50: 'Flow State (50m)',
      modeDeep90: 'Deep Work (90m)',
      modeCustom: 'Custom',
      start: 'Start Focus',
      pause: 'Pause',
      resume: 'Resume',
      reset: 'Reset',
      interruption: 'Log Distraction',
      completedRounds: 'Completed Rounds',
      todayFocusTime: "Today's Focus",
      focusStreak: 'Focus Streak',
      sessionCompleted: 'Focus session completed successfully!',
    },

    // Schedule & Time Blocks
    schedule: {
      title: 'Schedule & Time-Blocks',
      description: 'Time-boxing planner, conflict detection, and calendar sync',
      badge: 'Time-Boxing',
      newEvent: 'New Event / Block',
      viewWeek: 'Week',
      viewDay: 'Day',
      viewMonth: 'Month',
      today: 'Go to Today',
    },

    // Academic & Spaced Repetition
    academic: {
      title: 'Academic Center & Learning Engine',
      description: 'Hierarchical curriculum: Institutions, Subjects, Books, Topics & SuperMemo-2 Spaced Repetition',
      badge: 'Learning Engine',
      institutions: 'Institutions',
      subjects: 'Subjects',
      books: 'Reference Books',
      topics: 'Topics & Concepts',
      spacedRepetitionQueue: 'Spaced Repetition Queue (SM-2)',
      dueToday: 'Due Today',
      studied: 'Studied',
      mastered: 'Mastered',
      reviewAgain: 'Review Again',
    },

    // Journal & Memory Vault
    journal: {
      title: 'Daily Journal & Memory Vault',
      description: 'Daily reflections, mood and energy tracking, and milestone preservation',
      badge: 'Memory Vault',
      tabReflection: "Today's Reflection",
      tabVault: 'Memory & Wins Vault',
      tabTimeline: 'Timeline & Archive',
      howAreYouFeeling: 'How are you feeling today? (Mood)',
      energyLevel: 'Energy Level',
      gratitudePrompt: 'What are you grateful for today?',
      winsPrompt: 'What was your biggest win or accomplishment today?',
      lessonsPrompt: 'What key lesson or insight did you discover?',
      saveEntry: 'Save Daily Reflection',
      savedSuccess: 'Journal reflection saved',
    },

    // Analytics & AGS
    analytics: {
      title: 'Analytics & Growth Score (AGS)',
      description: 'Holistic growth index tracking productivity, academic mastery, and personal balance',
      badge: 'Growth Index',
      overallScore: 'Overall Ascend Growth Score (AGS)',
      productivitySub: 'Productivity & Action Score',
      learningSub: 'Academic & Learning Score',
      wellBeingSub: 'Mindfulness & Reflection Score',
      exportPdf: 'Generate PDF Growth Report',
    },

    // Settings
    settings: {
      title: 'System Settings',
      description: 'Customize user interface, typography, language, security, and database backups',
      badge: 'Settings',
      languageSection: 'Language & Layout Direction',
      languageFa: 'فارسی (راست‌به‌چپ — RTL)',
      languageEn: 'English (Left-to-Right — LTR)',
      themeSection: 'Theme & Appearance',
      themeLight: 'Mica Light',
      themeDark: 'Mica Dark',
      themeSystem: 'Match Operating System',
      securitySection: 'App Security & Passcode (PIN)',
      backupSection: 'Data Backup & Disaster Recovery',
      exportBackup: 'Export Snapshot (JSON)',
      importBackup: 'Restore Snapshot from File',
      diagnosticSection: 'Database Diagnostics',
    },

    // Toast Messages
    toast: {
      success: 'Success',
      error: 'Error',
      warning: 'Warning',
      info: 'Information',
      localeChanged: 'Language switched to English.',
      themeChanged: 'Application theme updated.',
      backupSuccess: 'Full database snapshot downloaded.',
      restoreSuccess: 'Database restored successfully.',
    },
  },
};

export type TranslationKey = string;

/**
 * Nested key resolver e.g. t('routes.dashboard') -> 'داشبورد' or 'Dashboard'
 */
export function getTranslation(locale: Locale, path: string, fallback?: string): string {
  const dict = translations[locale] as any;
  const parts = path.split('.');
  let current = dict;

  for (const part of parts) {
    if (current && typeof current === 'object' && part in current) {
      current = current[part];
    } else {
      // Fall back to English if key missing in current locale
      const enDict = translations.en as any;
      let enCurrent = enDict;
      for (const enPart of parts) {
        if (enCurrent && typeof enCurrent === 'object' && enPart in enCurrent) {
          enCurrent = enCurrent[enPart];
        } else {
          return fallback || path;
        }
      }
      return typeof enCurrent === 'string' ? enCurrent : fallback || path;
    }
  }

  return typeof current === 'string' ? current : fallback || path;
}
