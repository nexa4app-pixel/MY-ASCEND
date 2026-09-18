import React from 'react';
import { ShieldCheck, Database, Layers, Sparkles, ArrowRight, Activity, Terminal, CheckSquare, Timer, GraduationCap, BookHeart } from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { Card } from '../components/Card';
import { Badge } from '../components/Badge';
import { Button } from '../components/Button';
import { useNavigationStore } from '../store/useNavigationStore';
import { useCurrentTime } from '../hooks/useCurrentTime';
import { useTranslation } from '../store/useLocaleStore';

export const DashboardPage: React.FC = () => {
  const navigate = useNavigationStore((state) => state.navigate);
  const { jalaliDate, gregorianDate } = useCurrentTime();
  const { t, isRtl } = useTranslation();

  return (
    <div className="max-w-6xl mx-auto space-y-6 select-none">
      <PageHeader
        title={t('dashboard.title')}
        description={t('dashboard.description')}
        badge={<Badge variant="accent" size="md">{t('dashboard.badge')}</Badge>}
        actions={
          <Button
            variant="primary"
            icon={<Activity className="w-4 h-4" />}
            onClick={() => navigate('settings/diagnostic')}
          >
            {t('routes.diagnostic')}
          </Button>
        }
      />

      {/* Hero Welcome Card */}
      <Card
        variant="elevated"
        className="bg-gradient-to-br from-white/95 via-white/80 to-blue-50/40 dark:from-[#161922] dark:via-[#1a1f2b] dark:to-[#121b27] border-[#0078d4]/20 relative overflow-hidden"
      >
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-[#0078d4] dark:text-[#60a5fa]" />
              <span className="text-xs font-semibold uppercase tracking-wider text-[#0078d4] dark:text-[#60a5fa]">
                {t('dashboard.welcomeSubtitle')}
              </span>
            </div>
            <h2 className="text-xl font-bold text-[#1f1f1f] dark:text-[#f5f6f8]">
              {t('dashboard.welcomeTitle')}
            </h2>
            <p className="text-sm text-[#5c6270] dark:text-[#9fa6b2] max-w-2xl leading-relaxed">
              {t('dashboard.welcomeDesc')}
            </p>
          </div>

          <div className="flex flex-col gap-1.5 p-4 rounded-xl bg-black/4 dark:bg-white/5 border border-black/5 dark:border-white/8 text-xs shrink-0 min-w-[170px]">
            <span className="text-[#878e9c] font-medium">{t('topbar.today')}:</span>
            <span className="font-bold text-sm text-[#1f1f1f] dark:text-[#f5f6f8]">
              {isRtl ? jalaliDate : gregorianDate}
            </span>
            <span className="text-[#5c6270] dark:text-[#9fa6b2]">
              {isRtl ? gregorianDate : jalaliDate}
            </span>
          </div>
        </div>
      </Card>

      {/* Quick Access Tiles */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card
          variant="acrylic"
          interactive
          onClick={() => navigate('tasks')}
          className="p-4 flex items-center gap-3"
        >
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-[#0078d4] dark:text-[#60a5fa] flex items-center justify-center shrink-0">
            <CheckSquare className="w-5 h-5" />
          </div>
          <div className="overflow-hidden">
            <h4 className="text-xs font-semibold text-[#1f1f1f] dark:text-[#f5f6f8] truncate">
              {t('routes.tasks')}
            </h4>
            <span className="text-[11px] text-[#878e9c]">Eisenhower Matrix</span>
          </div>
        </Card>

        <Card
          variant="acrylic"
          interactive
          onClick={() => navigate('focus')}
          className="p-4 flex items-center gap-3"
        >
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
            <Timer className="w-5 h-5" />
          </div>
          <div className="overflow-hidden">
            <h4 className="text-xs font-semibold text-[#1f1f1f] dark:text-[#f5f6f8] truncate">
              {t('routes.focus')}
            </h4>
            <span className="text-[11px] text-[#878e9c]">Pomodoro Engine</span>
          </div>
        </Card>

        <Card
          variant="acrylic"
          interactive
          onClick={() => navigate('academic')}
          className="p-4 flex items-center gap-3"
        >
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <GraduationCap className="w-5 h-5" />
          </div>
          <div className="overflow-hidden">
            <h4 className="text-xs font-semibold text-[#1f1f1f] dark:text-[#f5f6f8] truncate">
              {t('routes.academic')}
            </h4>
            <span className="text-[11px] text-[#878e9c]">Spaced Repetition</span>
          </div>
        </Card>

        <Card
          variant="acrylic"
          interactive
          onClick={() => navigate('journal')}
          className="p-4 flex items-center gap-3"
        >
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
            <BookHeart className="w-5 h-5" />
          </div>
          <div className="overflow-hidden">
            <h4 className="text-xs font-semibold text-[#1f1f1f] dark:text-[#f5f6f8] truncate">
              {t('routes.journal')}
            </h4>
            <span className="text-[11px] text-[#878e9c]">Memory Vault</span>
          </div>
        </Card>
      </div>

      {/* Architectural Pillars */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <Card variant="acrylic">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-[#0078d4] dark:text-[#60a5fa] flex items-center justify-center">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-sm text-[#1f1f1f] dark:text-[#f5f6f8]">
                {t('dashboard.pillarDbTitle')}
              </h3>
              <p className="text-xs text-[#878e9c]">32 Schema Tables</p>
            </div>
          </div>
          <p className="text-xs text-[#5c6270] dark:text-[#9fa6b2] leading-relaxed mb-4">
            {t('dashboard.pillarDbDesc')}
          </p>
          <Badge variant="success" size="sm">SQLite v3.x Encrypted</Badge>
        </Card>

        <Card variant="acrylic">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-sm text-[#1f1f1f] dark:text-[#f5f6f8]">
                {t('dashboard.pillarFluentTitle')}
              </h3>
              <p className="text-xs text-[#878e9c]">Mica & Acrylic</p>
            </div>
          </div>
          <p className="text-xs text-[#5c6270] dark:text-[#9fa6b2] leading-relaxed mb-4">
            {t('dashboard.pillarFluentDesc')}
          </p>
          <Badge variant="accent" size="sm">Fluent UI Kit</Badge>
        </Card>

        <Card variant="acrylic">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-sm text-[#1f1f1f] dark:text-[#f5f6f8]">
                {t('dashboard.pillarAscendTitle')}
              </h3>
              <p className="text-xs text-[#878e9c]">Holistic Evaluation</p>
            </div>
          </div>
          <p className="text-xs text-[#5c6270] dark:text-[#9fa6b2] leading-relaxed mb-4">
            {t('dashboard.pillarAscendDesc')}
          </p>
          <Badge variant="warning" size="sm">AGS Engine Active</Badge>
        </Card>
      </div>

      {/* Quick Navigation Shortcuts */}
      <Card variant="subtle" className="p-5">
        <h3 className="text-sm font-semibold mb-3 text-[#1f1f1f] dark:text-[#f5f6f8]">
          {t('dashboard.recentActivity')}
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            onClick={() => navigate('settings/diagnostic')}
            className="flex items-center justify-between p-4 rounded-xl bg-white/70 dark:bg-[#161922]/70 hover:bg-white dark:hover:bg-[#202532] border border-black/5 dark:border-white/8 transition-all group text-start shadow-sm"
          >
            <div className="flex items-center gap-3">
              <Terminal className="w-5 h-5 text-[#0078d4] dark:text-[#60a5fa]" />
              <div>
                <p className="text-sm font-medium text-[#1f1f1f] dark:text-[#f5f6f8]">
                  {t('routes.diagnostic')}
                </p>
                <p className="text-xs text-[#878e9c]">Database Ping, Table Counts & Migrations</p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-black/40 dark:text-white/40 group-hover:translate-x-1 rtl:group-hover:-translate-x-1 transition-transform" />
          </button>

          <button
            onClick={() => navigate('settings')}
            className="flex items-center justify-between p-4 rounded-xl bg-white/70 dark:bg-[#161922]/70 hover:bg-white dark:hover:bg-[#202532] border border-black/5 dark:border-white/8 transition-all group text-start shadow-sm"
          >
            <div className="flex items-center gap-3">
              <Layers className="w-5 h-5 text-[#0078d4] dark:text-[#60a5fa]" />
              <div>
                <p className="text-sm font-medium text-[#1f1f1f] dark:text-[#f5f6f8]">
                  {t('routes.settings')}
                </p>
                <p className="text-xs text-[#878e9c]">Preferences, Themes, Security PIN & Backup</p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-black/40 dark:text-white/40 group-hover:translate-x-1 rtl:group-hover:-translate-x-1 transition-transform" />
          </button>
        </div>
      </Card>
    </div>
  );
};
