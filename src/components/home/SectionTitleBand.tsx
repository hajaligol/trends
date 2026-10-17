import type { ReactNode } from "react";
import { Container } from "@/components/ui/Container";

/**
 * Dark-gray band holding a homepage row's title (and its icon). It spans
 * the full width of the content container and has rounded corners; the
 * rows below it have no background of their own. Flat on purpose: solid
 * colour only, no gradient, glow or animation.
 */
export function SectionTitleBand({
  title,
  icon,
}: {
  title: string;
  /** Decorative icon shown before the title. */
  icon?: ReactNode;
}) {
  return (
    <Container>
      <div className="rounded-[clamp(16px,2.4vw,26px)] bg-[#2b2d30] px-[clamp(16px,2.8vw,32px)] py-[clamp(12px,1.8vw,18px)]">
        <h2 className="m-0 flex items-center gap-2.5 text-[clamp(1.3rem,2.4vw,1.8rem)] font-bold leading-[1.4] text-white">
          {icon && (
            <span aria-hidden="true" className="flex shrink-0 text-white">
              {icon}
            </span>
          )}
          {title}
        </h2>
      </div>
    </Container>
  );
}
