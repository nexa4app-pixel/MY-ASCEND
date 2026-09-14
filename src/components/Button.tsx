import React, { forwardRef } from 'react';
import { clsx } from 'clsx';
import { Loader2 } from 'lucide-react';

export type ButtonVariant = 'primary' | 'secondary' | 'subtle' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  icon?: React.ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'secondary', size = 'md', isLoading = false, icon, children, disabled, ...props }, ref) => {
    const baseStyles =
      'inline-flex items-center justify-center font-medium transition-all duration-150 rounded-md select-none focus:outline-none focus:ring-2 focus:ring-[#0078d4] focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]';

    const sizeStyles = {
      sm: 'text-xs px-2.5 py-1 gap-1.5 h-7',
      md: 'text-sm px-3.5 py-1.5 gap-2 h-9',
      lg: 'text-base px-5 py-2 gap-2.5 h-11',
    };

    const variantStyles = {
      primary:
        'bg-[#0078d4] hover:bg-[#106ebe] text-white shadow-sm border border-transparent active:bg-[#005a9e]',
      secondary:
        'bg-white/80 dark:bg-[#2d2d2d] hover:bg-white dark:hover:bg-[#383838] text-[#1f1f1f] dark:text-white border border-black/10 dark:border-white/10 shadow-sm',
      subtle:
        'bg-transparent hover:bg-black/5 dark:hover:bg-white/5 text-[#1f1f1f] dark:text-[#adadad] hover:text-black dark:hover:text-white',
      danger:
        'bg-red-600 hover:bg-red-700 text-white shadow-sm border border-transparent',
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={clsx(baseStyles, sizeStyles[size], variantStyles[variant], className)}
        {...props}
      >
        {isLoading ? <Loader2 className="w-4 h-4 animate-spin shrink-0" /> : icon ? <span className="shrink-0">{icon}</span> : null}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
