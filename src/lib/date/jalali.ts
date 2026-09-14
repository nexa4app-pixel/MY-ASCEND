/**
 * Jalali (Shamsi / Persian) <-> Gregorian Date Abstraction Helpers
 * Robust astronomical conversion algorithm with Persian month names and numeral formatting.
 */

export interface JalaliDate {
  year: number;
  month: number; // 1 - 12
  day: number; // 1 - 31
}

export interface GregorianDate {
  year: number;
  month: number; // 1 - 12
  day: number; // 1 - 31
}

export const JALALI_MONTH_NAMES = [
  'فروردین',
  'اردیبهشت',
  'خرداد',
  'تیر',
  'مرداد',
  'شهریور',
  'مهر',
  'آبان',
  'آذر',
  'دی',
  'بهمن',
  'اسفند',
] as const;

export const JALALI_WEEKDAY_NAMES = [
  'یکشنبه',
  'دوشنبه',
  'سه‌شنبه',
  'چهارشنبه',
  'پنجشنبه',
  'جمعه',
  'شنبه',
] as const;

export function isLeapGregorianYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

export function isLeapJalaliYear(year: number): boolean {
  // 33-year cycle algorithm
  const breaks = [-61, 9, 38, 199, 426, 686, 756, 818, 1111, 1181, 1210, 1635, 2060, 2097, 2192, 2262, 2324, 2394, 2456, 3178];
  let jp = breaks[0];
  let jump = 0;
  for (let j = 1; j < breaks.length; j += 1) {
    const jm = breaks[j];
    jump = jm - jp;
    if (year < jm) break;
    jp = jm;
  }
  let n = year - jp;
  if (jump - n < 6) n = n - jump + (Math.floor((jump + 4) / 33) * 33);
  let leap = ((((n + 1) % 33) - 1) % 4);
  if (leap === -1) leap = 4;
  return leap === 0;
}

/**
 * Convert Gregorian calendar date to Jalali calendar date.
 */
export function gregorianToJalali(gy: number, gm: number, gd: number): JalaliDate {
  const gDaysInMonth = [31, isLeapGregorianYear(gy) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  let gy2 = gy - 1600;
  let gm2 = gm - 1;
  let gd2 = gd - 1;

  let gDayNo = 365 * gy2 + Math.floor((gy2 + 3) / 4) - Math.floor((gy2 + 99) / 100) + Math.floor((gy2 + 399) / 400);

  for (let i = 0; i < gm2; ++i) {
    gDayNo += gDaysInMonth[i];
  }
  gDayNo += gd2;

  let jDayNo = gDayNo - 79;
  let jNp = Math.floor(jDayNo / 12053);
  jDayNo %= 12053;

  let jy = 979 + 33 * jNp + 4 * Math.floor(jDayNo / 1461);
  jDayNo %= 1461;

  if (jDayNo >= 366) {
    jy += Math.floor((jDayNo - 1) / 365);
    jDayNo = (jDayNo - 1) % 365;
  }

  let jm = 0;
  let jd = 0;

  if (jDayNo < 186) {
    jm = 1 + Math.floor(jDayNo / 31);
    jd = 1 + (jDayNo % 31);
  } else {
    jm = 7 + Math.floor((jDayNo - 186) / 30);
    jd = 1 + ((jDayNo - 186) % 30);
  }

  return { year: jy, month: jm, day: jd };
}

/**
 * Convert Jalali calendar date to Gregorian calendar date.
 */
export function jalaliToGregorian(jy: number, jm: number, jd: number): GregorianDate {
  let jy2 = jy - 979;
  let jm2 = jm - 1;
  let jd2 = jd - 1;

  let jDayNo = 365 * jy2 + Math.floor(jy2 / 33) * 8 + Math.floor(((jy2 % 33) + 3) / 4);
  for (let i = 0; i < jm2; ++i) {
    jDayNo += i < 6 ? 31 : 30;
  }
  jDayNo += jd2;

  let gDayNo = jDayNo + 79;

  let gy = 1600 + 400 * Math.floor(gDayNo / 146097);
  gDayNo %= 146097;

  let leap = true;
  if (gDayNo >= 36525) {
    gDayNo--;
    gy += 100 * Math.floor(gDayNo / 36524);
    gDayNo %= 36524;

    if (gDayNo >= 365) {
      gDayNo++;
    } else {
      leap = false;
    }
  }

  gy += 4 * Math.floor(gDayNo / 1461);
  gDayNo %= 1461;

  if (gDayNo >= 366) {
    leap = false;
    gDayNo--;
    gy += Math.floor(gDayNo / 365);
    gDayNo %= 365;
  }

  const gDaysInMonth = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  let gm = 0;
  while (gDayNo >= gDaysInMonth[gm]) {
    gDayNo -= gDaysInMonth[gm];
    gm++;
  }

  return { year: gy, month: gm + 1, day: gDayNo + 1 };
}

export function toPersianDigits(input: string | number): string {
  const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  return String(input).replace(/[0-9]/g, (w) => persianDigits[parseInt(w, 10)]);
}

/**
 * Format Date object into Shamsi (Jalali) display string e.g. "۱۷ شهریور ۱۴۰۵"
 */
export function formatJalaliDisplay(date: Date = new Date(), persianDigits: boolean = true): string {
  const j = gregorianToJalali(date.getFullYear(), date.getMonth() + 1, date.getDate());
  const monthName = JALALI_MONTH_NAMES[j.month - 1];
  const formatted = `${j.day} ${monthName} ${j.year}`;
  return persianDigits ? toPersianDigits(formatted) : formatted;
}

/**
 * Get combined Jalali and Gregorian formatted string for header display
 */
export function getDualDateDisplay(date: Date = new Date()): { jalali: string; gregorian: string } {
  const jalaliStr = formatJalaliDisplay(date, true);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const gregorianStr = `${year}-${month}-${day}`;

  return {
    jalali: jalaliStr,
    gregorian: gregorianStr,
  };
}
