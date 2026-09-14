import { describe, it, expect } from 'vitest';
import {
  getCurrentUtcIsoString,
  formatUtcIso,
  parseUtcIso,
  isValidUtcIso,
  formatUtcDisplay,
} from '../src/lib/date/utc';

describe('UTC Date Helper Utilities', () => {
  it('should generate a valid UTC ISO-8601 string', () => {
    const iso = getCurrentUtcIsoString();
    expect(isValidUtcIso(iso)).toBe(true);
    expect(iso.endsWith('Z')).toBe(true);
  });

  it('should format valid dates to UTC ISO format', () => {
    const d = new Date('2026-09-07T12:30:00Z');
    const formatted = formatUtcIso(d);
    expect(formatted).toBe('2026-09-07T12:30:00.000Z');
  });

  it('should parse valid UTC ISO string correctly', () => {
    const iso = '2026-09-07T14:45:00.000Z';
    const parsed = parseUtcIso(iso);
    expect(parsed.getUTCFullYear()).toBe(2026);
    expect(parsed.getUTCMonth()).toBe(8); // 0-indexed: September
    expect(parsed.getUTCDate()).toBe(7);
    expect(parsed.getUTCHours()).toBe(14);
    expect(parsed.getUTCMinutes()).toBe(45);
  });

  it('should throw error on invalid date inputs', () => {
    expect(() => formatUtcIso('invalid-date')).toThrow();
    expect(() => parseUtcIso('invalid-date')).toThrow();
    expect(isValidUtcIso('invalid-date')).toBe(false);
  });

  it('should format UTC display string correctly', () => {
    const iso = '2026-09-07T08:05:09.000Z';
    const display = formatUtcDisplay(iso);
    expect(display).toBe('2026-09-07 08:05:09 UTC');
  });
});
