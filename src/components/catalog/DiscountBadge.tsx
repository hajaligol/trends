import { toPersianDigits } from "@/lib/utils/persian-digits";

/** Pastel pill shown over a product image when it has an active discount. */
export function DiscountBadge({ percent }: { percent: number }) {
  if (percent <= 0) return null;
  return (
    <span className="absolute top-2.5 right-2.5 rounded-full bg-blush px-2.5 py-1 text-[0.75rem] font-semibold text-ink">
      {toPersianDigits(percent)}٪ تخفیف
    </span>
  );
}
