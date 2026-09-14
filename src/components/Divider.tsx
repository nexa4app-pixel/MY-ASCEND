import React from 'react';
import { clsx } from 'clsx';

export interface DividerProps {
  orientation?: 'horizontal' | 'vertical';
  className?: string;
}

export const Divider: React.FC<DividerProps> = ({
  orientation = 'horizontal',
  className,
}) => {
  return (
    <div
      role="separator"
      className={clsx(
        'bg-black/8 dark:bg-white/8 shrink-0',
        orientation === 'horizontal' ? 'h-px w-full my-3' : 'w-px h-full mx-3',
        className
      )}
    />
  );
};
