/**
 * Demo reviews for every product in the database.
 *
 * Why fake reviewer accounts: `reviews` has a DB-enforced unique
 * (user_id, product_id), so N reviews on one product need N distinct users.
 * The accounts created here are `customer` role, have fictional names and
 * reserved-looking mobiles (+98990000xxxx), and an UNUSABLE password hash
 * (bcrypt of random bytes that are thrown away) — nobody can log in as them.
 *
 * Reviews are inserted `approved` (so they show on the storefront) and with
 * `isVerifiedPurchase = false`: no fake orders are fabricated, so the
 * «خرید تأییدشده» badge is never shown for demo content.
 *
 * Deterministic + idempotent: the same product always gets the same
 * reviewers/ratings/texts, and inserts use ON CONFLICT DO NOTHING on
 * (user_id, product_id), so re-running only fills in products that have no
 * seeded review yet (e.g. products added after the first run).
 */
import { randomBytes } from "node:crypto";
import { eq, inArray, sql } from "drizzle-orm";
import { hashPassword } from "@/domains/auth/password";
import type { Database } from "./client";
import { categories, products, reviews, users } from "./schema";

type Group = "clothing" | "shoes" | "bags" | "accessories";
const GROUP_KEYS: Group[] = ["clothing", "shoes", "bags", "accessories"];

const REVIEWER_NAMES = [
  "سارا احمدی", "علی رضایی", "مریم حسینی", "محمد کریمی", "نگار موسوی", "امیر صادقی",
  "الهام جعفری", "رضا نجفی", "فاطمه کاظمی", "حسین محمدی", "نرگس رحیمی", "پوریا اکبری",
  "ندا صالحی", "مهدی قاسمی", "زهرا بهرامی", "آرش فرهادی", "سحر مرادی", "کیان عباسی",
  "لیلا یوسفی", "بهنام شریفی", "پریسا نوری", "سامان طاهری", "مینا حیدری", "دانیال ملکی",
  "آزاده کیانی", "میلاد سلیمانی", "شیما رستمی", "یاسین زارعی", "هانیه امینی", "کامران پاکزاد",
];

export const SEED_REVIEWER_MOBILES = REVIEWER_NAMES.map((_, i) => `+98990000${String(i + 1).padStart(4, "0")}`);

type Template = { title: string; body: string };

