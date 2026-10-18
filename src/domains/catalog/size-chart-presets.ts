/**
 * Starting points for the admin's sizing-table editor, by kind of product.
 * Presets only pre-fill the *column headings* (and the size column when the
 * product already has sizes) — the measurements themselves are always
 * entered by the admin, per product. Client-safe: no server imports.
 */
export type SizeChartPreset = {
  id: string;
  label: string;
  columns: string[];
  /** Size labels used for the first column when the product has no sizes yet. */
  defaultSizes: string[];
  note: string;
};

export const SIZE_CHART_PRESETS: SizeChartPreset[] = [
  {
    id: "tops",
    label: "لباس بالاتنه (تیشرت، پیراهن، هودی، کت)",
    columns: ["سایز", "دور سینه", "قد", "عرض شانه", "طول آستین"],
    defaultSizes: ["S", "M", "L", "XL", "XXL"],
    note: "اندازه‌ها بر حسب سانتی‌متر است.",
  },
  {
    id: "bottoms",
    label: "شلوار و دامن",
    columns: ["سایز", "دور کمر", "دور باسن", "قد"],
    defaultSizes: ["۳۰", "۳۲", "۳۴", "۳۶", "۳۸"],
    note: "اندازه‌ها بر حسب سانتی‌متر است.",
  },
  {
    id: "shoes",
    label: "کفش",
    columns: ["سایز (اروپا)", "طول کف پا (سانتی‌متر)"],
    defaultSizes: ["۳۹", "۴۰", "۴۱", "۴۲", "۴۳", "۴۴"],
    note: "برای انتخاب سایز، طول پای خود را از پاشنه تا انگشت بزرگ اندازه بگیرید.",
  },
  {
    id: "hats",
    label: "کلاه",
    columns: ["سایز", "دور سر"],
    defaultSizes: ["S", "M", "L"],
    note: "اندازه‌ها بر حسب سانتی‌متر است.",
  },
  {
    id: "custom",
    label: "جدول دلخواه (بدون قالب)",
    columns: ["سایز", ""],
    defaultSizes: [],
    note: "",
  },
];
