import { FREE_SIZE_LABEL } from "@/domains/catalog/sizes";
import { findPaletteColor } from "@/domains/catalog/color-palette";
import { slugifyTitle } from "@/domains/catalog/slug";

/**
 * Variant SKUs are derived from the product's unique code («کد کالا»):
 *   `<productCode>-<SIZE>-<COLOR>`   e.g. `100042-M-BLK`
 * Pure functions — the Server Action is the authority, the admin form uses
 * the same code to preview the SKUs it is about to create.
 */

export function sizeToken(size: string): string {
  const trimmed = size.trim();
  if (trimmed === FREE_SIZE_LABEL || trimmed.replace(/[‌\s]/g, "") === FREE_SIZE_LABEL.replace(/[‌\s]/g, "")) return "FREE";
  const ascii = trimmed.toUpperCase().replace(/[^A-Z0-9]+/g, "");
  if (ascii && /^[\x20-\x7e]+$/.test(trimmed)) return ascii;
  const transliterated = slugifyTitle(trimmed).replace(/-/g, "").toUpperCase();
  return transliterated || "X";
}

export function colorToken(color: { name: string; hex: string | null }): string {
  const palette = findPaletteColor({ name: color.name, hex: color.hex });
  if (palette) return palette.code;
  if (color.hex) return `C${color.hex.replace("#", "").toUpperCase()}`;
  return slugifyTitle(color.name).replace(/-/g, "").toUpperCase().slice(0, 6) || "CLR";
}

export function buildVariantSku(
  productCode: number | string,
  size: string,
  color: { name: string; hex: string | null },
): string {
  return `${productCode}-${sizeToken(size)}-${colorToken(color)}`;
}
