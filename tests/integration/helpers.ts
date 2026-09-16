import { db } from "@/lib/db/client";
import {
  categories,
  products,
  productVariants,
  users,
  coupons,
  type Category,
  type Product,
  type ProductVariant,
  type User,
  type Coupon,
} from "@/lib/db/schema";
import { hashPassword } from "@/domains/auth/password";

/**
 * Fixture helpers for the integration suite (`tests/integration/**`).
 *
 * These call the real Drizzle schema against a real PostgreSQL database
 * (`DATABASE_URL`) — the same database the app itself uses locally, per
 * `vitest.config.ts`'s header comment. Every fixture is created with a
 * `trends-test-` prefixed slug/code/mobile so it's unambiguous in a shared
 * dev database, and every test file cleans up what it created in an
 * `afterEach`/`afterAll` rather than leaving rows behind — this suite is
 * meant to be re-run repeatedly against the same database, including the
 * one a developer is also looking at in `db:studio`.
 */

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL is not set. Integration tests need a real PostgreSQL database — " +
      "run `npm run db:migrate` against a local Postgres and set DATABASE_URL in .env.local, " +
      "then use `npm run test:integration` (not `npm test`, which only runs the DB-free unit suite).",
  );
}

let counter = 0;
/** Monotonic-per-process suffix so parallel fixture creation within one
 * test file never collides on a unique slug/code/mobile, even though the
 * integration config forces a single worker across files
 * (`--pool=forks --poolOptions.forks.singleFork`) for transaction/locking
 * tests that need to run genuinely serially against shared rows. */
function uniqueSuffix(): string {
  counter += 1;
  return `${Date.now().toString(36)}${counter}`;
}

export async function createTestCategory(): Promise<Category> {
  const suffix = uniqueSuffix();
  const [row] = await db
    .insert(categories)
    .values({ slug: `trends-test-cat-${suffix}`, name: `دسته آزمایشی ${suffix}` })
    .returning();
  if (!row) throw new Error("category insert returned no row");
  return row;
}

export async function createTestProduct(categoryId: string, overrides: Partial<typeof products.$inferInsert> = {}): Promise<Product> {
  const suffix = uniqueSuffix();
  const [row] = await db
    .insert(products)
    .values({
      slug: `trends-test-product-${suffix}`,
      title: `محصول آزمایشی ${suffix}`,
      categoryId,
      ...overrides,
    })
    .returning();
  if (!row) throw new Error("product insert returned no row");
  return row;
}

export async function createTestVariant(
  productId: string,
  overrides: Partial<typeof productVariants.$inferInsert> = {},
): Promise<ProductVariant> {
  const suffix = uniqueSuffix();
  const [row] = await db
    .insert(productVariants)
    .values({
      productId,
      sku: `TEST-SKU-${suffix}`,
      size: "M",
      color: "مشکی",
      priceToman: 500_000,
      stock: 10,
      ...overrides,
    })
    .returning();
  if (!row) throw new Error("variant insert returned no row");
  return row;
}

/** Creates a full sellable product+variant in one call for tests that
 * only care about the variant (most cart/order tests). */
export async function createTestProductWithVariant(
  categoryId: string,
  variantOverrides: Partial<typeof productVariants.$inferInsert> = {},
): Promise<{ product: Product; variant: ProductVariant }> {
  const product = await createTestProduct(categoryId);
  const variant = await createTestVariant(product.id, variantOverrides);
  return { product, variant };
}

let mobileCounter = 0;
/** Generates a syntactically valid, unique Iranian mobile number for test
 * users — must match `normalizeIranianMobile`'s `9\d{9}` subscriber
 * shape. Starts high (`9999...`) to make collision with real seeded data
 * astronomically unlikely and keeps a monotonic counter to guarantee
 * uniqueness within a single test run. */
function uniqueTestMobile(): string {
  mobileCounter += 1;
  const suffix = (100000000 + mobileCounter).toString().slice(-9);
  return `+989${suffix}`;
}

export async function createTestUser(overrides: Partial<{ fullName: string; email: string | null }> = {}): Promise<User> {
  const passwordHash = await hashPassword("test-password-123");
  const [row] = await db
    .insert(users)
    .values({
      mobile: uniqueTestMobile(),
      fullName: overrides.fullName ?? "کاربر آزمایشی",
      email: overrides.email ?? null,
      passwordHash,
    })
    .returning();
  if (!row) throw new Error("user insert returned no row");
  return row;
}

export async function createTestCoupon(overrides: Partial<typeof coupons.$inferInsert> = {}): Promise<Coupon> {
  const suffix = uniqueSuffix();
  const [row] = await db
    .insert(coupons)
    .values({
      code: `TESTCODE${suffix}`.toUpperCase(),
      discountType: "percentage",
      discountValue: 10,
      ...overrides,
    })
    .returning();
  if (!row) throw new Error("coupon insert returned no row");
  return row;
}
