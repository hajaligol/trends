import Image from "next/image";
import { toPersianDigits } from "@/lib/utils/persian-digits";
import type { OrderItemPreview } from "@/domains/orders/queries";

/**
 * Small product thumbnails for an order summary row: up to `max` distinct
 * products, then a «+N» tile for the rest. Uses the order line's own image
 * snapshot; a line with no image (no real photography exists yet) gets a
 * neutral placeholder tile. Purely presentational — the row it sits in is
 * the link, so nothing here is interactive.
 */
export function OrderThumbnails({ items, max = 3 }: { items: OrderItemPreview[]; max?: number }) {
  if (items.length === 0) return null;

  // If exactly one product would be hidden, show it instead of a "+1" tile.
  const visibleCount = items.length === max + 1 ? items.length : Math.min(items.length, max);
  const visible = items.slice(0, visibleCount);
  const hidden = items.length - visible.length;

  const tile = "relative h-16 w-[52px] shrink-0 overflow-hidden rounded-lg border border-line bg-card-image";

  return (
    <div className="flex items-center gap-1.5">
      {visible.map((item) => (
        <div key={item.id} className={tile}>
          {item.imageUrl ? (
            <Image src={item.imageUrl} alt={item.productTitle} fill sizes="52px" className="object-cover" />
          ) : (
            <div role="img" aria-label={item.productTitle} className="h-full w-full bg-ink/[0.055]" />
          )}
        </div>
      ))}
      {hidden > 0 && (
        <div
          className={`${tile} flex items-center justify-center bg-[#f6f3ee] text-[0.82rem] font-semibold text-ink`}
          aria-label={`و ${toPersianDigits(hidden)} محصول دیگر`}
        >
          <span aria-hidden="true">+{toPersianDigits(hidden)}</span>
        </div>
      )}
    </div>
  );
}
