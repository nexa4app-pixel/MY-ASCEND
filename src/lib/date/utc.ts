/**
 * UTC ISO-8601 Date Helper Utilities
 * Strictly ensures all database timestamps are stored in UTC ISO-8601 format.
 */

export function getCurrentUtcIsoString(): string {
  return new Date().toISOString();
}

export function formatUtcIso(input: Date | string | number): string {
  const date = input instanceof Date ? input : new Date(input);
  if (isNaN(date.getTime())) {
    throw new Error(`Invalid date input provided: ${input}`);
  }
  return date.toISOString();
}

export function parseUtcIso(isoString: string): Date {
  const date = new Date(isoString);
  if (isNaN(date.getTime())) {
    throw new Error(`Invalid ISO date string: ${isoString}`);
  }
  return date;
}

export function isValidUtcIso(isoString: string): boolean {
  if (typeof isoString !== 'string' || !isoString.trim()) {
    return false;
  }
  // Check ISO-8601 pattern
  const isoRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?Z?$/;
  if (!isoRegex.test(isoString) && isNaN(Date.parse(isoString))) {
    return false;
  }
  const date = new Date(isoString);
  return !isNaN(date.getTime());
}

export function formatUtcDisplay(isoString: string): string {
  const date = parseUtcIso(isoString);
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  const hours = String(date.getUTCHours()).padStart(2, '0');
  const minutes = String(date.getUTCMinutes()).padStart(2, '0');
  const seconds = String(date.getUTCSeconds()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds} UTC`;
}

export function getUtcTimestamp(): number {
  return Date.now();
}
