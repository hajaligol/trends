/**
 * Phase 2 demo/placeholder catalog content.
 *
 * All content here is copied from reference/prototype.html's hardcoded
 * markup (see TRENDS_PROJECT_CONTEXT.md §2 — these are explicitly called
 * out as seed/demo content, not permanent business requirements). It
 * exists so the homepage components have something real to render before
 * the database/catalog domain lands in Phase 3.
 *
 * Each shape here is intentionally close to what a real catalog read
 * model will look like, so swapping these constants for a database query
 * in Phase 3 should require minimal changes to the components that
 * consume them.
 */

export type CategorySwatch =
  | "sage"
  | "blush"
  | "blue"
  | "yellow"
  | "lavender"
  | "aqua";

export type DemoCategory = {
  id: string;
  label: string;
  swatch: CategorySwatch;
};

export const demoCategories: DemoCategory[] = [
  { id: "men", label: "مردان", swatch: "sage" },
  { id: "women", label: "زنان", swatch: "blush" },
  { id: "shoes", label: "کفش‌ها", swatch: "blue" },
  { id: "accessories", label: "اکسسوری‌ها", swatch: "yellow" },
  { id: "hats", label: "کلاه", swatch: "lavender" },
  { id: "sunglasses", label: "عینک آفتابی", swatch: "aqua" },
];

export type DemoProduct = {
  id: string;
  name: string;
  /** Display string only (e.g. "۵۹۰,۰۰۰ تومان") — Phase 3 stores prices
   * as integer base units and formats them at the presentation boundary
   * per TRENDS_PROJECT_CONTEXT.md §5 "Money". */
  price: string;
  reviewCount: string;
};

export const demoFeaturedProducts: DemoProduct[] = [
  { id: "classic-shirt", name: "پیراهن کلاسیک", price: "۵۹۰,۰۰۰ تومان", reviewCount: "۱۲۴" },
  { id: "womens-knit", name: "بافت زنانه", price: "۴۹۰,۰۰۰ تومان", reviewCount: "۹۸" },
  { id: "minimal-sneaker", name: "کتانی مینیمال", price: "۷۹۰,۰۰۰ تومان", reviewCount: "۲۱۰" },
  { id: "daily-hoodie", name: "هودی روزانه", price: "۶۹۰,۰۰۰ تومان", reviewCount: "۱۶۷" },
  { id: "trench-coat", name: "پالتو ترنج", price: "۱,۲۹۰,۰۰۰ تومان", reviewCount: "۹۳" },
];

export type DemoArrival = {
  id: string;
  name: string;
  price: string;
  swatches: string[];
};

export const demoNewArrivals: DemoArrival[] = [
  { id: "backpack", name: "کوله پشتی", price: "۷۹۰,۰۰۰ تومان", swatches: ["#182630"] },
  {
    id: "classic-cap",
    name: "کلاه کلاسیک",
    price: "۲۵۰,۰۰۰ تومان",
    swatches: ["#7C6A54", "#182630", "#D9C9A8"],
  },
  {
    id: "fabric-pants",
    name: "شلوار پارچه‌ای",
    price: "۵۹۰,۰۰۰ تومان",
    swatches: ["#5A6B63", "#182630"],
  },
  {
    id: "hoodie",
    name: "هودی",
    price: "۶۹۰,۰۰۰ تومان",
    swatches: ["#E7DFD2", "#8B8F87", "#182630"],
  },
  {
    id: "denim-jacket",
    name: "کت جین",
    price: "۸۹۰,۰۰۰ تومان",
    swatches: ["#5C7A93", "#182630"],
  },
  {
    id: "plain-tshirt",
    name: "تیشرت ساده",
    price: "۲۹۵,۰۰۰ تومان",
    swatches: ["#5A6B53", "#182630", "#AAD0E2"],
  },
];

export type DemoBanner = {
  id: string;
  tone: "pink" | "blue";
  title: string;
  description: string;
  ctaLabel: string;
};

export const demoBanners: DemoBanner[] = [
  {
    id: "womens-collection",
    tone: "pink",
    title: "مجموعه زنانه",
    description: "استایل بدون مرز، برای تمام روز.",
    ctaLabel: "خرید زنانه",
  },
  {
    id: "mens-collection",
    tone: "blue",
    title: "مجموعه مردانه",
    description: "استایل مدرن برای هر موقعیت.",
    ctaLabel: "خرید مردانه",
  },
];

export type DemoHeroSlide = {
  id: string;
  alt: string;
};

export const demoHeroSlides: DemoHeroSlide[] = [
  { id: "banner-1", alt: "استایل خاص برای آدم‌های خاص - مشاهده محصولات" },
  { id: "banner-2", alt: "پوشاک اصیل ایرانی - ترکیب سنت و زیبایی در استایل شما" },
];

export type DemoBenefit = {
  id: string;
  title: string;
  description: string;
};

export const demoBenefits: DemoBenefit[] = [
  { id: "support", title: "پشتیبانی ۲۴/۷", description: "همیشه در کنار شما" },
  { id: "secure-payment", title: "پرداخت امن", description: "با درگاه‌های مطمئن" },
  { id: "easy-return", title: "بازگشت آسان", description: "تا ۳۰ روز" },
  {
    id: "free-shipping",
    title: "ارسال رایگان",
    description: "برای سفارش‌های بالای ۵۰۰ هزار تومان",
  },
];
