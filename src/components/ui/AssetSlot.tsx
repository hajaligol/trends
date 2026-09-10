import type { HTMLAttributes } from "react";

type Tone = "surface" | "banner";
type Radius = "none" | "sm" | "md" | "lg" | "full";

// Mirrors .asset-slot / .asset-slot--banner in reference/prototype.html.
const toneClasses: Record<Tone, string> = {
  surface: "bg-ink/[0.055]",
  banner: "bg-ink/[0.08]",
};

const roundedClasses: Record<Radius, string> = {
  none: "rounded-none",
  sm: "rounded-[8px]",
  md: "rounded-[14px]",
  lg: "rounded-[22px]",
  full: "rounded-full",
};

type AssetSlotProps = Omit<HTMLAttributes<HTMLDivElement>, "role" | "aria-label"> & {
  /** Describes the image that will eventually go here — used as the
   * accessible name since there is no real `alt` text yet. */
  label: string;
  tone?: Tone;
  rounded?: Radius;
};

/**
 * Generic placeholder for product/banner/hero imagery that hasn't been
 * supplied yet. Once real media exists (Phase 3+ object storage/CDN),
 * swap the call site for `next/image` — this component's `label` prop
 * maps directly to the eventual `alt` text.
 */
export function AssetSlot({
  label,
  tone = "surface",
  rounded = "md",
  className = "",
  ...props
}: AssetSlotProps) {
  return (
    <div
      role="img"
      aria-label={label}
      className={`shrink-0 ${toneClasses[tone]} ${roundedClasses[rounded]} ${className}`}
      {...props}
    />
  );
}
