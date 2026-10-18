import type { ReactNode } from "react";
import { Container } from "@/components/ui/Container";

/**
 * Homepage row frame: the whole section (title + icon + product row) sits
 * inside one rounded card with a light-gray fill and a black → purple
 * gradient border. The border is a `border-box` background layer shown
 * through a transparent border, so it follows the rounded corners without
 * extra wrapper elements. Flat: no glow or animation.
 */
export function SectionFrame({
  title,
  icon,
  children,
}: {
  title: string;
  /** Decorative icon shown before the title. */
  icon?: ReactNode;
  children: ReactNode;
}) {
  return (
    <Container>
      <div
        className="rounded-[clamp(16px,2.4vw,26px)] border-[3px] border-transparent px-[clamp(14px,2.4vw,30px)] pb-[clamp(18px,2.6vw,30px)] pt-[clamp(14px,2vw,22px)] [background:linear-gradient(#f1f2f4,#f1f2f4)_padding-box,linear-gradient(135deg,#0a0610_0%,#2a0f55_45%,#7c3aed_100%)_border-box]"
      >
        <h2 className="m-0 flex items-center gap-2.5 text-[clamp(1.3rem,2.4vw,1.8rem)] font-bold leading-[1.4] text-ink">
          {icon && (
            <span aria-hidden="true" className="flex shrink-0">
              {icon}
            </span>
          )}
          {title}
        </h2>
        <div className="mt-[clamp(14px,2vw,22px)]">{children}</div>
      </div>
    </Container>
  );
}
