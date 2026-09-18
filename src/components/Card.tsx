import React from 'react';
import { clsx } from 'clsx';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'elevated' | 'acrylic' | 'subtle';
  interactive?: boolean;
}

export const Card: React.FC<CardProps> = ({
  className,
  variant = 'acrylic',
  interactive = false,
  children,
  ...props
}) => {
  const variantStyles = {
    acrylic:
      'bg-white/80 dark:bg-[#161922]/80 fluent-acrylic border border-black/6 dark:border-white/8 shadow-fluent-elevation-1',
    elevated:
      'bg-white dark:bg-[#1a1f2b] border border-black/8 dark:border-white/10 shadow-fluent-elevation-4',
    subtle:
      'bg-black/3 dark:bg-white/4 border border-black/4 dark:border-white/6',
  };

  return (
    <div
      className={clsx(
        'rounded-2xl p-5 transition-all duration-200 text-start',
        variantStyles[variant],
        interactive &&
          'cursor-pointer hover:-translate-y-0.5 hover:shadow-fluent-elevation-4 hover:border-[#0078d4]/30 dark:hover:border-[#0078d4]/40 active:scale-[0.99]',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};
