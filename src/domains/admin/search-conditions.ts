import { ilike, or, sql, type SQL } from "drizzle-orm";
import { products, users } from "@/lib/db/schema";
import { containsPattern, mobileSearchDigits } from "@/lib/utils/admin-filters";

/**
 * Reusable WHERE fragments for the admin list searches. Every pattern goes
 * through `containsPattern` (LIKE metacharacters escaped) and is passed as a
 * bound parameter by Drizzle — user text is never concatenated into SQL.
 * Callers pass text already run through `normalizeSearchText`.
 */

/** Matches a customer by name, e-mail or mobile (`0912…`, `912…`, `+98912…`). */
export function userSearchCondition(q: string): SQL {
  const clauses: SQL[] = [ilike(users.fullName, containsPattern(q)), ilike(users.email, containsPattern(q))];
  const digits = mobileSearchDigits(q);
  if (digits) clauses.push(ilike(users.mobile, containsPattern(digits)));
  return or(...clauses)!;
}

/** Matches a product by title, slug or its numeric product code. */
export function productSearchCondition(q: string): SQL {
  const clauses: SQL[] = [ilike(products.title, containsPattern(q)), ilike(products.slug, containsPattern(q))];
  if (/^\d{1,9}$/.test(q)) clauses.push(sql`${products.productCode} = ${Number(q)}`);
  return or(...clauses)!;
}
