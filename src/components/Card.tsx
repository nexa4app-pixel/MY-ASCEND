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
      'bg-white/70 dark:bg-[#2b2b2b]/70 fluent-acrylic border border-black/8 dark:border-white/8 shadow-sm',
    elevated:
      'bg-white dark:bg-[#282828] border border-black/10 dark:border-white/10 shadow-fluent-elevation-4',
    subtle:
      'bg-black/5 dark:bg-white/5 border border-transparent',
  };

  return (
    <div
      className={clsx(
        'rounded-xl p-5 transition-all duration-200 text-start',
        variantStyles[variant],
        interactive && 'cursor-pointer hover:bg-white/90 dark:hover:bg-[#323232] hover:border-black/15 dark:hover:border-white/15 active:scale-[0.99]',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};
