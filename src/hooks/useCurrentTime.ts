import { useState, useEffect } from 'react';
import { getDualDateDisplay } from '../lib/date/jalali';
import { getCurrentUtcIsoString, formatUtcDisplay } from '../lib/date/utc';

export function useCurrentTime(intervalMs: number = 1000) {
  const [now, setNow] = useState<Date>(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, intervalMs);
    return () => clearInterval(timer);
  }, [intervalMs]);

  const dualDates = getDualDateDisplay(now);
  const currentUtcIso = getCurrentUtcIsoString();
  const currentUtcDisplay = formatUtcDisplay(currentUtcIso);

  return {
    now,
    jalaliDate: dualDates.jalali,
    gregorianDate: dualDates.gregorian,
    utcDisplay: currentUtcDisplay,
    utcIso: currentUtcIso,
  };
}
