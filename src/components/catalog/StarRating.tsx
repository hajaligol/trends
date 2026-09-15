/** Read-only 1–5 star rating display, shared by the product page's
 * reviews list and its average-rating summary line. Plain Unicode glyphs
 * (no icon dependency) — matches the ★/☆ pair already used in
 * `ReviewModerationRow.tsx` so the customer-facing and admin-facing
 * rating rendering stay visually consistent. */
export function StarRating({ rating, size = "0.9rem" }: { rating: number; size?: string }) {
  const rounded = Math.round(rating);
  return (
    <span aria-label={`${rating} از ۵ ستاره`} style={{ fontSize: size }} className="text-ink" dir="ltr">
      {"★".repeat(rounded)}
      {"☆".repeat(5 - rounded)}
    </span>
  );
}
