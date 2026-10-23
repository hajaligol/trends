import type { ComponentType, SVGProps } from "react";
import { SupportIcon, PaymentIcon, ReturnIcon, ShippingIcon } from "@/components/ui/icons";
import { JSXSource } from "react/jsx-dev-runtime";

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
  icon: ComponentType<SVGProps<SVGSVGElement>>;
};

export const demoBenefits: DemoBenefit[] = [
  { id: "support", title: "پشتیبانی تمام‌وقت", description: "همیشه در کنار شما", icon: SupportIcon },
  { id: "secure-payment", title: "پرداخت امن", description: "با درگاه‌های مطمئن", icon: PaymentIcon },
  { id: "easy-return", title: "بازگشت آسان", description: "تا ۳۰ روز", icon: ReturnIcon },
  {
    id: "free-shipping",
    title: "ارسال رایگان",
    description: "برای سفارش‌های بالای ۵۰۰ هزار تومان",
    icon: ShippingIcon
  },
];
