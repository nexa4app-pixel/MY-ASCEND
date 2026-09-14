import React, { forwardRef } from 'react';
import { clsx } from 'clsx';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  prefixIcon?: React.ReactNode;
  suffixIcon?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, helperText, prefixIcon, suffixIcon, disabled, id, ...props }, ref) => {
    const inputId = id || (label ? `input_${label.replace(/\s+/g, '_').toLowerCase()}` : undefined);

    return (
      <div className="w-full flex flex-col gap-1.5 text-start">
        {label && (
          <label htmlFor={inputId} className="text-xs font-medium text-[#616161] dark:text-[#adadad]">
            {label}
          </label>
        )}
        <div className="relative flex items-center w-full">
          {prefixIcon && (
            <div className="absolute inset-y-0 start-0 flex items-center ps-3 pointer-events-none text-black/40 dark:text-white/40">
              {prefixIcon}
            </div>
          )}
          <input
            id={inputId}
            ref={ref}
            disabled={disabled}
            className={clsx(
              'w-full bg-white dark:bg-[#2b2b2b] text-[#1f1f1f] dark:text-white placeholder-[#8a8a8a] text-sm rounded-md border border-black/15 dark:border-white/15 px-3 py-1.5 h-9 transition-colors duration-150',
              'focus:outline-none focus:border-[#0078d4] focus:ring-1 focus:ring-[#0078d4]',
              'disabled:opacity-50 disabled:bg-black/5 dark:disabled:bg-white/5 disabled:cursor-not-allowed',
              prefixIcon && 'ps-9',
              suffixIcon && 'pe-9',
              error && 'border-red-500 focus:border-red-500 focus:ring-red-500',
              className
            )}
            {...props}
          />
          {suffixIcon && (
            <div className="absolute inset-y-0 end-0 flex items-center pe-3 pointer-events-none text-black/40 dark:text-white/40">
              {suffixIcon}
            </div>
          )}
        </div>
        {error ? (
          <span className="text-xs text-red-500">{error}</span>
        ) : helperText ? (
          <span className="text-xs text-[#8a8a8a]">{helperText}</span>
        ) : null}
      </div>
    );
  }
);

Input.displayName = 'Input';
