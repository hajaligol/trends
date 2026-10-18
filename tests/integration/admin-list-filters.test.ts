import { afterAll, describe, expect, it } from "vitest";
import { eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { categories, newsletterSubscribers, products, reviews, supportMessages, users } from "@/lib/db/schema";
import { listReviewsForAdmin } from "@/domains/reviews/admin-queries";
import { listSupportMessagesForAdmin } from "@/domains/support/queries";
import { countSubscribersByStatus, listSubscribersForAdmin } from "@/domains/newsletter/queries";
import { listVariantStockForAdmin } from "@/domains/catalog/admin-queries";
import { createTestCategory, createTestProduct, createTestUser, createTestVariant } from "./helpers";

/**
 * The admin list searches that run in SQL: reviews (user/product/date),
 * support messages (user/date), newsletter subscribers and the inventory
 * stock list. Every fixture is namespaced with a random token so the tests
 * assert only on their own rows even in a shared development database.
 */

const token = `t${Date.now().toString(36)}`;
const cleanup = { users: [] as string[], products: [] as string[], categories: [] as string[], support: [] as string[], subs: [] as string[] };

afterAll(async () => {
  // reviews/variants cascade from products/users.
  if (cleanup.support.length) await db.delete(supportMessages).where(inArray(supportMessages.id, cleanup.support));
  if (cleanup.subs.length) await db.delete(newsletterSubscribers).where(inArray(newsletterSubscribers.id, cleanup.subs));
  if (cleanup.products.length) await db.delete(products).where(inArray(products.id, cleanup.products));
  if (cleanup.users.length) await db.delete(users).where(inArray(users.id, cleanup.users));
  for (const id of cleanup.categories) await db.delete(categories).where(eq(categories.id, id));
});

describe("reviews: user / product / date search", () => {
  it("filters by customer name, product title and Tehran-day date range", async () => {
    const category = await createTestCategory();
    cleanup.categories.push(category.id);
    const alice = await createTestUser({ fullName: `الهه ${token}`, email: `alice-${token}@example.com` });
    const bob = await createTestUser({ fullName: `بابک ${token}` });
    cleanup.users.push(alice.id, bob.id);
    const shirt = await createTestProduct(category.id, { title: `پیراهن ${token}` });
    const coat = await createTestProduct(category.id, { title: `پالتو ${token}` });
    cleanup.products.push(shirt.id, coat.id);

    // 2026-03-10 in Tehran: 00:30 local is 21:00 UTC on the 9th — checks the day boundary.
    const tehranMorning = new Date("2026-03-09T21:00:00Z");
    const later = new Date("2026-05-01T10:00:00Z");
    await db.insert(reviews).values([
      { productId: shirt.id, userId: alice.id, rating: 5, body: `عالی ${token}`, createdAt: tehranMorning },
      { productId: coat.id, userId: alice.id, rating: 4, body: `خوب ${token}`, createdAt: later },
      { productId: shirt.id, userId: bob.id, rating: 3, body: `متوسط ${token}`, createdAt: later },
    ]);

    const byUser = await listReviewsForAdmin({ user: `الهه ${token}`, pageSize: 100 });
    expect(byUser.total).toBe(2);
    expect(byUser.rows.every((row) => row.userId === alice.id)).toBe(true);

    const byEmail = await listReviewsForAdmin({ user: `alice-${token}` });
    expect(byEmail.total).toBe(2);

    const byMobile = await listReviewsForAdmin({ user: alice.mobile.replace("+98", "0") });
    expect(byMobile.total).toBe(2);

    const byProduct = await listReviewsForAdmin({ product: `پیراهن ${token}` });
    expect(byProduct.total).toBe(2);

    const both = await listReviewsForAdmin({ user: `بابک ${token}`, product: `پیراهن ${token}` });
    expect(both.total).toBe(1);

    // The 10th (Tehran) contains only the 00:30-local review; the count query agrees with the rows.
    const onTenth = await listReviewsForAdmin({ q: token, dateRange: { from: "2026-03-10", to: "2026-03-10" } });
    expect(onTenth.total).toBe(1);
    expect(onTenth.rows[0]?.rating).toBe(5);
    const onNinth = await listReviewsForAdmin({ q: token, dateRange: { from: "2026-03-09", to: "2026-03-09" } });
    expect(onNinth.total).toBe(0);

    const fromMay = await listReviewsForAdmin({ q: token, dateRange: { from: "2026-04-01" } });
    expect(fromMay.total).toBe(2);

    // LIKE metacharacters are literal, not wildcards.
    const wildcard = await listReviewsForAdmin({ user: "%" });
    expect(wildcard.rows.every((row) => (row.authorName ?? "").includes("%") || row.authorMobile.includes("%"))).toBe(true);
  });
});

describe("support messages: user / date search", () => {
  it("matches sender fields and the linked account, and filters by date", async () => {
    const account = await createTestUser({ fullName: `مشتری ${token}` });
    cleanup.users.push(account.id);
    const rows = await db
      .insert(supportMessages)
      .values([
        { name: `میهمان ${token}`, email: `guest-${token}@example.com`, mobile: "09120000000", subject: `سوال ${token}`, message: "ارسال چند روزه است؟", createdAt: new Date("2026-02-01T10:00:00Z") },
        { name: "نام دیگر", email: `other-${token}@example.com`, subject: `شکایت ${token}`, message: "مرجوعی", userId: account.id, createdAt: new Date("2026-02-20T10:00:00Z") },
      ])
      .returning({ id: supportMessages.id });
    cleanup.support.push(...rows.map((row) => row.id));

    expect((await listSupportMessagesForAdmin({ user: `میهمان ${token}` })).total).toBe(1);
    expect((await listSupportMessagesForAdmin({ user: `guest-${token}` })).total).toBe(1);
    // Only reachable through the account link (the typed name is different).
    expect((await listSupportMessagesForAdmin({ user: `مشتری ${token}` })).total).toBe(1);
    expect((await listSupportMessagesForAdmin({ user: "09120000000" })).total).toBeGreaterThanOrEqual(1);
    expect((await listSupportMessagesForAdmin({ q: `شکایت ${token}` })).total).toBe(1);

    const february = await listSupportMessagesForAdmin({ q: token, dateRange: { from: "2026-02-10", to: "2026-02-28" } });
    expect(february.total).toBe(1);
    expect(february.rows[0]?.userId).toBe(account.id);
    expect((await listSupportMessagesForAdmin({ q: token, dateRange: { to: "2026-02-10" } })).total).toBe(1);
    // Rows come back as plain messages (no join wrapper leaking through).
    expect(february.rows[0]?.subject).toBe(`شکایت ${token}`);
  });
});

describe("newsletter subscribers", () => {
  it("searches e-mail, filters status and date, and counts per status", async () => {
    const inserted = await db
      .insert(newsletterSubscribers)
      .values([
        { email: `a-${token}@example.com`, isActive: true, createdAt: new Date("2026-01-05T10:00:00Z") },
        { email: `b-${token}@example.com`, isActive: false, createdAt: new Date("2026-01-20T10:00:00Z") },
        { email: `c-${token}@other.org`, isActive: true, createdAt: new Date("2026-02-15T10:00:00Z") },
      ])
      .returning({ id: newsletterSubscribers.id });
    cleanup.subs.push(...inserted.map((row) => row.id));

    expect((await listSubscribersForAdmin({ q: token })).total).toBe(3);
    expect((await listSubscribersForAdmin({ q: `${token}@example` })).total).toBe(2);
    expect((await listSubscribersForAdmin({ q: token, status: "inactive" })).total).toBe(1);
    expect((await listSubscribersForAdmin({ q: token, dateRange: { from: "2026-02-01" } })).total).toBe(1);
    expect(await countSubscribersByStatus({ q: token })).toEqual({ active: 2, inactive: 1 });
  });
});

describe("inventory: variant stock search", () => {
  it("filters by stock state, text (title/SKU/color/size) and category", async () => {
    const category = await createTestCategory();
    cleanup.categories.push(category.id);
    const product = await createTestProduct(category.id, { title: `کت ${token}` });
    cleanup.products.push(product.id);
    await createTestVariant(product.id, { sku: `SKU-OUT-${token}`, size: "S", color: "سرمه‌ای", stock: 0 });
    await createTestVariant(product.id, { sku: `SKU-LOW-${token}`, size: "M", color: "سرمه‌ای", stock: 3, lowStockThreshold: 5 });
    await createTestVariant(product.id, { sku: `SKU-IN-${token}`, size: "L", color: "کرم", stock: 40, lowStockThreshold: 5 });
    await createTestVariant(product.id, { sku: `SKU-OFF-${token}`, size: "XL", color: "کرم", stock: 0, isActive: false });

    const all = await listVariantStockForAdmin({ categoryId: category.id });
    expect(all.total).toBe(3); // inactive variant excluded
    expect(all.counts).toEqual({ all: 3, out: 1, low: 1, in: 1 });
    // Lowest stock first.
    expect(all.rows.map((row) => row.stock)).toEqual([0, 3, 40]);

    expect((await listVariantStockForAdmin({ categoryId: category.id, stock: "out" })).rows.map((row) => row.sku)).toEqual([`SKU-OUT-${token}`]);
    expect((await listVariantStockForAdmin({ categoryId: category.id, stock: "low" })).total).toBe(1);

    const bySku = await listVariantStockForAdmin({ q: `sku-low-${token}` });
    expect(bySku.rows.map((row) => row.stock)).toEqual([3]);
    expect((await listVariantStockForAdmin({ q: `کت ${token}` })).total).toBe(3);
    // Tab counts ignore the stock filter but honour the text filter.
    const withState = await listVariantStockForAdmin({ q: `کت ${token}`, stock: "in" });
    expect(withState.total).toBe(1);
    expect(withState.counts.all).toBe(3);
    expect((await listVariantStockForAdmin({ q: `کرم`, categoryId: category.id })).total).toBe(1);
    expect((await listVariantStockForAdmin({ q: String(product.productCode) })).total).toBe(3);
    expect((await listVariantStockForAdmin({ categoryId: "00000000-0000-0000-0000-000000000000" })).total).toBe(0);
  });
});
