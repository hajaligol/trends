import { AssetSlot } from "@/components/ui/AssetSlot";
import { Container } from "@/components/ui/Container";
import type { CategorySwatch, DemoCategory } from "@/domains/catalog/demo-data";

// Mirrors the pastel circle backgrounds in .category-nav in the prototype.
const SWATCH_BG: Record<CategorySwatch, string> = {
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
 * evenly spaced with larger circles on desktop. Categories aren't real
 * routes yet (Phase 4), so items are inert buttons for now, matching the
 * prototype exactly.
 */
export function CategoryNav({ categories }: { categories: DemoCategory[] }) {
  return (
    <section id="categories" aria-label="دسته‌بندی‌ها" className="py-[clamp(34px,5vw,54px)]">
      <Container>
        <ul className="flex flex-nowrap justify-start gap-3.5 overflow-x-auto pb-1.5 [scrollbar-width:none] sm:flex-wrap sm:justify-between sm:overflow-visible [&::-webkit-scrollbar]:hidden">
          {categories.map((category) => (
            <li key={category.id} className="flex-[0_0_92px] sm:flex-[1_1_130px]">
              <button
                type="button"
                className="group flex w-full flex-col items-center gap-3 border-0 bg-transparent p-1 text-center"
              >
                <span
                  className={`flex h-[76px] w-[76px] items-center justify-center rounded-full transition-transform duration-200 group-hover:-translate-y-[3px] sm:h-[150px] sm:w-[150px] ${SWATCH_BG[category.swatch]}`}
                >
                  <AssetSlot
                    label={category.label}
                    tone="banner"
                    rounded="full"
                    className="h-[72%] w-[72%]"
                  />
                </span>
                <span className="text-[0.95rem] font-semibold text-ink">{category.label}</span>
              </button>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}
