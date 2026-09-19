import Image from "next/image";
import Link from "next/link";
import { AssetSlot } from "@/components/ui/AssetSlot";
import { Container } from "@/components/ui/Container";
import type { HomeCategoryTile } from "@/domains/content/home-category-tiles";

/**
 * Homepage category row: six squares in one line (لباس مردانه، لباس زنانه،
 * کفش مردانه، کفش زنانه، اکسسوری، محصولات بچگانه). Each square shows the
 * picture an admin picked at `/admin/content`, or a gray placeholder until
 * then. From `md` up they share the row equally; on smaller screens the row
 * scrolls sideways instead of squeezing six tiny squares onto a phone.
 */
export function CategoryTiles({ tiles }: { tiles: HomeCategoryTile[] }) {
  return (
    <section id="categories" aria-label="دسته‌بندی‌ها" className="py-[clamp(34px,5vw,54px)]">
      <Container>
        <ul className="flex gap-3.5 overflow-x-auto pb-1.5 [scrollbar-width:none] md:grid md:grid-cols-6 md:gap-[clamp(14px,2vw,28px)] md:overflow-visible [&::-webkit-scrollbar]:hidden">
          {tiles.map((tile) => (
            <li key={tile.key} className="w-[128px] shrink-0 md:w-auto">
              <Link href={tile.href} className="group flex flex-col gap-3 text-center">
                <span className="relative block aspect-square overflow-hidden rounded-[20px] bg-card-image transition-transform duration-200 group-hover:-translate-y-[3px]">
                  {tile.imageUrl ? (
                    <Image
                      src={tile.imageUrl}
                      alt={tile.label}
                      fill
                      sizes="(min-width: 768px) 16vw, 128px"
                      className="object-cover"
                    />
                  ) : (
                    <AssetSlot label={tile.label} tone="banner" rounded="none" className="h-full w-full" />
                  )}
                </span>
                <span className="text-[0.95rem] font-semibold text-ink">{tile.label}</span>
              </Link>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}
