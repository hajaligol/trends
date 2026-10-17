import { z } from "zod";
import { INFINITE_SCROLL_MAX_PAGE } from "@/domains/catalog/presentation";

/**
 * Which list an infinite-scroll grid is continuing. Validated on the server
 * (it arrives from the browser); a client-safe module so the client
 * component can import the type without touching the DB.
 */
const sort = z.enum(["newest", "price-asc", "price-desc"]).optional();

export const loadMoreSourceSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("category"),
    slug: z.string().min(1).max(200),
    sort,
    size: z.string().max(100).optional(),
    color: z.string().max(100).optional(),
  }),
  z.object({ kind: z.literal("search"), q: z.string().trim().min(1).max(200), sort }),
  z.object({ kind: z.literal("collection"), slug: z.enum(["featured", "top-selling", "new-arrivals"]) }),
  z.object({ kind: z.literal("campaign"), slug: z.string().min(1).max(200) }),
]);

export type LoadMoreSource = z.infer<typeof loadMoreSourceSchema>;

export const loadMoreInputSchema = z.object({
  source: loadMoreSourceSchema,
  // Page 1 is rendered by the server; infinite scroll only ever asks for 2..5.
  page: z.number().int().min(2).max(INFINITE_SCROLL_MAX_PAGE),
});
