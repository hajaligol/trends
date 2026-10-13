/**
 * Adds demo reviews (approved, from fictional reviewer accounts) to every
 * product. Safe to re-run: existing seeded reviews are left alone.
 *
 *   npm run db:seed-reviews              # add missing demo reviews
 *   npm run db:seed-reviews -- --reset   # delete all demo reviews first, then re-seed
 *
 * Only reviews written by the seeded reviewer accounts are ever deleted;
 * real customers' reviews are never touched.
 */
import { count, eq } from "drizzle-orm";
import { db } from "./client";
import { reviews } from "./schema";
import { seedReviews } from "./seed-reviews-data";

async function main() {
  const reset = process.argv.includes("--reset");
  const result = await seedReviews(db, { reset });
  const [{ total } = { total: 0 }] = await db.select({ total: count() }).from(reviews).where(eq(reviews.status, "approved"));
  console.log(
    `Reviewers: ${result.reviewers}. Products covered: ${result.products}. ` +
      `Inserted ${result.reviewsInserted} reviews (${result.reviewsSkipped} already existed). Approved reviews in DB: ${total}.`,
  );
  process.exit(0);
}

main().catch((error) => {
  console.error("Review seed failed (nothing was changed):", error);
  process.exit(1);
});
