/**
 * Size presets for the admin's multi-select. Sizes are stored as plain
 * text on the variant (`size`), so a custom size typed by the admin works
 * exactly like a preset.
 */
export const FREE_SIZE_LABEL = "فری‌سایز";

export const SIZE_PRESETS = [
  { id: "letters", label: "سایز حروفی", sizes: ["XS", "S", "M", "L", "XL", "XXL", "3XL"] },
  {
    id: "shoes",
    label: "شماره کفش",
    sizes: ["35", "36", "37", "38", "39", "40", "41", "42", "43", "44", "45", "46"],
  },
  { id: "other", label: "سایر", sizes: [FREE_SIZE_LABEL] },
] as const;

export const MAX_SIZE_LENGTH = 40;
