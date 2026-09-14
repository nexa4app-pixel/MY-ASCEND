import { describe, it, expect } from 'vitest';
import {
  gregorianToJalali,
  jalaliToGregorian,
  isLeapJalaliYear,
  isLeapGregorianYear,
  toPersianDigits,
  formatJalaliDisplay,
} from '../src/lib/date/jalali';

describe('Jalali Date Abstraction Helpers', () => {
  it('should accurately convert 2026-09-07 to Jalali (1405-06-16)', () => {
    const j = gregorianToJalali(2026, 9, 7);
    expect(j.year).toBe(1405);
    expect(j.month).toBe(6); // Shahrivar
    expect(j.day).toBe(16);
  });

  it('should accurately convert Jalali (1405-06-16) back to Gregorian (2026-09-07)', () => {
    const g = jalaliToGregorian(1405, 6, 16);
    expect(g.year).toBe(2026);
    expect(g.month).toBe(9);
    expect(g.day).toBe(7);
  });

  it('should correctly identify leap years', () => {
    expect(isLeapGregorianYear(2024)).toBe(true);
    expect(isLeapGregorianYear(2026)).toBe(false);
    expect(isLeapJalaliYear(1399)).toBe(true);
    expect(isLeapJalaliYear(1403)).toBe(true);
    expect(isLeapJalaliYear(1405)).toBe(false);
  });

  it('should convert Latin numbers to Persian digits', () => {
    expect(toPersianDigits(1405)).toBe('۱۴۰۵');
    expect(toPersianDigits('2026/09/07')).toBe('۲۰۲۶/۰۹/۰۷');
  });

  it('should format full Jalali display string', () => {
    const date = new Date(2026, 8, 7); // Note month is 0-indexed in JS Date: 8 = September
    const formatted = formatJalaliDisplay(date, true);
    expect(formatted).toContain('شهریور');
    expect(formatted).toContain('۱۴۰۵');
    expect(formatted).toContain('۱۶');
  });
});
