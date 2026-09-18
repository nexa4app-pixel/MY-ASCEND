import React from 'react';
import { clsx } from 'clsx';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';
import { useToastStore, ToastItem, ToastType } from '../store/useToastStore';
import { useLocaleStore } from '../store/useLocaleStore';

const ICONS: Record<ToastType, React.ComponentType<{ className?: string }>> = {
  success: CheckCircle2,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
};

const TYPE_STYLES: Record<ToastType, { border: string; iconColor: string; bg: string }> = {
  success: {
    border: 'border-emerald-500/30 dark:border-emerald-500/40',
    iconColor: 'text-emerald-500 dark:text-emerald-400',
    bg: 'bg-emerald-500/5 dark:bg-emerald-500/10',
  },
  error: {
    border: 'border-rose-500/30 dark:border-rose-500/40',
    iconColor: 'text-rose-500 dark:text-rose-400',
    bg: 'bg-rose-500/5 dark:bg-rose-500/10',
  },
  warning: {
    border: 'border-amber-500/30 dark:border-amber-500/40',
    iconColor: 'text-amber-500 dark:text-amber-400',
    bg: 'bg-amber-500/5 dark:bg-amber-500/10',
  },
  info: {
    border: 'border-[#0078d4]/30 dark:border-[#60a5fa]/40',
    iconColor: 'text-[#0078d4] dark:text-[#60a5fa]',
    bg: 'bg-blue-500/5 dark:bg-blue-500/10',
  },
};

const ToastMessage: React.FC<{ toast: ToastItem; onDismiss: (id: string) => void }> = ({
  toast,
  onDismiss,
}) => {
  const Icon = ICONS[toast.type];
  const style = TYPE_STYLES[toast.type];

  return (
    <div
      role="alert"
      className={clsx(
        'group flex items-start gap-3 p-3.5 rounded-xl shadow-fluent-elevation-8 transition-all duration-300 transform select-none',
        'bg-white/90 dark:bg-[#161922]/95 backdrop-blur-xl border',
        style.border,
        'min-w-[280px] max-w-sm text-start'
      )}
    >
      <div className={clsx('p-1.5 rounded-lg shrink-0', style.bg)}>
        <Icon className={clsx('w-4 h-4', style.iconColor)} />
      </div>

      <div className="flex-1 min-w-0 pr-1">
        {toast.title && (
          <h4 className="text-xs font-bold text-[#1f1f1f] dark:text-white mb-0.5 truncate">
            {toast.title}
          </h4>
        )}
        <p className="text-xs text-[#616161] dark:text-[#adadad] leading-relaxed break-words">
          {toast.message}
        </p>
      </div>

      <button
        onClick={() => onDismiss(toast.id)}
        className="p-1 rounded-md text-black/40 dark:text-white/40 hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 transition-colors shrink-0"
        aria-label="Dismiss notification"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};

export const ToastContainer: React.FC = () => {
  const toasts = useToastStore((state) => state.toasts);
  const removeToast = useToastStore((state) => state.removeToast);
  const dir = useLocaleStore((state) => state.dir);

  if (toasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      className={clsx(
        'fixed bottom-5 z-50 flex flex-col gap-2 pointer-events-none p-2',
        dir === 'rtl' ? 'left-5' : 'right-5'
      )}
    >
      {toasts.map((item) => (
        <div key={item.id} className="pointer-events-auto animate-in fade-in slide-in-from-bottom-2 duration-200">
          <ToastMessage toast={item} onDismiss={removeToast} />
        </div>
      ))}
    </div>
  );
};
