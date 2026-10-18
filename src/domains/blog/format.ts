import { toPersianDigits } from "@/lib/utils/persian-digits";

const DATE_FORMAT = new Intl.DateTimeFormat("fa-IR", { year: "numeric", month: "long", day: "numeric", timeZone: "Asia/Tehran" });

/** «۱۴ مهر ۱۴۰۵» — Persian calendar, Tehran time. */
export function formatBlogDate(date: Date): string {
  return toPersianDigits(DATE_FORMAT.format(date));
}

/** Same instant as an ISO string for `<time dateTime>` and structured data. */
export function isoDate(date: Date): string {
  return date.toISOString();
}

export function excerptFrom(text: string, max = 160): string {
  const flat = text.replace(/\s+/g, " ").trim();
  if (flat.length <= max) return flat;
  return `${flat.slice(0, max - 1).replace(/\s+\S*$/, "")}…`;
}
