import Link from "next/link";
import { ChevronLeftIcon } from "@/components/ui/icons";

/**
 * The last item of a homepage row that has more products than it shows.
 * Stretches to the height of the neighbouring product cards.
 */
export function ShowAllTile({
  href,
  label,
  productsLabel,
  animated = true,
  tone = "light",
}: {
  href: string;
  label: string;
  productsLabel: string;
  /** Hover transition and the nudging arrow. `false` = no animation. */
  animated?: boolean;
  /** `dark` = for tiles that sit on a black/purple panel. */
  tone?: "light" | "dark";
}) {
  const dark = tone === "dark";
  return (
    <Link
      href={href}
      className={`group flex min-h-[220px] flex-1 flex-col items-center justify-center gap-3 rounded-[14px] border px-4 text-center ${dark ? "border-white/15 bg-white/[0.06] hover:border-lavender/60 hover:bg-white/10" : "border-brand/20 bg-white/70 hover:border-brand hover:bg-white"} ${animated ? "transition duration-200" : ""}`}
    >
      <span
        aria-hidden="true"
        className={`flex h-12 w-12 items-center justify-center rounded-full ${dark ? "bg-lavender text-brand-dark" : "bg-brand text-white"} ${animated ? "transition-transform duration-200 group-hover:-translate-x-1 motion-reduce:group-hover:translate-x-0" : ""}`}
      >
        <ChevronLeftIcon className="h-6 w-6" />
      </span>
      <span className={`text-[0.95rem] font-bold ${dark ? "text-white" : "text-ink"}`}>{label}</span>
      <span className={`text-[0.8rem] ${dark ? "text-white/65" : "text-text-secondary"}`}>{productsLabel}</span>
    </Link>
  );
}
