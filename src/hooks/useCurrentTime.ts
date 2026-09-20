import { useState, useEffect } from 'react';
import { getDualDateDisplay, CalendarDialect } from '../lib/date/jalali';
import { getCurrentUtcIsoString, formatUtcDisplay, getDateInTimezone } from '../lib/date/utc';
import { useSettingsStore } from '../store/useSettingsStore';

export function useCurrentTime(intervalMs: number = 1000) {
  const [now, setNow] = useState<Date>(new Date());
  const timezone = useSettingsStore((state) => state.settings.timezone || 'Asia/Kabul');
  const dialect: CalendarDialect = useSettingsStore((state) => state.settings.calendar_dialect || 'afghan');

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, intervalMs);
    return () => clearInterval(timer);
  }, [intervalMs]);

  const targetDate = getDateInTimezone(now, timezone);
  const dualDates = getDualDateDisplay(targetDate, dialect);
  const currentUtcIso = getCurrentUtcIsoString();
  const currentUtcDisplay = formatUtcDisplay(currentUtcIso);

  return {
    now,
    targetDate,
    jalaliDate: dualDates.jalali,
    gregorianDate: dualDates.gregorian,
    utcDisplay: currentUtcDisplay,
    utcIso: currentUtcIso,
    timezone,
    dialect,
  };
}
