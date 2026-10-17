import { formatToman } from "@/lib/utils/money";
import { toPersianDigits } from "@/lib/utils/persian-digits";
import type { CampaignKind } from "@/lib/db/schema/campaigns";
import type { CampaignDefinition } from "./config";

/** Admin-facing metadata for each kind: name, one-line explanation, example. */
export const KIND_META: Record<
  CampaignKind,
  { title: string; description: string; example: string; group: "price" | "cart" | "shipping" }
> = {
  percent_off: {
    title: "تخفیف درصدی",
    description: "قیمت هر کالای مشمول به درصد مشخصی کم می‌شود.",
    example: "همه کفش‌ها ۲۰٪ تخفیف",
    group: "price",
  },
  amount_off: {
    title: "تخفیف مبلغ ثابت",
    description: "از قیمت هر عدد کالای مشمول، مبلغ ثابتی کم می‌شود.",
    example: "۵۰٬۰۰۰ تومان تخفیف روی هر کالا",
    group: "price",
  },
  fixed_price: {
    title: "قیمت ثابت",
    description: "کالاهای مشمول با یک قیمت یکسان فروخته می‌شوند (فقط اگر ارزان‌تر از قیمت فعلی باشد).",
    example: "همه تی‌شرت‌ها ۱۹۹٬۰۰۰ تومان",
    group: "price",
  },
  buy_x_get_y_free: {
    title: "بخر، رایگان بگیر",
    description: "با خرید چند عدد، تعدادی از ارزان‌ترین‌ها رایگان می‌شود.",
    example: "۲ بخر، ۱ رایگان بگیر",
    group: "cart",
  },
  buy_x_get_y_percent: {
    title: "بخر، با تخفیف بگیر",
    description: "با خرید چند عدد، تعدادی از ارزان‌ترین‌ها با درصد تخفیف حساب می‌شود.",
    example: "۱ بخر، دومی ۵۰٪ تخفیف",
    group: "cart",
  },
  bundle_price: {
    title: "بسته با قیمت ثابت",
    description: "هر چند کالای مشمول با هم به یک قیمت ثابت فروخته می‌شوند.",
    example: "هر ۳ تی‌شرت ۵۰۰٬۰۰۰ تومان",
    group: "cart",
  },
  tiered_discount: {
    title: "تخفیف پلکانی",
    description: "هرچه تعداد یا مبلغ خرید بیشتر باشد، درصد تخفیف بالاتر می‌رود.",
    example: "۲ عدد ۱۰٪ · ۳ عدد ۱۵٪ · ۴ عدد به بالا ۲۰٪",
    group: "cart",
  },
  basket_discount: {
    title: "تخفیف سبد خرید",
    description: "با رسیدن مبلغ خرید به یک حد، تخفیف به کل سبد (کالاهای مشمول) اعمال می‌شود.",
    example: "خرید بالای ۲٬۰۰۰٬۰۰۰ تومان، ۱۰٪ تخفیف",
    group: "cart",
  },
  free_shipping: {
    title: "ارسال رایگان",
    description: "هزینه ارسال برای سفارش‌هایی که شرایط را دارند رایگان می‌شود.",
    example: "ارسال رایگان برای خرید بالای ۱٬۰۰۰٬۰۰۰ تومان",
    group: "shipping",
  },
};

const n = (value: number) => toPersianDigits(value);

/** One short Persian sentence describing the offer. Used on storefront
 * badges, the admin list and the live summary in the form. */
export function describeDefinition(def: CampaignDefinition): string {
  switch (def.kind) {
    case "percent_off": {
      const cap = def.config.maxDiscountToman ? ` (حداکثر ${formatToman(def.config.maxDiscountToman)} برای هر کالا)` : "";
      return `${n(def.config.percent)}٪ تخفیف${cap}`;
    }
    case "amount_off":
      return `${formatToman(def.config.amountToman)} تخفیف روی هر کالا`;
    case "fixed_price":
      return `قیمت ویژه ${formatToman(def.config.priceToman)}`;
    case "buy_x_get_y_free":
      return `${n(def.config.buyQty)} بخر، ${n(def.config.getQty)} رایگان بگیر`;
    case "buy_x_get_y_percent":
      return `${n(def.config.buyQty)} بخر، ${n(def.config.getQty)} عدد با ${n(def.config.percent)}٪ تخفیف`;
    case "bundle_price":
      return `هر ${n(def.config.qty)} کالا ${formatToman(def.config.priceToman)}`;
    case "tiered_discount": {
      const unit = def.config.basis === "quantity" ? "عدد" : "تومان";
      return def.config.tiers
        .map((tier) => `${def.config.basis === "quantity" ? n(tier.min) : formatToman(tier.min).replace(" تومان", "")} ${unit} ← ${n(tier.percent)}٪`)
        .join(" · ");
    }
    case "basket_discount": {
      const amount = def.config.type === "percent" ? `${n(def.config.value)}٪ تخفیف` : `${formatToman(def.config.value)} تخفیف`;
      return def.config.minSpendToman > 0 ? `خرید بالای ${formatToman(def.config.minSpendToman)}، ${amount}` : amount;
    }
    case "free_shipping":
      return def.config.minSpendToman > 0
        ? `ارسال رایگان برای خرید بالای ${formatToman(def.config.minSpendToman)}`
        : "ارسال رایگان";
  }
}
