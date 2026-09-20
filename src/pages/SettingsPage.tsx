import React, { useState, useRef } from 'react';
import {
  Moon,
  Sun,
  Laptop,
  Languages,
  UserCheck,
  Folder,
  HardDrive,
  Activity,
  Check,
  Download,
  Upload,
  FileText,
  Database,
  CheckCircle,
  Shield,
  Lock,
  KeyRound,
  Clock,
  Globe,
  Calendar,
} from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Select } from '../components/Select';
import { Input } from '../components/Input';
import { Badge } from '../components/Badge';
import { Toggle } from '../components/Toggle';
import { Modal } from '../components/Modal';
import { useSettingsStore } from '../store/useSettingsStore';
import { useTranslation } from '../store/useLocaleStore';
import { toast } from '../store/useToastStore';
import { useTheme } from '../hooks/useTheme';
import { useNavigationStore } from '../store/useNavigationStore';
import { useAuthStore } from '../stores/authStore';
import { PersonaType, ThemeMode, SUPPORTED_TIMEZONES, CalendarDialect } from '../types/settings';
import { exportFullDatabaseJSON, importDatabaseJSON, generateGrowthReportPDF } from '../services/exportService';
import { securityService, AutoLockTimeoutOption } from '../services/securityService';

export const SettingsPage: React.FC = () => {
  const { t, locale, setLocale, isRtl } = useTranslation();
  const { settings, setPersona, setTimezone, setCalendarDialect, setAppRootDir } = useSettingsStore();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigationStore((state) => state.navigate);

  const { isPinEnabled, pinLength, autoLockTimeout, lockApp } = useAuthStore();

  const [reportPeriod, setReportPeriod] = useState<'weekly' | 'monthly'>('weekly');
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Security modals state
  const [showSetupPinModal, setShowSetupPinModal] = useState(false);
  const [showChangePinModal, setShowChangePinModal] = useState(false);
  const [showDisablePinModal, setShowDisablePinModal] = useState(false);

  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [currentPinInput, setCurrentPinInput] = useState('');
  const [selectedPinLength, setSelectedPinLength] = useState<4 | 6>(pinLength);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const timezoneOptions = [
    { value: 'UTC', label: 'UTC (جهانی هماهنگ)' },
    { value: 'Asia/Tehran', label: 'تهران (Asia/Tehran, +03:30)' },
    { value: 'Europe/London', label: 'لندن (Europe/London)' },
    { value: 'America/New_York', label: 'نیویورک (America/New_York)' },
  ];

  const autoLockOptions = [
    { value: 'immediate', label: 'بلافاصله هنگام خروج از برنامه (Immediate)' },
    { value: '1min', label: 'بعد از ۱ دقیقه عدم فعالیت (1 Minute)' },
    { value: '5min', label: 'بعد از ۵ دقیقه عدم فعالیت (5 Minutes)' },
    { value: '15min', label: 'بعد از ۱۵ دقیقه عدم فعالیت (15 Minutes)' },
    { value: 'never', label: 'هرگز (Never)' },
  ];

  const handleExportJSON = async () => {
    try {
      setIsExporting(true);
      const blob = await exportFullDatabaseJSON();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `my-ascend-backup-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setStatusMessage('نسخه پشتیبان JSON با موفقیت دریافت شد.');
    } catch (err: any) {
      alert(`خطا در پشتیبان‌گیری: ${err.message || err}`);
    } finally {
      setIsExporting(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setIsImporting(true);
      const text = await file.text();
      await importDatabaseJSON(text);
      setStatusMessage('اطلاعات پایگاه داده با موفقیت بازیابی شد.');
    } catch (err: any) {
      alert(`خطا در بازیابی داده‌ها: ${err.message || err}`);
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleGeneratePDF = async () => {
    try {
      setIsGeneratingPDF(true);
      const pdfBlob = await generateGrowthReportPDF(reportPeriod);
      const url = URL.createObjectURL(pdfBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `my-ascend-growth-report-${reportPeriod}-${new Date().toISOString().split('T')[0]}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      setStatusMessage('گزارش PDF پیشرفت با موفقیت تولید و دانلود شد.');
    } catch (err: any) {
      alert(`خطا در تولید گزارش PDF: ${err.message || err}`);
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const handleSetupPinSubmit = async () => {
    if (newPin !== confirmPin) {
      alert('رمز عبور جدید و تکرار آن یکسان نیستند.');
      return;
    }
    try {
      await securityService.setupPin(newPin, selectedPinLength);
      setShowSetupPinModal(false);
      setNewPin('');
      setConfirmPin('');
      setStatusMessage('رمز عبور برنامه با موفقیت فعال شد.');
    } catch (err: any) {
      alert(`خطا در تنظیم رمز عبور: ${err.message || err}`);
    }
  };

  const handleChangePinSubmit = async () => {
    if (newPin !== confirmPin) {
      alert('رمز عبور جدید و تکرار آن یکسان نیستند.');
      return;
    }
    try {
      await securityService.changePin(currentPinInput, newPin, selectedPinLength);
      setShowChangePinModal(false);
      setCurrentPinInput('');
      setNewPin('');
      setConfirmPin('');
      setStatusMessage('رمز عبور برنامه با موفقیت تغییر یافت.');
    } catch (err: any) {
      alert(`خطا در تغییر رمز عبور: ${err.message || err}`);
    }
  };

  const handleDisablePinSubmit = async () => {
    try {
      await securityService.disablePin(currentPinInput);
      setShowDisablePinModal(false);
      setCurrentPinInput('');
      setStatusMessage('قفل رمز عبور برنامه غیرفعال شد.');
    } catch (err: any) {
      alert(`خطا در غیرفعال‌سازی رمز عبور: ${err.message || err}`);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <PageHeader
        title={t('settings.title')}
        description={t('settings.description')}
        badge={<Badge variant="neutral">{t('settings.badge')}</Badge>}
        actions={
          <Button
            variant="secondary"
            icon={<Activity className="w-4 h-4 text-[#0078d4]" />}
            onClick={() => navigate('settings/diagnostic')}
          >
            {t('routes.diagnostic')}
          </Button>
        }
      />

      {statusMessage && (
        <div className="flex items-center gap-2 p-3 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 rounded-lg text-xs font-semibold animate-in fade-in">
          <CheckCircle className="w-4 h-4 shrink-0" />
          <span>{statusMessage}</span>
        </div>
      )}

      {/* Security & Passcode Settings Card */}
      <Card variant="acrylic" className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
            <Shield className="w-5 h-5" />
          </div>
          <div className="text-start">
            <h3 className="font-semibold text-sm text-[#1f1f1f] dark:text-white">امنیت و قفل برنامه (Passcode & Security)</h3>
            <p className="text-xs text-[#8a8a8a]">تنظیم رمز عبور 4 یا 6 رقمی (PIN)، زمان قفل خودکار و رمزنگاری داده‌ها</p>
          </div>
        </div>

        <div className="space-y-4 pt-2">
          {/* Toggle PIN Lock */}
          <div className="flex items-center justify-between p-3.5 rounded-lg border border-black/10 dark:border-white/10 bg-black/[0.01] dark:bg-white/[0.01]">
            <div className="flex items-center gap-3 text-start">
              <Lock className="w-4 h-4 text-[#0078d4]" />
              <div>
                <span className="font-semibold text-sm text-[#1f1f1f] dark:text-white">فعالسازی قفل برنامه (PIN)</span>
                <p className="text-xs text-[#8a8a8a]">محافظت از داده‌ها با رمز عبور عددی در هنگام خروج یا عدم فعالیت</p>
              </div>
            </div>
            <Toggle
              checked={isPinEnabled}
              onChange={(checked) => {
                if (checked) {
                  setShowSetupPinModal(true);
                } else {
                  setShowDisablePinModal(true);
                }
              }}
            />
          </div>

          {/* Security Actions & Auto-Lock Options if PIN is enabled */}
          {isPinEnabled && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              <div className="space-y-2 text-start">
                <label className="text-xs font-semibold text-[#1f1f1f] dark:text-white flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-[#0078d4]" />
                  <span>زمان قفل خودکار (Auto-Lock Timeout)</span>
                </label>
                <Select
                  options={autoLockOptions}
                  value={autoLockTimeout}
                  onChange={(e) => securityService.setAutoLockTimeout(e.target.value as AutoLockTimeoutOption)}
                />
              </div>

              <div className="flex items-end gap-2">
                <Button
                  variant="secondary"
                  icon={<KeyRound className="w-4 h-4" />}
                  onClick={() => setShowChangePinModal(true)}
                  className="w-full"
                >
                  تغییر رمز عبور
                </Button>
                <Button
                  variant="subtle"
                  icon={<Lock className="w-4 h-4 text-[#0078d4]" />}
                  onClick={() => lockApp()}
                  className="w-full"
                >
                  قفل‌کردن برنامه‌
                </Button>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Persona Selection */}
      <Card variant="acrylic" className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-[#0078d4]/10 text-[#0078d4] flex items-center justify-center">
            <UserCheck className="w-5 h-5" />
          </div>
          <div className="text-start">
            <h3 className="font-semibold text-sm text-[#1f1f1f] dark:text-white">پرسونای فعال (Active Persona)</h3>
            <p className="text-xs text-[#8a8a8a]">جهت تفکیک حوزه‌های زندگی، یادگیری و کار</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
          {(['personal', 'academic', 'professional'] as PersonaType[]).map((p) => {
            const isSelected = settings.active_persona === p;
            const labels = {
              personal: { title: 'شخصی', desc: 'رشد فردی، خاطرات و عادات' },
              academic: { title: 'آکادمیک', desc: 'دانشگاه، دروس و یادگیری' },
              professional: { title: 'حرفه‌ای', desc: 'پروژه‌ها و کار شغلی' },
            };
            return (
              <button
                key={p}
                onClick={() => setPersona(p)}
                className={`flex flex-col p-3.5 rounded-lg border text-start transition-all relative ${
                  isSelected
                    ? 'border-[#0078d4] bg-[#0078d4]/10 shadow-sm'
                    : 'border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5'
                }`}
              >
                {isSelected && (
                  <div className="absolute top-3 end-3 w-4 h-4 rounded-full bg-[#0078d4] text-white flex items-center justify-center">
                    <Check className="w-2.5 h-2.5" />
                  </div>
                )}
                <span className="font-semibold text-sm text-[#1f1f1f] dark:text-white">{labels[p].title}</span>
                <span className="text-xs text-[#8a8a8a] mt-1">{labels[p].desc}</span>
              </button>
            );
          })}
        </div>
      </Card>

      {/* Backup & Restore Data Management Workspace */}
      <Card variant="acrylic" className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center">
            <Database className="w-5 h-5" />
          </div>
          <div className="text-start">
            <h3 className="font-semibold text-sm text-[#1f1f1f] dark:text-white">پشتیبان‌گیری و بازیابی داده‌ها (Backup & Restore)</h3>
            <p className="text-xs text-[#8a8a8a]">دریافت نسخه پشتیبان کامل (JSON) و بازیابی مطمئن داده‌ها در تراکنش پایگاه داده</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
          <Button
            variant="primary"
            icon={<Download className="w-4 h-4" />}
            onClick={handleExportJSON}
            disabled={isExporting}
          >
            {isExporting ? 'در حال خروجی گرفتن...' : 'دریافت نسخه پشتیبان (JSON)'}
          </Button>

          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleFileChange}
            className="hidden"
          />

          <Button
            variant="secondary"
            icon={<Upload className="w-4 h-4 text-emerald-500" />}
            onClick={() => fileInputRef.current?.click()}
            disabled={isImporting}
          >
            {isImporting ? 'در حال بازیابی...' : 'بازیابی داده‌ها'}
          </Button>
        </div>
      </Card>

      {/* PDF Growth Report Generator Workspace */}
      <Card variant="acrylic" className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-indigo-500/10 text-indigo-500 flex items-center justify-center">
            <FileText className="w-5 h-5" />
          </div>
          <div className="text-start">
            <h3 className="font-semibold text-sm text-[#1f1f1f] dark:text-white">مولد گزارش پیشرفت (PDF Growth Report)</h3>
            <p className="text-xs text-[#8a8a8a]">تولید گزارش رسمی PDF شامل شاخص رشد (AGS)، آمار تمرکز، مباحث آکادمیک و خلاصه خاطرات</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-2">
          {/* Period Selector Tabs */}
          <div className="flex items-center gap-1.5 p-1 bg-black/5 dark:bg-white/5 rounded-lg border border-black/5 dark:border-white/5">
            <button
              onClick={() => setReportPeriod('weekly')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                reportPeriod === 'weekly'
                  ? 'bg-white dark:bg-[#252526] text-[#0078d4] shadow-sm'
                  : 'text-[#616161] dark:text-[#adadad] hover:text-[#1f1f1f] dark:hover:text-white'
              }`}
            >
              گزارش هفتگی (7 روز اخیر)
            </button>
            <button
              onClick={() => setReportPeriod('monthly')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                reportPeriod === 'monthly'
                  ? 'bg-white dark:bg-[#252526] text-[#0078d4] shadow-sm'
                  : 'text-[#616161] dark:text-[#adadad] hover:text-[#1f1f1f] dark:hover:text-white'
              }`}
            >
              گزارش ماهانه (30 روز اخیر)
            </button>
          </div>

          <Button
            variant="primary"
            icon={<FileText className="w-4 h-4" />}
            onClick={handleGeneratePDF}
            disabled={isGeneratingPDF}
          >
            {isGeneratingPDF ? 'در حال تولید گزارش PDF...' : 'پیش‌نمایش / دانلود PDF'}
          </Button>
        </div>
      </Card>

      {/* Appearance & Theme */}
      <Card variant="acrylic" className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center">
            <Moon className="w-5 h-5" />
          </div>
          <div className="text-start">
            <h3 className="font-semibold text-sm text-[#1f1f1f] dark:text-white">پوسته و ظاهر (Theme)</h3>
            <p className="text-xs text-[#8a8a8a]">سازگار با سبک مایکروسافت فلوئنت و کنتراست استاندارد</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 pt-2">
          {[
            { id: 'dark', label: 'تاریک (Dark)', icon: Moon },
            { id: 'light', label: 'روشن (Light)', icon: Sun },
            { id: 'system', label: 'سیستم (System)', icon: Laptop },
          ].map((item) => {
            const Icon = item.icon;
            const isSelected = theme === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setTheme(item.id as ThemeMode)}
                className={`flex items-center justify-center gap-2.5 p-3 rounded-lg border text-sm font-medium transition-all ${
                  isSelected
                    ? 'border-[#0078d4] bg-[#0078d4]/10 text-[#0078d4] dark:text-[#60a5fa] font-semibold'
                    : 'border-black/10 dark:border-white/10 text-[#616161] dark:text-[#adadad] hover:bg-black/5 dark:hover:bg-white/5'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </Card>

      {/* Direction & Locale */}
      <Card variant="acrylic" className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
            <Languages className="w-5 h-5" />
          </div>
          <div className="text-start">
            <h3 className="font-semibold text-sm text-[#1f1f1f] dark:text-[#f5f6f8]">{t('settings.languageSection')}</h3>
            <p className="text-xs text-[#5c6270] dark:text-[#9fa6b2]">
              {isRtl ? 'پشتیبانی کامل از فونت وزیرمتن و اینتر در هر دو چیدمان راست‌به‌چپ و چپ‌به‌راست' : 'Full support for Vazirmatn & Inter fonts in both RTL and LTR layouts'}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 pt-2">
          <button
            onClick={async () => {
              await setLocale('fa');
              toast.info('زبان به فارسی (راست‌به‌چپ) تغییر یافت');
            }}
            className={`flex items-center justify-center gap-2 p-3.5 rounded-xl border text-sm font-medium transition-all ${
              locale === 'fa'
                ? 'border-[#0078d4] bg-[#0078d4]/10 text-[#0078d4] dark:text-[#60a5fa] font-bold shadow-sm'
                : 'border-black/6 dark:border-white/8 text-[#5c6270] dark:text-[#9fa6b2] hover:bg-black/5 dark:hover:bg-white/5'
            }`}
          >
            <span>{t('settings.languageFa')}</span>
          </button>
          <button
            onClick={async () => {
              await setLocale('en');
              toast.info('Language switched to English (LTR)');
            }}
            className={`flex items-center justify-center gap-2 p-3.5 rounded-xl border text-sm font-medium transition-all ${
              locale === 'en'
                ? 'border-[#0078d4] bg-[#0078d4]/10 text-[#0078d4] dark:text-[#60a5fa] font-bold shadow-sm'
                : 'border-black/6 dark:border-white/8 text-[#5c6270] dark:text-[#9fa6b2] hover:bg-black/5 dark:hover:bg-white/5'
            }`}
          >
            <span>{t('settings.languageEn')}</span>
          </button>
        </div>
      </Card>

      {/* Timezone & Calendar Dialect */}
      <Card variant="acrylic" className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center">
            <Globe className="w-5 h-5" />
          </div>
          <div className="text-start">
            <h3 className="font-semibold text-sm text-[#1f1f1f] dark:text-[#f5f6f8]">
              {isRtl ? 'منطقه زمانی و تقویم خورشیدی' : 'Timezone & Solar Hijri Calendar'}
            </h3>
            <p className="text-xs text-[#5c6270] dark:text-[#9fa6b2]">
              {isRtl
                ? 'پشتیبانی پیش‌فرض از منطقه زمانی کابل (UTC+04:30) و نام ماه‌های دری افغانستان'
                : 'Configures default Afghanistan Kabul timezone (UTC+04:30) and Solar Hijri Dari months'}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          {/* Timezone Select */}
          <div className="space-y-2 text-start">
            <label className="text-xs font-semibold text-[#1f1f1f] dark:text-[#f5f6f8] flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-[#0078d4]" />
              <span>{isRtl ? 'منطقه زمانی سیستم' : 'System Timezone'}</span>
            </label>
            <select
              value={settings.timezone || 'Asia/Kabul'}
              onChange={async (e) => {
                const tz = e.target.value;
                await setTimezone(tz);
                toast.success(
                  isRtl ? `منطقه زمانی به ${tz} تغییر یافت` : `Timezone updated to ${tz}`
                );
              }}
              className="w-full h-10 px-3 text-xs bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-lg text-[#1f1f1f] dark:text-white focus:outline-none focus:border-[#0078d4]"
            >
              {SUPPORTED_TIMEZONES.map((tz) => (
                <option key={tz.id} value={tz.id} className="bg-white dark:bg-[#161922]">
                  {isRtl ? tz.label : tz.labelEn}
                </option>
              ))}
            </select>
          </div>

          {/* Calendar Dialect Select */}
          <div className="space-y-2 text-start">
            <label className="text-xs font-semibold text-[#1f1f1f] dark:text-[#f5f6f8] flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-emerald-500" />
              <span>{isRtl ? 'گویش ماه‌های تقویم خورشیدی' : 'Solar Calendar Month Dialect'}</span>
            </label>
            <select
              value={settings.calendar_dialect || 'afghan'}
              onChange={async (e) => {
                const dialect = e.target.value as CalendarDialect;
                await setCalendarDialect(dialect);
                toast.success(
                  isRtl
                    ? `گویش تقویم به ${dialect === 'afghan' ? 'افغانستان (دری)' : 'ایران (فارسی)'} تغییر یافت`
                    : `Calendar dialect set to ${dialect === 'afghan' ? 'Afghanistan (Dari)' : 'Iran (Persian)'}`
                );
              }}
              className="w-full h-10 px-3 text-xs bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-lg text-[#1f1f1f] dark:text-white focus:outline-none focus:border-[#0078d4]"
            >
              <option value="afghan" className="bg-white dark:bg-[#161922]">
                {isRtl ? 'افغانستان - حمل، ثور، جوزا، سرطان... (پیش‌فرض)' : 'Afghanistan - Hamal, Sawr, Jawza, Saratan...'}
              </option>
              <option value="iranian" className="bg-white dark:bg-[#161922]">
                {isRtl ? 'ایران - فروردین، اردیبهشت، خرداد...' : 'Iran - Farvardin, Ordibehesht, Khordad...'}
              </option>
            </select>
          </div>
        </div>
      </Card>

      {/* System Identifiers */}
      <Card variant="acrylic" className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-purple-500/10 text-purple-500 flex items-center justify-center">
            <HardDrive className="w-5 h-5" />
          </div>
          <div className="text-start">
            <h3 className="font-semibold text-sm text-[#1f1f1f] dark:text-white">پیکربندی سیستم و پایگاه داده</h3>
            <p className="text-xs text-[#8a8a8a]">مشخصات شناسه دستگاه و مسیر ذخیره‌سازی داده‌ها</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          <Input
            label="شناسه یکتای دستگاه (Device ID)"
            value={settings.device_id}
            readOnly
            className="font-mono text-xs cursor-default bg-black/5 dark:bg-white/5"
          />

          <Select
            label="منطقه زمانی (Timezone)"
            options={timezoneOptions}
            value={settings.timezone}
            onChange={(e) => setTimezone(e.target.value)}
          />

          <div className="sm:col-span-2">
            <Input
              label="پوشه ریشه داده‌های برنامه (App Root Directory)"
              value={settings.app_root_dir}
              onChange={(e) => setAppRootDir(e.target.value)}
              prefixIcon={<Folder className="w-4 h-4" />}
            />
          </div>
        </div>
      </Card>

      {/* Setup PIN Modal */}
      <Modal isOpen={showSetupPinModal} onClose={() => setShowSetupPinModal(false)} title="تنظیم رمز عبور برنامه (PIN)">
        <div className="space-y-4 text-start">
          <div className="space-y-2">
            <label className="text-xs font-semibold text-[#1f1f1f] dark:text-white">تعداد ارقام رمز عبور</label>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSelectedPinLength(4)}
                className={`px-3 py-1.5 rounded-lg border text-xs font-semibold ${
                  selectedPinLength === 4
                    ? 'border-[#0078d4] bg-[#0078d4]/10 text-[#0078d4]'
                    : 'border-black/10 dark:border-white/10'
                }`}
              >
                4 رقم عددی
              </button>
              <button
                onClick={() => setSelectedPinLength(6)}
                className={`px-3 py-1.5 rounded-lg border text-xs font-semibold ${
                  selectedPinLength === 6
                    ? 'border-[#0078d4] bg-[#0078d4]/10 text-[#0078d4]'
                    : 'border-black/10 dark:border-white/10'
                }`}
              >
                6 رقم عددی
              </button>
            </div>
          </div>

          <Input
            type="password"
            label="رمز عبور جدید"
            value={newPin}
            onChange={(e) => setNewPin(e.target.value)}
            maxLength={selectedPinLength}
            placeholder={`رمز عبور ${selectedPinLength} رقمی`}
          />

          <Input
            type="password"
            label="تکرار رمز عبور جدید"
            value={confirmPin}
            onChange={(e) => setConfirmPin(e.target.value)}
            maxLength={selectedPinLength}
            placeholder="تکرار رمز عبور"
          />

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="subtle" size="sm" onClick={() => setShowSetupPinModal(false)}>
              انصراف
            </Button>
            <Button variant="primary" size="sm" onClick={handleSetupPinSubmit}>
              ذخیره و فعال‌سازی
            </Button>
          </div>
        </div>
      </Modal>

      {/* Change PIN Modal */}
      <Modal isOpen={showChangePinModal} onClose={() => setShowChangePinModal(false)} title="تغییر رمز عبور برنامه (PIN)">
        <div className="space-y-4 text-start">
          <Input
            type="password"
            label="رمز عبور فعلی"
            value={currentPinInput}
            onChange={(e) => setCurrentPinInput(e.target.value)}
            placeholder="رمز عبور فعلی را وارد کنید"
          />

          <Input
            type="password"
            label="رمز عبور جدید"
            value={newPin}
            onChange={(e) => setNewPin(e.target.value)}
            maxLength={selectedPinLength}
            placeholder={`رمز عبور جدید ${selectedPinLength} رقمی`}
          />

          <Input
            type="password"
            label="تکرار رمز عبور جدید"
            value={confirmPin}
            onChange={(e) => setConfirmPin(e.target.value)}
            maxLength={selectedPinLength}
            placeholder="تکرار رمز عبور جدید"
          />

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="subtle" size="sm" onClick={() => setShowChangePinModal(false)}>
              انصراف
            </Button>
            <Button variant="primary" size="sm" onClick={handleChangePinSubmit}>
              تغییر رمز عبور
            </Button>
          </div>
        </div>
      </Modal>

      {/* Disable PIN Modal */}
      <Modal isOpen={showDisablePinModal} onClose={() => setShowDisablePinModal(false)} title="غیرفعال‌سازی قفل برنامه">
        <div className="space-y-4 text-start">
          <p className="text-xs text-[#616161] dark:text-[#adadad]">
            جهت غیرفعال‌سازی قفل برنامه، لطفاً رمز عبور فعلی خود را وارد کنید:
          </p>

          <Input
            type="password"
            label="رمز عبور فعلی"
            value={currentPinInput}
            onChange={(e) => setCurrentPinInput(e.target.value)}
            placeholder="رمز عبور فعلی"
          />

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="subtle" size="sm" onClick={() => setShowDisablePinModal(false)}>
              انصراف
            </Button>
            <Button variant="danger" size="sm" onClick={handleDisablePinSubmit}>
              غیرفعال‌سازی قفل
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
