import React, { useState } from 'react';
import { clsx } from 'clsx';

export interface TooltipProps {
  content: string;
  children: React.ReactNode;
  position?: 'top' | 'bottom' | 'start' | 'end';
}

export const Tooltip: React.FC<TooltipProps> = ({
  content,
  children,
  position = 'top',
}) => {
  const [isVisible, setIsVisible] = useState(false);

  const positionStyles = {
    top: 'bottom-full start-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full start-1/2 -translate-x-1/2 mt-2',
    start: 'end-full top-1/2 -translate-y-1/2 me-2',
    end: 'start-full top-1/2 -translate-y-1/2 ms-2',
  };

  return (
    <div
      className="relative inline-flex"
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
      onFocus={() => setIsVisible(true)}
      onBlur={() => setIsVisible(false)}
    >
      {children}
      {isVisible && (
        <div
          role="tooltip"
          className={clsx(
            'absolute z-50 px-2 py-1 text-xs font-normal text-white bg-[#1e1e1e] dark:bg-[#333333] rounded shadow-fluent-elevation-4 border border-white/10 whitespace-nowrap pointer-events-none transition-opacity duration-150',
            positionStyles[position]
          )}
        >
          {content}
        </div>
      )}
    </div>
  );
};
