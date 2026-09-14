import React from 'react';
import { clsx } from 'clsx';

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'text' | 'circular' | 'rectangular';
}

export const Skeleton: React.FC<SkeletonProps> = ({
  className,
  variant = 'rectangular',
  ...props
}) => {
  const variantStyles = {
    text: 'h-4 w-full rounded',
    circular: 'rounded-full',
    rectangular: 'rounded-md',
  };

  return (
    <div
      className={clsx(
        'animate-pulse bg-black/10 dark:bg-white/10',
        variantStyles[variant],
        className
      )}
      {...props}
    />
  );
};

export interface TableSkeletonProps {
  rows?: number;
  columns?: number;
}

export const TableSkeleton: React.FC<TableSkeletonProps> = ({ rows = 5, columns = 4 }) => {
  return (
    <div className="w-full border border-black/10 dark:border-white/10 rounded-lg overflow-hidden bg-white/40 dark:bg-[#252525]/40">
      <div className="flex items-center gap-4 p-4 border-b border-black/5 dark:border-white/5 bg-black/5 dark:bg-white/5">
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={`th-${i}`} className="h-4 flex-1" />
        ))}
      </div>
      <div className="divide-y divide-black/5 dark:divide-white/5">
        {Array.from({ length: rows }).map((_, r) => (
          <div key={`tr-${r}`} className="flex items-center gap-4 p-4">
            {Array.from({ length: columns }).map((_, c) => (
              <Skeleton key={`td-${r}-${c}`} className="h-4 flex-1" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};
