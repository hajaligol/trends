/**
 * Adds demo T-Mag content (categories + three articles with a table, key
 * takeaways and FAQ). Safe to re-run: rows are matched by slug and skipped
 * when they already exist, so edited articles are never overwritten.
 *
 *   npm run db:seed-tmag
 */
import { inArray } from "drizzle-orm";
import { db } from "./client";
import { blogCategories, blogPosts } from "./schema";

const CATEGORIES = [
  { slug: "size-guide", name: "راهنمای سایز", description: "چطور سایز درست لباس و کفش را انتخاب کنیم؟", displayOrder: 1 },
  { slug: "styling", name: "ست و استایل", description: "ایده‌های ست لباس برای موقعیت‌ها و فصل‌های مختلف.", displayOrder: 2 },
  { slug: "care", name: "نگهداری از پوشاک", description: "شست‌وشو و نگهداری درست لباس برای ماندگاری بیشتر.", displayOrder: 3 },
];

const daysAgo = (n: number) => new Date(Date.now() - n * 24 * 60 * 60 * 1000);

const POSTS = [
  {
    slug: "راهنمای-انتخاب-سایز-لباس",
    category: "size-guide",
    title: "راهنمای انتخاب سایز لباس؛ چطور بدون پرو، سایز درست را بخریم؟",
    excerpt: "برای انتخاب سایز درست، سه اندازه‌ی دور سینه، دور کمر و قد را با جدول سایز مقایسه کنید؛ اگر بین دو سایز ماندید، برای لباس گشاد و روزمره سایز بزرگ‌تر را بردارید.",
    tags: ["سایز لباس", "جدول سایز", "خرید آنلاین"],
    keyTakeaways: ["سه اندازه‌ی اصلی: دور سینه، دور کمر و قد", "همیشه با جدول سایز همان برند مقایسه کنید", "بین دو سایز؟ برای استایل گشاد سایز بزرگ‌تر، برای فیت بدنی سایز کوچک‌تر", "در صورت نیاز، شرایط بازگشت کالا را پیش از خرید ببینید"],
    faq: [
      { question: "اگر بین دو سایز بودم کدام را بخرم؟", answer: "برای لباس روزمره و گشاد، سایز بزرگ‌تر؛ برای لباس فیت و رسمی، سایز کوچک‌تر یا اندازه‌گیری دقیق‌تر پیشنهاد می‌شود." },
      { question: "جدول سایز همه‌ی برندها یکی است؟", answer: "خیر. هر برند قالب‌های خودش را دارد؛ همیشه جدول سایز همان محصول را ملاک قرار دهید." },
    ],
    daysAgo: 12,
    content: `## چرا انتخاب سایز مهم است؟

سایز نادرست، شایع‌ترین دلیل مرجوع شدن لباس در خرید اینترنتی است. با چند اندازه‌گیری ساده می‌توانید این خطا را تقریباً حذف کنید.

## سه اندازه‌ی ضروری

با متر خیاطی و روی لباس نازک اندازه بگیرید:

1. **دور سینه:** از برجسته‌ترین قسمت سینه، متر را موازی زمین بگیرید.
2. **دور کمر:** از باریک‌ترین قسمت تنه.
3. **قد:** بدون کفش و صاف کنار دیوار.

## نمونه جدول سایز (تی‌شرت و پیراهن)

| سایز | دور سینه (سانتی‌متر) | قد پیشنهادی (سانتی‌متر) |
| --- | --- | --- |
| S | ۹۰ تا ۹۶ | ۱۶۰ تا ۱۷۰ |
| M | ۹۶ تا ۱۰۲ | ۱۷۰ تا ۱۷۷ |
| L | ۱۰۲ تا ۱۰۸ | ۱۷۷ تا ۱۸۴ |
| XL | ۱۰۸ تا ۱۱۴ | ۱۸۴ تا ۱۹۰ |

> این جدول فقط نمونه‌ی آموزشی است؛ برای خرید، جدول سایز صفحه‌ی همان محصول را ببینید.

### اگر بین دو سایز بودید

استایل مورد نظرتان را مشخص کنید: لباس گشاد و راحت یا فیت. سپس همان‌طور که در [دسته‌بندی مردانه](/category/men) و [زنانه](/category/women) می‌بینید، محصول را با سایزهای موجود مقایسه کنید.`,
  },
  {
    slug: "ایده-ست-لباس-پاییزی",
    category: "styling",
    title: "ایده‌های ست لباس پاییزی؛ پنج ترکیب ساده و شیک",
    excerpt: "لایه‌بندی، رنگ‌های خاکی و یک کت مناسب، پایه‌ی هر ست پاییزی است؛ در این مقاله پنج ترکیب کاربردی برای کار، دانشگاه و دورهمی را می‌بینید.",
    tags: ["ست لباس", "استایل پاییز", "لایه‌بندی"],
    keyTakeaways: ["لایه‌بندی، کلید لباس پوشیدن در پاییز است", "رنگ‌های خاکی با هم ست می‌شوند", "یک کت یا بلیزر، ست ساده را رسمی می‌کند"],
    faq: [{ question: "پاییز چه رنگ‌هایی بپوشیم؟", answer: "قهوه‌ای، کرم، سبز زیتونی و سرمه‌ای انتخاب‌های امن و قابل ترکیب با هم هستند." }],
    daysAgo: 6,
    content: `## پایه‌ی هر ست پاییزی

قانون ساده این است: یک لایه‌ی نازک زیر، یک بافت یا هودی وسط و یک کت یا پالتو روی همه.

## پنج ترکیب پیشنهادی

### ۱. روزمره و راحت
هودی، شلوار جین و کتانی مینیمال.

### ۲. محیط کار
پیراهن کلاسیک، شلوار پارچه‌ای و کت. محصولات [پیراهن کلاسیک](/search?q=پیراهن) را ببینید.

### ۳. دورهمی
بافت، شلوار مشکی و بوت.

## جدول رنگ‌ها

| رنگ پایه | رنگ‌های هماهنگ |
| --- | --- |
| سرمه‌ای | کرم، سفید، خاکستری |
| قهوه‌ای | کرم، سبز زیتونی |
| مشکی | هر رنگی |`,
  },
  {
    slug: "نگهداری-از-لباس-پشمی",
    category: "care",
    title: "نگهداری از لباس پشمی؛ شست‌وشو بدون آب رفتن",
    excerpt: "لباس پشمی را با آب سرد و شوینده‌ی ملایم دستی بشویید و افقی خشک کنید تا آب نرود و فرم خود را حفظ کند.",
    tags: ["لباس پشمی", "شست‌وشو", "نگهداری لباس"],
    keyTakeaways: ["آب سرد و شوینده‌ی ملایم", "هرگز نچلانید؛ فقط فشار دهید", "افقی و دور از آفتاب خشک کنید"],
    faq: [],
    daysAgo: 2,
    content: `## قدم‌به‌قدم

1. لباس را داخل آب سرد با کمی شوینده‌ی ملایم ۱۰ دقیقه بخیسانید.
2. آرام فشار دهید، نچلانید.
3. روی حوله‌ی تمیز پهن کنید و رول کنید تا آب اضافه گرفته شود.
4. افقی خشک کنید.

## چه کاری نکنیم؟

- از ماشین لباسشویی با دور تند استفاده نکنید.
- لباس را آویزان نکنید؛ فرم شانه خراب می‌شود.`,
  },
];

async function main() {
  const existingCats = await db.select({ slug: blogCategories.slug }).from(blogCategories).where(inArray(blogCategories.slug, CATEGORIES.map((c) => c.slug)));
  const have = new Set(existingCats.map((c) => c.slug));
  const toInsert = CATEGORIES.filter((c) => !have.has(c.slug));
  if (toInsert.length > 0) await db.insert(blogCategories).values(toInsert);

  const cats = await db.select().from(blogCategories);
  const idBySlug = new Map(cats.map((c) => [c.slug, c.id]));

  const existingPosts = await db.select({ slug: blogPosts.slug }).from(blogPosts).where(inArray(blogPosts.slug, POSTS.map((p) => p.slug)));
  const havePosts = new Set(existingPosts.map((p) => p.slug));
  let inserted = 0;
  for (const post of POSTS) {
    if (havePosts.has(post.slug)) continue;
    const { category, daysAgo: age, ...fields } = post;
    await db.insert(blogPosts).values({ ...fields, categoryId: idBySlug.get(category) ?? null, status: "published", publishedAt: daysAgo(age) });
    inserted += 1;
  }
  console.log(`T-Mag: ${toInsert.length} categories and ${inserted} articles added (${POSTS.length - inserted} already existed).`);
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
