import { Container } from "@/components/ui/Container";
import type { DemoBenefit } from "@/domains/catalog/demo-data";

/**
 * Mirrors .benefits-strip in the prototype: 4 columns desktop, 2 from
 * ~640px, stacked below that, with dividers between items. The
 * prototype's exact per-breakpoint nth-child divider rules are
 * approximated here rather than reproduced pixel-for-pixel — a
 * reasonable simplification for this phase, flagged in PROGRESS.md.
 */
export function BenefitsStrip({ benefits }: { benefits: DemoBenefit[] }) {
  return (
    <section id="benefits" className="bg-benefit-bg py-[clamp(24px,3.5vw,34px)]">
      <Container className="grid grid-cols-1 divide-y divide-line sm:grid-cols-2 sm:divide-y-0 lg:grid-cols-4">
        {benefits.map((benefit) => (
          <div
            key={benefit.id}
            className="flex items-center gap-3.5 px-[18px] py-3 first:pt-0 last:pb-0 sm:border-e sm:border-line sm:py-0 sm:last:border-e-0 sm:odd:border-e lg:[&:nth-child(4n)]:border-e-0"
          >
            <span className="h-[38px] w-[38px] shrink-0 rounded-full bg-ink/[0.07]" />
            <div>
              <h4 className="m-0 mb-0.5 text-[0.9rem] font-semibold">{benefit.title}</h4>
              <p className="m-0 text-[0.78rem] text-text-secondary">{benefit.description}</p>
            </div>
          </div>
        ))}
      </Container>
    </section>
  );
}
