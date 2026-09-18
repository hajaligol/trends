import Image from "next/image";
import Link from "next/link";
import { AssetSlot } from "@/components/ui/AssetSlot";
import { Container } from "@/components/ui/Container";
import type { CatalogCategory } from "@/domains/catalog/queries";
import { swatchForCategorySlug } from "@/domains/catalog/presentation";

// Mirrors the pastel circle backgrounds in .category-nav in the prototype.
const SWATCH_BG: Record<string, string> = {
  sage: "bg-sage",
  blush: "bg-blush",
  blue: "bg-blue",
  yellow: "bg-yellow",
  lavender: "bg-lavender",
  aqua: "bg-aqua",
};

/**
 * Category circle row. Mirrors .category-nav / .category-grid in
 * reference/prototype.html: horizontally scrollable on small screens,
 * evenly spaced with larger circles on desktop. Now backed by real
 * `categories` rows and linking to real `/category/[slug]` pages
 * (Phase 4) instead of Phase 2's inert placeholder buttons.
 */
export function CategoryNav({ categories }: { categories: CatalogCategory[] }) {
  return (
    <section id="categories" aria-label="دسته‌بندی‌ها" className="py-[clamp(34px,5vw,54px)]">
      <Container>
        <ul className="flex flex-nowrap justify-start gap-3.5 overflow-x-auto pb-1.5 [scrollbar-width:none] sm:flex-wrap sm:justify-between sm:overflow-visible [&::-webkit-scrollbar]:hidden">
          {categories.map((category, index) => {
            const swatch = swatchForCategorySlug(category.slug, index);
            return (
              <li key={category.id} className="flex-[0_0_92px] sm:flex-[1_1_130px]">
                <Link
                  href={`/category/${category.slug}`}
                  className="group flex w-full flex-col items-center gap-3 p-1 text-center"
                >
                  <span
                    className={`flex h-[76px] w-[76px] items-center justify-center rounded-full transition-transform duration-200 group-hover:-translate-y-[3px] sm:h-[150px] sm:w-[150px] ${SWATCH_BG[swatch]}`}
                  >
                    {category.imageUrl ? (
                      <span className="relative block h-[72%] w-[72%] overflow-hidden rounded-full">
                        <Image
                          src={category.imageUrl}
                          alt={category.name}
                          fill
                          sizes="150px"
                          className="object-cover"
                        />
                      </span>
                    ) : (
                      <AssetSlot
                        label={category.name}
                        tone="banner"
                        rounded="full"
                        className="h-[72%] w-[72%]"
                      />
                    )}
                  </span>
                  <span className="text-[0.95rem] font-semibold text-ink">{category.name}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </Container>
    </section>
  );
}
