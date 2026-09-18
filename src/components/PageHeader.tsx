import React from 'react';
import { clsx } from 'clsx';

export interface PageHeaderProps {
  title: string;
  description?: string;
  badge?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  description,
  badge,
  actions,
  className,
}) => {
  return (
    <div
      className={clsx(
        'flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-black/6 dark:border-white/8 mb-6 text-start',
        className
      )}
    >
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight text-[#1f1f1f] dark:text-[#f5f6f8]">
            {title}
          </h1>
          {badge}
        </div>
        {description && (
          <p className="text-sm text-[#5c6270] dark:text-[#9fa6b2] leading-relaxed">
            {description}
          </p>
        )}
      </div>

      {actions && <div className="flex items-center gap-2.5 shrink-0">{actions}</div>}
    </div>
  );
};
