import { toPersianDigits } from "./persian-digits";

/**
 * Jalali (Solar Hijri) calendar helpers for the admin date pickers.
 *
 * Storage stays Gregorian: forms still submit `YYYY-MM-DD` /
 * `YYYY-MM-DDTHH:mm` (Tehran wall clock), so no Server Action, query or
 * filter needed to change. Only what the operator *sees and clicks* is Jalali.
 *
 * Uses the 33-year-cycle arithmetic (exact for the modern era; it agrees with
 * the official calendar for 1206–1473 / 1827–2094 CE, far beyond any date a
 * store will enter).
 */

export const JALALI_MONTHS = [
  "فروردین",
  "اردیبهشت",
  "خرداد",
  "تیر",
  "مرداد",
  "شهریور",
  "مهر",
  "آبان",
  "آذر",
  "دی",
  "بهمن",
  "اسفند",
] as const;

/** Saturday-first week, the Iranian convention. */
export const JALALI_WEEKDAYS_SHORT = ["ش", "ی", "د", "س", "چ", "پ", "ج"] as const;
export const JALALI_WEEKDAYS_LONG = ["شنبه", "یکشنبه", "دوشنبه", "سه‌شنبه", "چهارشنبه", "پنجشنبه", "جمعه"] as const;

export type JalaliDate = { year: number; month: number; day: number };
export type GregorianDate = { year: number; month: number; day: number };

const G_DAYS_BEFORE_MONTH = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];

export function gregorianToJalali(gy: number, gm: number, gd: number): JalaliDate {
  let jy = gy <= 1600 ? 0 : 979;
  const adjusted = gy <= 1600 ? gy - 621 : gy - 1600;
  const gy2 = gm > 2 ? adjusted + 1 : adjusted;
  let days =
    365 * adjusted +
    Math.floor((gy2 + 3) / 4) -
    Math.floor((gy2 + 99) / 100) +
    Math.floor((gy2 + 399) / 400) -
    80 +
    gd +
    G_DAYS_BEFORE_MONTH[gm - 1]!;
  jy += 33 * Math.floor(days / 12053);
  days %= 12053;
  jy += 4 * Math.floor(days / 1461);
  days %= 1461;
  if (days > 365) {
    jy += Math.floor((days - 1) / 365);
    days = (days - 1) % 365;
  }
  const month = days < 186 ? 1 + Math.floor(days / 31) : 7 + Math.floor((days - 186) / 30);
  const day = 1 + (days < 186 ? days % 31 : (days - 186) % 30);
  return { year: jy, month, day };
}

export function jalaliToGregorian(jy: number, jm: number, jd: number): GregorianDate {
  const adjusted = jy + 1595;
  let days =
    -355668 +
    365 * adjusted +
    Math.floor(adjusted / 33) * 8 +
    Math.floor(((adjusted % 33) + 3) / 4) +
    jd +
    (jm < 7 ? (jm - 1) * 31 : (jm - 7) * 30 + 186);
  let gy = 400 * Math.floor(days / 146097);
  days %= 146097;
  if (days > 36524) {
    days -= 1;
    gy += 100 * Math.floor(days / 36524);
    days %= 36524;
    if (days >= 365) days += 1;
  }
  gy += 4 * Math.floor(days / 1461);
  days %= 1461;
  if (days > 365) {
    gy += Math.floor((days - 1) / 365);
    days = (days - 1) % 365;
  }
  let gd = days + 1;
  const leap = (gy % 4 === 0 && gy % 100 !== 0) || gy % 400 === 0;
  const lengths = [0, 31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  let gm = 0;
  while (gm < 13 && gd > lengths[gm]!) {
    gd -= lengths[gm]!;
    gm += 1;
  }
  return { year: gy, month: gm, day: gd };
}

export function isJalaliLeapYear(jy: number): boolean {
  const back = gregorianToJalali(
    ...(Object.values(jalaliToGregorian(jy, 12, 30)) as [number, number, number]),
  );
  return back.year === jy && back.month === 12 && back.day === 30;
}

export function jalaliMonthLength(jy: number, jm: number): number {
  if (jm <= 6) return 31;
  if (jm <= 11) return 30;
  return isJalaliLeapYear(jy) ? 30 : 29;
}

/** 0 = Saturday … 6 = Friday, for a Jalali date. */
export function jalaliWeekday(jy: number, jm: number, jd: number): number {
  const g = jalaliToGregorian(jy, jm, jd);
  const sundayFirst = new Date(Date.UTC(g.year, g.month - 1, g.day)).getUTCDay();
  return (sundayFirst + 1) % 7;
}

const pad = (value: number, length = 2) => String(value).padStart(length, "0");

/* ------------------------------------------------------------------ */
/* Value parsing / formatting (Gregorian ISO strings <-> Jalali parts) */
/* ------------------------------------------------------------------ */

export type PickerValue = { jalali: JalaliDate; hour: number; minute: number };

/** `"2026-10-19"` or `"2026-10-19T14:30"` → parts. `null` for empty/invalid. */
export function parsePickerValue(value: string | null | undefined): PickerValue | null {
  if (!value) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?$/.exec(value);
  if (!match) return null;
  const [gy, gm, gd] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const hour = match[4] === undefined ? 0 : Number(match[4]);
  const minute = match[5] === undefined ? 0 : Number(match[5]);
  if (gm < 1 || gm > 12 || gd < 1 || gd > 31 || hour > 23 || minute > 59) return null;
  const check = new Date(Date.UTC(gy, gm - 1, gd));
  if (check.getUTCFullYear() !== gy || check.getUTCMonth() !== gm - 1 || check.getUTCDate() !== gd) return null;
  return { jalali: gregorianToJalali(gy, gm, gd), hour, minute };
}

/** Parts → `"YYYY-MM-DD"` (or with `THH:mm` when `withTime`). */
export function buildPickerValue(jalali: JalaliDate, hour: number, minute: number, withTime: boolean): string {
  const g = jalaliToGregorian(jalali.year, jalali.month, jalali.day);
  const date = `${pad(g.year, 4)}-${pad(g.month)}-${pad(g.day)}`;
  return withTime ? `${date}T${pad(hour)}:${pad(minute)}` : date;
}

/** `"۱۴۰۵/۰۷/۲۷"` or `"۱۴۰۵/۰۷/۲۷ ۱۴:۳۰"` for display; `null` when empty/invalid. */
export function formatPickerValue(value: string | null | undefined): string | null {
  const parsed = parsePickerValue(value);
  if (!parsed) return null;
  const { year, month, day } = parsed.jalali;
  const date = `${pad(year, 4)}/${pad(month)}/${pad(day)}`;
  const hasTime = !!value && value.includes("T");
  return toPersianDigits(hasTime ? `${date} ${pad(parsed.hour)}:${pad(parsed.minute)}` : date);
}

/** Long form: «۲۷ مهر ۱۴۰۵»; used in the picker header / aria labels. */
export function formatJalaliLong(jalali: JalaliDate): string {
  return toPersianDigits(`${jalali.day} ${JALALI_MONTHS[jalali.month - 1]} ${jalali.year}`);
}
