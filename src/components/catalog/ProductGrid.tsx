import { ProductCard } from "@/components/catalog/ProductCard";
import type { CatalogProductSummary } from "@/domains/catalog/queries";
import { PRODUCT_GRID_CLASS } from "@/domains/catalog/presentation";

export function ProductGrid({
  products,
  emptyMessage = "محصولی با این مشخصات پیدا نشد.",
}: {
  products: CatalogProductSummary[];
  emptyMessage?: string;
}) {
  if (products.length === 0) {
    return (
      <p className="rounded-[14px] bg-card-image px-6 py-16 text-center text-[0.95rem] text-text-secondary">
        {emptyMessage}
      </p>
    );
  }

  return (
    <div className={PRODUCT_GRID_CLASS}>
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}