// Positive (4-5 ★), neutral (3 ★), negative (1-2 ★) × product group.
const TEXTS: Record<Group, { good: Template[]; mid: Template[]; bad: Template[] }> = {
  clothing: {
    good: [
      { title: "کیفیت عالی", body: "پارچه‌اش خیلی خوش‌دست و باکیفیته. سایز دقیقاً مطابق جدول بود و بعد از اولین شست‌وشو هم هیچ تغییری نکرد." },
      { title: "دقیقاً مثل عکس", body: "رنگ و دوخت کاملاً مثل تصویر سایت بود. بسته‌بندی تمیز بود و زود هم رسید. حتماً دوباره خرید می‌کنم." },
      { title: "راضی‌ام", body: "برای استفاده روزمره عالیه، راحته و اندازه‌اش خوبه. قیمتش هم نسبت به کیفیت منصفانه است." },
      { title: "پیشنهاد می‌کنم", body: "دوخت مرتب و بدون نخ‌اضافه. تو چند ناست پوشیدمش و ظاهرش هنوز نو مونده. ممنون از ترندز." },
      { title: "خوش‌پوش و راحت", body: "فرم قشنگی روی تن می‌شینه و پارچه نه زیاد نازکه نه سنگین. برای فصل فعلی مناسبه." },
    ],
    mid: [
      { title: "معمولی ولی قابل قبول", body: "کیفیت متوسطه و با قیمتش هماهنگه. سایز کمی بزرگ‌تر از انتظارم بود، پیشنهاد می‌کنم یک سایز کوچک‌تر بگیرید." },
      { title: "نسبتاً خوب", body: "رنگش کمی با عکس فرق داشت ولی در کل بد نیست. پارچه قابل قبوله." },
    ],
    bad: [
      { title: "انتظار بیشتری داشتم", body: "سایز با جدول فروشگاه یکی نبود و پارچه از چیزی که فکر می‌کردم نازک‌تر بود. برای مرجوعی اقدام کردم." },
    ],
  },
  shoes: {
    good: [
      { title: "خیلی راحت", body: "از همون روز اول پام اذیت نشد. زیره‌اش نرم و سبکه و برای پیاده‌روی طولانی عالیه. سایز استاندارد بود." },
      { title: "کیفیت ساخت خوب", body: "دوخت و چسب‌کاری تمیزه و ظاهرش دقیقاً مثل عکسه. بسته‌بندی هم محکم بود." },
      { title: "ارزش خرید داره", body: "سبک و راحته و با لباس‌های مختلف ست می‌شه. بعد از چند هفته استفاده هنوز سالمه." },
      { title: "پیشنهاد می‌کنم", body: "قالب پا خوبه و لیز نمی‌خوره. رنگش هم دقیقاً همونی بود که تو سایت دیدم." },
    ],
    mid: [
      { title: "متوسط", body: "ظاهرش قشنگه ولی چند روز اول پاشنه‌اش کمی سفت بود. بعد از مدتی بهتر شد." },
      { title: "قابل قبول", body: "کیفیت نسبت به قیمت قابل قبوله. فقط کمی تنگ‌تر از سایز معمولم بود." },
    ],
    bad: [
      { title: "ناراحت‌کننده بود", body: "سایزش کوچک‌تر از عدد روی جعبه بود و پام اذیت شد. متأسفانه مجبور شدم برگردونم." },
    ],
  },
  bags: {
    good: [
      { title: "جادار و محکم", body: "فضای داخلش خیلی خوبه و زیپ‌ها روان کار می‌کنن. جنسش محکم به نظر میاد و برای هر روز مناسبه." },
      { title: "طراحی قشنگ", body: "دقیقاً همون چیزی بود که می‌خواستم. دوخت مرتب و بند راحت روی شانه می‌شینه." },
      { title: "راضی هستم", body: "سبکه ولی جا زیاد داره. رنگش مثل عکس بود و بسته‌بندی هم مرتب رسید." },
    ],
    mid: [
      { title: "نسبتاً خوب", body: "ظاهرش قشنگه ولی کمی کوچک‌تر از چیزی که از عکس فهمیدم بود. برای وسایل کم مناسبه." },
    ],
    bad: [
      { title: "کیفیت زیپ ضعیف بود", body: "بعد از دو هفته زیپش گیر کرد. ظاهرش خوبه ولی انتظار دوام بیشتری داشتم." },
    ],
  },
  accessories: {
    good: [
      { title: "ظریف و باکیفیت", body: "جنسش خوبه و ظاهرش دقیقاً مثل عکسه. بسته‌بندی مناسب و ارسال سریع بود." },
      { title: "ست‌شدنی با همه‌چیز", body: "ساده و شیکه و به لباس‌های مختلف می‌خوره. برای هدیه هم گزینه خوبیه." },
      { title: "ارزش خرید داره", body: "نسبت به قیمت کیفیت خوبی داره. تا الان رنگش تغییر نکرده و راضی‌ام." },
    ],
    mid: [
      { title: "معمولی", body: "بد نیست ولی انتظار داشتم کمی باکیفیت‌تر باشه. در حد قیمتش هست." },
    ],
    bad: [
      { title: "به‌اندازه انتظار نبود", body: "رنگش با عکس کمی فرق داشت و حس می‌کنم جنسش ضعیف‌تر از چیزی بود که تصور می‌کردم." },
    ],
  },
};

