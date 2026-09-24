import { RatingStarIcon } from "@/components/ui/icons";

/** Read-only 1–5 star rating display, shared by the product page's
 * reviews list, its average-rating summary and the rating link under the
 * title. Filled stars are gold; the remainder are thin ink outlines.
 * `size` is the width/height of each star (any CSS length). */
export function StarRating({ rating, size = "1.2rem" }: { rating: number; size?: string }) {
  const rounded = Math.min(5, Math.max(0, Math.round(rating)));
  return (
    <span role="img" aria-label={`${rating} از ۵ ستاره`} className="inline-flex items-center gap-0.5 text-ink/30" dir="ltr">
      {[1, 2, 3, 4, 5].map((value) => (
        <RatingStarIcon key={value} filled={value <= rounded} style={{ width: size, height: size }} />
      ))}
    </span>
  );
}
