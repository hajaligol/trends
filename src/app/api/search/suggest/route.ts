import { NextResponse } from "next/server";
import { getCategoryTree, searchProducts } from "@/domains/catalog/queries";
import { findCategoryPath, flattenCategoryTree } from "@/domains/categories/tree";

/**
 * Live-search suggestions for the header search panel, for `?q=`:
 *  - `categories`: active categories / sub-categories whose name matches,
 *    each with its ancestor names (e.g. "مردانه › لباس") so the visitor can
 *    tell same-named types apart.
 *  - `items`: the first few matching products (same `searchProducts` query
 *    as the `/search` page, so the two always agree), each with its full
 *    category path.
 * Public, read-only, and only returns fields already visible on the
 * storefront.
 */
const MAX_PRODUCTS = 5;
const MAX_CATEGORIES = 4;
const MIN_QUERY_LENGTH = 2;
const MAX_QUERY_LENGTH = 100;

export async function GET(request: Request) {
  const q = (new URL(request.url).searchParams.get("q") ?? "").trim().slice(0, MAX_QUERY_LENGTH);

  if (q.length < MIN_QUERY_LENGTH) {
    return NextResponse.json({ query: q, total: 0, items: [], categories: [] });
  }

  try {
    const [result, tree] = await Promise.all([searchProducts({ q, page: 1 }), getCategoryTree()]);

    const needle = q.toLowerCase();
    const categories = flattenCategoryTree(tree)
      .filter((node) => node.name.toLowerCase().includes(needle))
      // Names that start with the query first; otherwise keep menu order.
      .sort((a, b) => Number(b.name.toLowerCase().startsWith(needle)) - Number(a.name.toLowerCase().startsWith(needle)))
      .slice(0, MAX_CATEGORIES)
      .map((node) => {
        const path = findCategoryPath(tree, node.slug) ?? [node];
        return {
          slug: node.slug,
          name: node.name,
          // Ancestors only (the category's own name is shown separately).
          parents: path.slice(0, -1).map((ancestor) => ancestor.name),
        };
      });

    return NextResponse.json(
      {
        query: q,
        total: result.total,
        categories,
        items: result.products.slice(0, MAX_PRODUCTS).map((product) => ({
          slug: product.slug,
          title: product.title,
          price: product.fromPriceToman,
          discountPercent: product.discountPercent,
          image: product.images[0]?.url ?? null,
          imageAlt: product.images[0]?.altText ?? product.title,
          categoryPath: (findCategoryPath(tree, product.categorySlug) ?? []).map((node) => node.name),
        })),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return NextResponse.json({ error: "search_failed" }, { status: 500 });
  }
}
