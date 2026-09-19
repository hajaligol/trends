import { Container } from "@/components/ui/Container";
import { ProductCard } from "@/components/catalog/ProductCard";
import { FlameIcon } from "@/components/ui/icons";
import type { CatalogProductSummary } from "@/domains/catalog/queries";

/**
 * Mirrors #featured .product-grid in the prototype: 5 columns desktop,
 * 3 from ~640px, 2 below that. Real catalog data since Phase 4 — see
 * `getFeaturedProducts` in `@/domains/catalog/queries`.
 *
 * Styled as the homepage's "hero" product section on purpose: a branded
 * lavender stage with a glowing flame badge, and each product lifted onto
 * its own white tile. `ProductCard` itself is untouched (it is shared with
 * category listings) — the tile is a wrapper around it here.
 */
export function FeaturedProducts({ products }: { products: CatalogProductSummary[] }) {
  return (
    <section id="featured" className="py-[clamp(30px,5vw,54px)]">
      <Container>
        <div className="relative isolate overflow-hidden rounded-[clamp(20px,3vw,32px)] border border-brand/15 bg-gradient-to-br from-[#f7f0fc] via-[#ede1f7] to-[#e2d4ec] px-[clamp(14px,3vw,40px)] pb-[clamp(18px,3vw,40px)] pt-[clamp(22px,3.4vw,42px)] shadow-[0_30px_70px_-32px_rgba(91,15,165,0.5)]">
          {/* Decorative layers — purely visual, behind the content. */}
          <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-1.5 bg-gradient-to-r from-brand via-[#b56ee6] to-brand" />
          <div aria-hidden="true" className="pointer-events-none absolute -top-28 -end-20 -z-10 h-80 w-80 rounded-full bg-brand/20 blur-3xl" />
          <div aria-hidden="true" className="pointer-events-none absolute -bottom-32 -start-24 -z-10 h-96 w-96 rounded-full bg-[#c79ae8]/45 blur-3xl" />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 -z-10 opacity-70"
            style={{
              backgroundImage: "radial-gradient(rgba(91,15,165,0.13) 1px, transparent 1px)",
              backgroundSize: "18px 18px",
              maskImage: "linear-gradient(to bottom, black, transparent 70%)",
              WebkitMaskImage: "linear-gradient(to bottom, black, transparent 70%)",
            }}
          />

          <div className="mb-[clamp(20px,3vw,34px)] flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3.5 sm:gap-4">
              <span
                aria-hidden="true"
                className="flame-badge-pulse flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white ring-1 ring-brand/15 sm:h-16 sm:w-16"
              >
                <FlameIcon className="flame-flicker h-9 w-9 text-brand sm:h-10 sm:w-10" strokeWidth={2} />
              </span>
              <h2 className="m-0 bg-gradient-to-l from-brand-dark to-[#9a3ddb] bg-clip-text text-[clamp(1.7rem,3.4vw,2.5rem)] font-extrabold leading-[1.3] text-transparent">
                شگفت‌انگیزها
              </h2>
            </div>
            <a
              href="#featured"
              className="flex items-center gap-1.5 whitespace-nowrap rounded-full bg-brand px-5 py-2 text-[0.9rem] font-semibold text-white shadow-lg shadow-brand/30 transition-colors duration-200 hover:bg-brand-dark"
            >
              مشاهده همه{" "}
              <span aria-hidden="true">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="h-[18px] w-[18px]"><path d="m15 18-6-6 6-6" /></svg>
              </span>
            </a>
          </div>

          <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 sm:gap-5 lg:grid-cols-5">
            {products.map((product) => (
              <div
                key={product.id}
                className="rounded-[24px] bg-white/85 p-2.5 shadow-[0_2px_14px_-6px_rgba(24,38,48,0.18)] ring-1 ring-white transition duration-300 hover:-translate-y-1.5 hover:shadow-[0_22px_40px_-16px_rgba(91,15,165,0.5)] motion-reduce:hover:translate-y-0"
              >
                <ProductCard product={product} />
              </div>
            ))}
          </div>
        </div>
      </Container>
    </section>
  );
}
