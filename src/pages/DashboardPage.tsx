import React from 'react';
import { ShieldCheck, Database, Layers, Sparkles, ArrowRight, Activity, Terminal } from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { Card } from '../components/Card';
import { Badge } from '../components/Badge';
import { Button } from '../components/Button';
import { useNavigationStore } from '../store/useNavigationStore';
import { useCurrentTime } from '../hooks/useCurrentTime';

export const DashboardPage: React.FC = () => {
  const navigate = useNavigationStore((state) => state.navigate);
  const { jalaliDate, gregorianDate } = useCurrentTime();

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <PageHeader
        title="داشبورد فاز ۰۱ — هسته زیرساخت"
        description="سامانه یکپارچه مدیریت حافظه، رشد فردی و یادگیری آکادمیک MY ASCEND"
        badge={<Badge variant="accent" size="md">Phase 01 Active</Badge>}
        actions={
          <Button
            variant="primary"
            icon={<Activity className="w-4 h-4" />}
            onClick={() => navigate('settings/diagnostic')}
          >
            مشاهده عیب‌یابی پایگاه داده
          </Button>
        }
      />

      {/* Hero Welcome Card */}
      <Card variant="elevated" className="bg-gradient-to-br from-white/90 via-white/70 to-blue-50/50 dark:from-[#282828] dark:via-[#242424] dark:to-[#1a2530] border-[#0078d4]/20 relative overflow-hidden">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-[#0078d4]" />
              <span className="text-xs font-semibold uppercase tracking-wider text-[#0078d4]">
                زیرساخت آماده و پایدار
              </span>
            </div>
            <h2 className="text-xl font-bold text-[#1f1f1f] dark:text-white">
              خوش آمدید به نسخه پایه MY ASCEND
            </h2>
            <p className="text-sm text-[#616161] dark:text-[#adadad] max-w-2xl leading-relaxed">
              تمامی زیرساخت‌های هسته پایگاه داده SQLite، مایگریشن‌های خودکار چهارگانه، دیزاین سیستم فلوئنت مایکروسافت،
              پشتیبانی دوطرفه از تاریخ شمسی و میلادی و قابلیت چیدمان RTL/LTR با موفقیت مستقر شده است.
            </p>
          </div>

          <div className="flex flex-col gap-1.5 p-4 rounded-lg bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 text-xs shrink-0">
            <span className="text-[#8a8a8a]">تاریخ امروز:</span>
            <span className="font-bold text-sm text-[#1f1f1f] dark:text-white">{jalaliDate}</span>
            <span className="text-[#616161] dark:text-[#adadad]">{gregorianDate}</span>
          </div>
        </div>
      </Card>

      {/* Architectural Pillars */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card variant="acrylic">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-blue-500/10 text-[#0078d4] flex items-center justify-center">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-sm text-[#1f1f1f] dark:text-white">SQLite Migration Engine</h3>
              <p className="text-xs text-[#8a8a8a]">مایگریشن‌های ۰۰۱ تا ۰۰۴</p>
            </div>
          </div>
          <p className="text-xs text-[#616161] dark:text-[#adadad] leading-relaxed mb-4">
            طراحی ۲۹ جدول دامنه و ۳ جدول سیستمی با فیلدهای متادیتای جهان‌شمول، ایندکس‌های پیشرفته کارایی و ایزولاسیون کامل.
          </p>
          <Badge variant="success" size="sm">Schema v4 Validated</Badge>
        </Card>

        <Card variant="acrylic">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-sm text-[#1f1f1f] dark:text-white">Fluent Design System</h3>
              <p className="text-xs text-[#8a8a8a]">طراحی مینیمال و شیشه‌ای</p>
            </div>
          </div>
          <p className="text-xs text-[#616161] dark:text-[#adadad] leading-relaxed mb-4">
            افکت‌های Acrylic و Mica، تایپوگرافی رسمی فونت وزیرمتن، کامپوننت‌های دسترسی‌پذیر و سوییچر آنی تم و جهت صفحه.
          </p>
          <Badge variant="accent" size="sm">Fluent UI Kit Ready</Badge>
        </Card>

        <Card variant="acrylic">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-sm text-[#1f1f1f] dark:text-white">Boundary Compliance</h3>
              <p className="text-xs text-[#8a8a8a]">تضمین محدوده‌های فاز</p>
            </div>
          </div>
          <p className="text-xs text-[#616161] dark:text-[#adadad] leading-relaxed mb-4">
            هیچ منطق بیزنسی یا رابط کاربری خارج از فاز ۰۱ پیاده‌سازی نشده و کلیه ماژول‌ها برای توسعه در فازهای بعدی آماده شده‌اند.
          </p>
          <Badge variant="warning" size="sm">Strict Phase 01</Badge>
        </Card>
      </div>

      {/* Quick Navigation Shortcuts */}
      <Card variant="subtle" className="p-6">
        <h3 className="text-sm font-semibold mb-4 text-[#1f1f1f] dark:text-white">
          بخش‌های اصلی فاز ۰۱ جهت تست و ارزیابی
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <button
            onClick={() => navigate('settings/diagnostic')}
            className="flex items-center justify-between p-4 rounded-lg bg-white/60 dark:bg-[#2c2c2c]/60 hover:bg-white dark:hover:bg-[#343434] border border-black/5 dark:border-white/5 transition-all group text-start"
          >
            <div className="flex items-center gap-3">
              <Terminal className="w-5 h-5 text-[#0078d4]" />
              <div>
                <p className="text-sm font-medium text-[#1f1f1f] dark:text-white">صفحه عیب‌یابی پایگاه داده</p>
                <p className="text-xs text-[#8a8a8a]">بررسی سلامت اتصال، شمارش جداول و تست Ping</p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-black/40 dark:text-white/40 group-hover:translate-x-1 rtl:group-hover:-translate-x-1 transition-transform" />
          </button>

          <button
            onClick={() => navigate('settings')}
            className="flex items-center justify-between p-4 rounded-lg bg-white/60 dark:bg-[#2c2c2c]/60 hover:bg-white dark:hover:bg-[#343434] border border-black/5 dark:border-white/5 transition-all group text-start"
          >
            <div className="flex items-center gap-3">
              <Layers className="w-5 h-5 text-[#0078d4]" />
              <div>
                <p className="text-sm font-medium text-[#1f1f1f] dark:text-white">تنظیمات و ترجیحات</p>
                <p className="text-xs text-[#8a8a8a]">تغییر پرسونای فعال، جهت چیدمان، پوسته و شناسه دستگاه</p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-black/40 dark:text-white/40 group-hover:translate-x-1 rtl:group-hover:-translate-x-1 transition-transform" />
          </button>
        </div>
      </Card>
    </div>
  );
};