function hashString(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Small deterministic PRNG so re-runs generate identical data. */
function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pickRating(rand: () => number): number {
  const r = rand();
  if (r < 0.5) return 5;
  if (r < 0.78) return 4;
  if (r < 0.9) return 3;
  if (r < 0.96) return 2;
  return 1;
}

export type SeedReviewsResult = { reviewers: number; products: number; reviewsInserted: number; reviewsSkipped: number };

export async function seedReviews(db: Database, options: { reset?: boolean } = {}): Promise<SeedReviewsResult> {
  return db.transaction(async (tx) => {
    // 1) Reviewer accounts (idempotent on the unique mobile).
    const unusableHash = await hashPassword(randomBytes(32).toString("hex"));
    await tx
      .insert(users)
      .values(
        REVIEWER_NAMES.map((fullName, i) => ({
          mobile: SEED_REVIEWER_MOBILES[i]!,
          fullName,
          passwordHash: unusableHash,
          role: "customer" as const,
        })),
      )
      .onConflictDoNothing({ target: users.mobile });
    const reviewerRows = await tx
      .select({ id: users.id, mobile: users.mobile })
      .from(users)
      .where(inArray(users.mobile, SEED_REVIEWER_MOBILES));
    const reviewerIdByMobile = new Map(reviewerRows.map((r) => [r.mobile, r.id]));
    const reviewerIds = SEED_REVIEWER_MOBILES.map((m) => reviewerIdByMobile.get(m)!);

    if (options.reset) {
      await tx.delete(reviews).where(inArray(reviews.userId, reviewerIds));
    }

    // 2) Product → group (clothing/shoes/bags/accessories) via category chain.
    const categoryRows = await tx.select({ id: categories.id, slug: categories.slug, parentId: categories.parentId }).from(categories);
    const categoryById = new Map(categoryRows.map((c) => [c.id, c]));
    const groupOfCategory = (categoryId: string | null): Group => {
      const chain: typeof categoryRows = [];
      for (let c = categoryId ? categoryById.get(categoryId) : undefined; c && chain.length < 6; c = c.parentId ? categoryById.get(c.parentId) : undefined) {
        chain.unshift(c);
      }
      const groupRow = chain[1] ?? chain[0];
      return GROUP_KEYS.find((k) => groupRow && (groupRow.slug.endsWith(`-${k}`) || groupRow.slug === k)) ?? "accessories";
    };

    const productRows = await tx
      .select({ id: products.id, slug: products.slug, categoryId: products.categoryId, createdAt: products.createdAt })
      .from(products)
      .orderBy(products.slug);

    // 3) Reviews.
    const now = Date.now();
    const DAY = 86_400_000;
    const values: (typeof reviews.$inferInsert)[] = [];
    for (const product of productRows) {
      const rand = mulberry32(hashString(product.slug));
      const group = groupOfCategory(product.categoryId);
      const texts = TEXTS[group];
      const count = 3 + Math.floor(rand() * 5); // 3..7
      // Distinct reviewers: a deterministic shuffle prefix.
      const order = reviewerIds.map((id) => ({ id, k: rand() })).sort((a, b) => a.k - b.k).slice(0, count);
      const earliest = Math.max(product.createdAt.getTime(), now - 120 * DAY);
      const usedBodies = new Set<string>();

      for (const reviewer of order) {
        const rating = pickRating(rand);
        const pool = rating >= 4 ? texts.good : rating === 3 ? texts.mid : texts.bad;
        let template = pool[Math.floor(rand() * pool.length)]!;
        // Avoid the same text twice on one product when the pool allows.
        for (let tries = 0; usedBodies.has(template.body) && tries < pool.length; tries++) {
          template = pool[(pool.indexOf(template) + 1) % pool.length]!;
        }
        usedBodies.add(template.body);
        const createdAt = new Date(earliest + rand() * Math.max(now - earliest - DAY, 0));
        values.push({
          productId: product.id,
          userId: reviewer.id,
          rating,
          title: template.title,
          body: template.body,
          status: "approved",
          isVerifiedPurchase: false,
          moderatedAt: createdAt,
          moderationNote: "demo seed",
          createdAt,
          updatedAt: createdAt,
        });
      }
    }

    let inserted = 0;
    for (let i = 0; i < values.length; i += 500) {
      const res = await tx
        .insert(reviews)
        .values(values.slice(i, i + 500))
        .onConflictDoNothing({ target: [reviews.userId, reviews.productId] })
        .returning({ id: reviews.id });
      inserted += res.length;
    }

    return { reviewers: reviewerIds.length, products: productRows.length, reviewsInserted: inserted, reviewsSkipped: values.length - inserted };
  });
}
