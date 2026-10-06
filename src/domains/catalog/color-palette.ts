/**
 * The colour palette the admin picks from (instead of typing hex codes).
 * `name` is what customers see, `hex` drives the swatch, `code` is the
 * short ASCII token used in generated SKUs. Pure data — importable from
 * client components, Server Actions and tests.
 *
 * The server only accepts palette colours for new variants (looked up by
 * `code`, so a tampered name/hex in the form can't slip in); an existing
 * variant whose colour predates the palette keeps working and can be
 * saved unchanged.
 */
export type PaletteColor = { code: string; name: string; hex: string };

export const COLOR_PALETTE: readonly PaletteColor[] = [
  { code: "BLK", name: "مشکی", hex: "#1A1A1A" },
  { code: "WHT", name: "سفید", hex: "#FFFFFF" },
  { code: "CRM", name: "کرم", hex: "#F3E9D2" },
  { code: "BEG", name: "بژ", hex: "#D9C2A0" },
  { code: "LGY", name: "طوسی روشن", hex: "#C9CDD1" },
  { code: "GRY", name: "طوسی", hex: "#8C939A" },
  { code: "DGY", name: "ذغالی", hex: "#4B5057" },
  { code: "SLV", name: "نقره‌ای", hex: "#B8BCC2" },
  { code: "BRN", name: "قهوه‌ای", hex: "#7A5230" },
  { code: "CHC", name: "شکلاتی", hex: "#4A2C1A" },
  { code: "CML", name: "کاراملی", hex: "#B87333" },
  { code: "KHK", name: "خاکی", hex: "#8A8B5C" },
  { code: "OLV", name: "زیتونی", hex: "#6B7B3A" },
  { code: "GRN", name: "سبز", hex: "#3E8E5A" },
  { code: "SAG", name: "مریم‌گلی", hex: "#D2D9BF" },
  { code: "LGR", name: "سبز روشن", hex: "#9BD39F" },
  { code: "TRQ", name: "فیروزه‌ای", hex: "#2BB5B8" },
  { code: "AQU", name: "آبی آکوا", hex: "#B5D6CF" },
  { code: "LBL", name: "آبی روشن", hex: "#AAD0E2" },
  { code: "BLU", name: "آبی", hex: "#2F6FB5" },
  { code: "NVY", name: "سرمه‌ای", hex: "#1F2D4D" },
  { code: "LIL", name: "یاسی", hex: "#E2D4EC" },
  { code: "PRP", name: "بنفش", hex: "#7B4FB3" },
  { code: "PNK", name: "صورتی", hex: "#EFC8CA" },
  { code: "BLS", name: "گلبهی", hex: "#FADBD8" },
  { code: "FUC", name: "سرخابی", hex: "#C2185B" },
  { code: "RED", name: "قرمز", hex: "#C62828" },
  { code: "BUR", name: "زرشکی", hex: "#7A1F2E" },
  { code: "ORG", name: "نارنجی", hex: "#EF7B2E" },
  { code: "PCH", name: "هلویی", hex: "#F5B895" },
  { code: "YLW", name: "زرد", hex: "#F2C230" },
  { code: "PYL", name: "زرد پاستلی", hex: "#FBE1B4" },
  { code: "MUS", name: "خردلی", hex: "#C9A227" },
  { code: "GLD", name: "طلایی", hex: "#C9A24B" },
  // --- Extended palette ---
  { code: "OFW", name: "سفید شیری", hex: "#F6F1E7" },
  { code: "IVR", name: "عاجی", hex: "#EFE6CF" },
  { code: "SND", name: "شنی", hex: "#CDB596" },
  { code: "TAN", name: "قهوه‌ای روشن", hex: "#B08D68" },
  { code: "CFE", name: "قهوه‌ای تیره", hex: "#5A3A26" },
  { code: "CPR", name: "مسی", hex: "#B4694A" },
  { code: "BRK", name: "آجری", hex: "#A64B3A" },
  { code: "RST", name: "زنگاری", hex: "#9C4A2B" },
  { code: "TRC", name: "تراکوتا", hex: "#C8704D" },
  { code: "CRL", name: "مرجانی", hex: "#F27F72" },
  { code: "SAL", name: "سالمونی", hex: "#F4A28C" },
  { code: "DPK", name: "صورتی پررنگ", hex: "#E5649A" },
  { code: "DSP", name: "صورتی خاکی", hex: "#D4A5A5" },
  { code: "RSE", name: "رز", hex: "#C98A94" },
  { code: "WIN", name: "شرابی", hex: "#5E1A2B" },
  { code: "MRN", name: "عنابی", hex: "#6E1423" },
  { code: "LRD", name: "قرمز روشن", hex: "#E5484D" },
  { code: "LVD", name: "اسطوخودوسی", hex: "#B9A7D6" },
  { code: "ORC", name: "ارکیده‌ای", hex: "#B565A7" },
  { code: "PLM", name: "آلویی", hex: "#6A2E5C" },
  { code: "ELP", name: "بنفش تیره", hex: "#3F2A63" },
  { code: "ICE", name: "آبی یخی", hex: "#DCEBF5" },
  { code: "SKY", name: "آبی آسمانی", hex: "#79B8E8" },
  { code: "JNS", name: "آبی جینی", hex: "#4A6E96" },
  { code: "ROY", name: "آبی کاربنی", hex: "#2A4FA5" },
  { code: "PET", name: "نفتی", hex: "#1F4E5F" },
  { code: "TEA", name: "سبزآبی", hex: "#1E8C8C" },
  { code: "MNT", name: "نعنایی", hex: "#B5E3CF" },
  { code: "PST", name: "پسته‌ای", hex: "#B7C98A" },
  { code: "LIM", name: "لیمویی", hex: "#D6E04F" },
  { code: "FRS", name: "سبز جنگلی", hex: "#2F5D3A" },
  { code: "BTG", name: "سبز یشمی", hex: "#2E7D5B" },
  { code: "AMY", name: "سبز ارتشی", hex: "#4B5320" },
  { code: "BTL", name: "سبز کله‌غازی", hex: "#0F4D3A" },
  { code: "LMN", name: "زرد لیمویی", hex: "#F7EB7A" },
  { code: "SUN", name: "زرد آفتابی", hex: "#FFC93C" },
  { code: "APR", name: "زردآلویی", hex: "#F9B26B" },
  { code: "BRZ", name: "برنزی", hex: "#9C6B30" },
  { code: "RGD", name: "رزگلد", hex: "#D4A59A" },
  { code: "GNM", name: "گان‌متال", hex: "#2E3338" },
  { code: "ANT", name: "طوسی تیره", hex: "#3A3F44" },
  { code: "STL", name: "فولادی", hex: "#6C7A89" },
  { code: "MLT", name: "ملانژ", hex: "#A9A9A9" },
] as const;

const BY_CODE = new Map(COLOR_PALETTE.map((color) => [color.code, color]));

export function getPaletteColor(code: string): PaletteColor | undefined {
  return BY_CODE.get(code);
}

/** Palette entry for an existing variant (matched by hex, then by name). */
export function findPaletteColor(color: { name?: string | null; hex?: string | null }): PaletteColor | undefined {
  const hex = color.hex?.toLowerCase();
  return (
    COLOR_PALETTE.find((entry) => hex && entry.hex.toLowerCase() === hex && (!color.name || entry.name === color.name)) ??
    COLOR_PALETTE.find((entry) => color.name && entry.name === color.name)
  );
}

/** Light swatches need a visible edge on a white card. */
export function isLightColor(hex: string): boolean {
  const value = hex.replace("#", "");
  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 > 200;
}

/** Special `colorCode` meaning "keep this variant's current colour" — for
 * variants whose colour predates the palette. */
export const KEEP_CURRENT_COLOR = "__current__";
