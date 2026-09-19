import type { ReactNode } from "react";

/**
 * Matches .container in reference/prototype.html:
 * max-width 1400px, centered, fluid inline padding via clamp().
 * The actual max-width/gutter values live in src/styles/globals.css
 * as CSS custom properties so every consumer stays in sync.
 */
export function Container({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={`container ${className}`}>{children}</div>;
}
