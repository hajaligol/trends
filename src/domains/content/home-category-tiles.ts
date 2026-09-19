/**
 * The six squares of the homepage category row — pure data, no database
 * or framework imports. Keys, labels and links are fixed here; only the
 * picture for each square is admin-editable (`home_category_tiles`, managed
 * at `/admin/content`).
 *
 * The fifth square ("اکسسوری") covers men's *and* women's accessories, so it
 * links to the combined `/accessories` page rather than to one category —
 * which is also why the images live in their own table instead of on
 * `categories.image_url`.
 */
export const HOME_CATEGORY_TILES = [
  { key: "men-clothing", label: "لباس مردانه", href: "/category/men-clothing" },
  { key: "women-clothing", label: "لباس زنانه", href: "/category/women-clothing" },
  { key: "men-shoes", label: "کفش مردانه", href: "/category/men-shoes" },
  { key: "women-shoes", label: "کفش زنانه", href: "/category/women-shoes" },
  { key: "accessories", label: "اکسسوری", href: "/accessories" },
  { key: "kids", label: "محصولات بچگانه", href: "/category/kids" },
] as const;

export type HomeCategoryTileKey = (typeof HOME_CATEGORY_TILES)[number]["key"];

export type HomeCategoryTile = {
  key: HomeCategoryTileKey;
  label: string;
  href: string;
  /** `null` until an admin picks a picture — the square shows a placeholder. */
  imageUrl: string | null;
};

export function isHomeCategoryTileKey(value: string): value is HomeCategoryTileKey {
  return HOME_CATEGORY_TILES.some((tile) => tile.key === value);
}
