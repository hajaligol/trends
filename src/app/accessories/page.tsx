import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { Breadcrumbs } from "@/components/catalog/Breadcrumbs";
import { ProductGrid } from "@/components/catalog/ProductGrid";
import { getProductsByCategorySlug } from "@/domains/catalog/queries";

export const metadata: Metadata = {
  title: "اکسسوری",
  description: "اکسسوری مردانه و زنانه در ترندز",
  alternates: { canonical: "/accessories" },
  openGraph: { url: "/accessories" },
};

const PREVIEW_COUNT = 8;

/**
 * Landing page for the homepage's "اکسسوری" square: men's and women's
 * accessories side by side. There is no single category for both (the
 * taxonomy is audience > group > type), so this page shows a preview of
 * each and links to the full category pages.
 */
export default async function AccessoriesPage() {
  const [men, women] = await Promise.all([
    getProductsByCategorySlug({ slug: "men-accessories" }),
    getProductsByCategorySlug({ slug: "women-accessories" }),
  ]);

  const sections = [
    { title: "اکسسوری مردانه", slug: "men-accessories", result: men },
    { title: "اکسسوری زنانه", slug: "women-accessories", result: women },
  ];

  return (
    <main className="py-[clamp(24px,4vw,40px)]">
      <Container>
        <Breadcrumbs items={[{ label: "صفحه اصلی", href: "/" }, { label: "اکسسوری" }]} />
        <h1 className="mb-8 mt-0 text-[clamp(1.5rem,3vw,2.1rem)] font-bold">اکسسوری</h1>

        <div className="flex flex-col gap-12">
          {sections.map(({ title, slug, result }) => (
            <section key={slug} aria-label={title}>
              <div className="mb-4 flex items-center justify-between gap-4">
                <h2 className="m-0 text-[1.25rem] font-bold">{title}</h2>
                <Link
                  href={`/category/${slug}`}
                  className="whitespace-nowrap rounded-full bg-brand px-5 py-2 text-[0.9rem] font-semibold text-white transition-colors duration-200 hover:bg-brand-dark"
                >
                  مشاهده همه
                </Link>
              </div>
              <ProductGrid
                products={(result?.products ?? []).slice(0, PREVIEW_COUNT)}
                emptyMessage="هنوز محصولی در این دسته ثبت نشده است."
              />
            </section>
          ))}
        </div>
      </Container>
    </main>
  );
}
