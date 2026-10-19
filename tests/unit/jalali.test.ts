import { describe, expect, it } from "vitest";
import {
  buildPickerValue,
  formatPickerValue,
  gregorianToJalali,
  isJalaliLeapYear,
  jalaliMonthLength,
  jalaliToGregorian,
  jalaliWeekday,
  parsePickerValue,
} from "@/lib/utils/jalali";

describe("jalali conversion", () => {
  it("maps known dates", () => {
    expect(gregorianToJalali(2026, 10, 19)).toEqual({ year: 1405, month: 7, day: 27 });
    expect(gregorianToJalali(2026, 3, 21)).toEqual({ year: 1405, month: 1, day: 1 });
    expect(gregorianToJalali(2025, 3, 20)).toEqual({ year: 1403, month: 12, day: 30 });
    expect(jalaliToGregorian(1405, 7, 1)).toEqual({ year: 2026, month: 9, day: 23 });
  });

  it("round-trips every day across several years", () => {
    const start = Date.UTC(2020, 0, 1);
    for (let i = 0; i < 365 * 12; i++) {
      const d = new Date(start + i * 86_400_000);
      const g = { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate() };
      const j = gregorianToJalali(g.year, g.month, g.day);
      expect(jalaliToGregorian(j.year, j.month, j.day)).toEqual(g);
    }
  });

  it("knows leap years and month lengths", () => {
    expect(isJalaliLeapYear(1403)).toBe(true);
    expect(isJalaliLeapYear(1404)).toBe(false);
    expect(jalaliMonthLength(1403, 12)).toBe(30);
    expect(jalaliMonthLength(1404, 12)).toBe(29);
    expect(jalaliMonthLength(1405, 6)).toBe(31);
    expect(jalaliMonthLength(1405, 7)).toBe(30);
  });

  it("uses a Saturday-first week", () => {
    // 2026-10-19 is a Monday → index 2 (Sat=0, Sun=1, Mon=2)
    expect(jalaliWeekday(1405, 7, 27)).toBe(2);
    expect(jalaliWeekday(1405, 7, 24)).toBe(6); // Friday 2026-10-16
  });
});

describe("picker values", () => {
  it("parses and rebuilds date and datetime strings", () => {
    const p = parsePickerValue("2026-10-19T14:30")!;
    expect(p.jalali).toEqual({ year: 1405, month: 7, day: 27 });
    expect([p.hour, p.minute]).toEqual([14, 30]);
    expect(buildPickerValue(p.jalali, 14, 30, true)).toBe("2026-10-19T14:30");
    expect(buildPickerValue(p.jalali, 0, 0, false)).toBe("2026-10-19");
  });

  it("rejects garbage and impossible dates", () => {
    expect(parsePickerValue("")).toBeNull();
    expect(parsePickerValue("2026-02-31")).toBeNull();
    expect(parsePickerValue("2026-10-19T25:00")).toBeNull();
    expect(parsePickerValue("nope")).toBeNull();
  });

  it("formats with Persian digits", () => {
    expect(formatPickerValue("2026-10-19")).toBe("۱۴۰۵/۰۷/۲۷");
    expect(formatPickerValue("2026-10-19T09:05")).toBe("۱۴۰۵/۰۷/۲۷ ۰۹:۰۵");
    expect(formatPickerValue(null)).toBeNull();
  });
});
