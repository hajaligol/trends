type SectionHeadProps = {
  eyebrow: string;
  title: string;
  viewAllHref: string;
  viewAllLabel?: string;
};

/** Shared section-heading pattern: mirrors .section-head in the
 * prototype (used by Featured Products and New Arrivals). */
export function SectionHead({
  eyebrow,
  title,
  viewAllHref,
  viewAllLabel = "مشاهده همه",
}: SectionHeadProps) {
  return (
    <div className="mb-[34px] flex flex-wrap items-end justify-between gap-4">
      <div>
        <p className="text-[0.88rem] text-text-secondary">{eyebrow}</p>
        <h2 className="m-0 mt-1.5 text-[clamp(1.4rem,2.6vw,1.95rem)] font-bold">{title}</h2>
      </div>
      <a href={viewAllHref} className="flex items-center gap-1.5 whitespace-nowrap text-[0.9rem]">
        {viewAllLabel} <span aria-hidden="true">←</span>
      </a>
    </div>
  );
}
