import React, { forwardRef } from 'react';
import { clsx } from 'clsx';
import { ChevronDown } from 'lucide-react';

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: SelectOption[];
  error?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, options, error, id, ...props }, ref) => {
    const selectId = id || (label ? `select_${label.replace(/\s+/g, '_').toLowerCase()}` : undefined);

    return (
      <div className="w-full flex flex-col gap-1.5 text-start">
        {label && (
          <label htmlFor={selectId} className="text-xs font-medium text-[#616161] dark:text-[#adadad]">
            {label}
          </label>
        )}
        <div className="relative flex items-center w-full">
          <select
            id={selectId}
            ref={ref}
            className={clsx(
              'w-full appearance-none bg-white dark:bg-[#2b2b2b] text-[#1f1f1f] dark:text-white text-sm rounded-md border border-black/15 dark:border-white/15 px-3 pe-8 py-1.5 h-9 transition-colors duration-150',
              'focus:outline-none focus:border-[#0078d4] focus:ring-1 focus:ring-[#0078d4]',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              error && 'border-red-500 focus:border-red-500',
              className
            )}
            {...props}
          >
            {options.map((opt) => (
              <option key={opt.value} value={opt.value} className="bg-white dark:bg-[#2b2b2b] text-[#1f1f1f] dark:text-white">
                {opt.label}
              </option>
            ))}
          </select>
          <div className="absolute inset-y-0 end-0 flex items-center pe-2.5 pointer-events-none text-black/40 dark:text-white/40">
            <ChevronDown className="w-4 h-4" />
          </div>
        </div>
        {error && <span className="text-xs text-red-500">{error}</span>}
      </div>
    );
  }
);

Select.displayName = 'Select';
