import { AssetSlot } from "@/components/ui/AssetSlot";
import { Container } from "@/components/ui/Container";
import { SectionHead } from "@/components/home/SectionHead";
import type { DemoArrival } from "@/domains/catalog/demo-data";

/**
 * Mirrors #new-arrivals .arrivals-grid in the prototype: 6 columns
 * desktop, 3 from ~640px, 2 below that.
 */
export function NewArrivals({ arrivals }: { arrivals: DemoArrival[] }) {
  return (
    <section id="new-arrivals" className="py-[clamp(30px,5vw,54px)]">
      <Container>
        <SectionHead eyebrow="تازه‌ترین‌ها" title="جدیدترین محصولات" viewAllHref="#new-arrivals" />
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {arrivals.map((arrival) => (
            <article key={arrival.id} className="flex flex-col gap-2">
              <div className="relative aspect-square overflow-hidden rounded-[14px] bg-card-image">
                <AssetSlot label={arrival.name} rounded="none" className="h-full w-full" />
              </div>
              <p className="text-[0.87rem] font-semibold">{arrival.name}</p>
              <p className="text-[0.83rem] text-text-secondary">{arrival.price}</p>
              <div className="mt-1 flex gap-1.5">
                {arrival.swatches.map((color, index) => (
                  <span
                    key={`${arrival.id}-swatch-${index}`}
                    aria-hidden="true"
                    style={{ backgroundColor: color }}
                    className="h-3 w-3 rounded-full border border-ink/15"
                  />
                ))}
              </div>
            </article>
          ))}
        </div>
      </Container>
    </section>
  );
}
