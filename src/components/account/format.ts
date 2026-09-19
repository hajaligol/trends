import { toPersianDigits } from "@/lib/utils/persian-digits";

/** Persian (Jalali) long date, e.g. «۱۴ مهر ۱۴۰۵». */
export function formatPersianDate(date: Date): string {
  return toPersianDigits(
    new Intl.DateTimeFormat("fa-IR", { year: "numeric", month: "long", day: "numeric" }).format(date),
  );
}

/** Persian (Jalali) month + year, e.g. «مهر ۱۴۰۵». */
export function formatPersianMonthYear(date: Date): string {
  return toPersianDigits(new Intl.DateTimeFormat("fa-IR", { year: "numeric", month: "long" }).format(date));
}
