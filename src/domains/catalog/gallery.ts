/**
 * Colour-scoped product imagery — pure functions, no DB access, so the rules
 * are unit-tested and shared by the product page, the cart and orders.
 *
 * An image's `color` is either a colour name (matching
 * `product_variants.color`) or `null` for a "shared" image.
 */

export type ColoredImage = { url: string; altText: string; color: string | null };

/**
 * Images to show in the gallery for the selected colour.
 *
 * - The colour has its own photos → show only those (never another colour's).
 * - The colour has none → fall back to the shared (colour-less) images, so a
 *   product that was never photographed per colour keeps working as before.
 * - Neither → empty (the page renders its placeholder).
 *
 * Input order (the admin's display order) is preserved.
 */
export function selectGalleryImages<T extends ColoredImage>(images: T[], color: string | null): T[] {
  if (color !== null) {
    const own = images.filter((image) => image.color === color);
    if (own.length > 0) return own;
  }
  return images.filter((image) => image.color === null);
}

/**
 * The single thumbnail for a cart/order line: the first image of the line's
 * colour, else the first shared image. `images` must already be in display
 * order. Returns `null` when the product has nothing usable.
 */
export function pickImageForColor<T extends ColoredImage>(images: T[], color: string | null): T | null {
  return selectGalleryImages(images, color)[0] ?? null;
}
