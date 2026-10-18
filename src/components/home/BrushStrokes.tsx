/**
 * Decorative paintbrush artwork for the «شگفت‌انگیزها» card: a few wide,
 * soft-edged thick black/purple gradient strokes painted over the card's gradient.
 * Pure SVG (no raster, no JS, no animation); `aria-hidden`.
 *
 * The `trends-brush` filter gives the stroke edges a gentle wobble and a blur,
 * and fades the paint very slightly in faint horizontal streaks (soft, not hard
 * dry-brush gaps). Its id is
 * fixed and `BrushUnderline` references it, so render this once per page.
 */
export function BrushStrokes() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden rounded-[inherit]">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 1200 520"
        preserveAspectRatio="none"
        className="h-full w-full"
      >
        <defs>
          <filter id="trends-brush" x="-8%" y="-40%" width="116%" height="180%">
            <feTurbulence type="fractalNoise" baseFrequency="0.01 0.2" numOctaves="2" seed="4" result="edge" />
            <feDisplacementMap in="SourceGraphic" in2="edge" scale="12" xChannelSelector="R" yChannelSelector="G" result="rough" />
            <feGaussianBlur in="rough" stdDeviation="2.2" result="soft" />
            <feTurbulence type="fractalNoise" baseFrequency="0.004 0.9" numOctaves="2" seed="9" result="streak" />
            <feColorMatrix in="streak" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 2.2 -0.1" result="fade" />
            <feComposite in="soft" in2="fade" operator="in" />
          </filter>
          <linearGradient id="trends-brush-g1" gradientUnits="userSpaceOnUse" x1="1200" y1="0" x2="0" y2="0">
            <stop offset="0" stopColor="#3b0f7a" />
            <stop offset="0.5" stopColor="#a855f7" />
            <stop offset="1" stopColor="#5b21b6" />
          </linearGradient>
          <linearGradient id="trends-brush-g2" gradientUnits="userSpaceOnUse" x1="1200" y1="0" x2="0" y2="0">
            <stop offset="0" stopColor="#0a0610" />
            <stop offset="0.55" stopColor="#2e1065" />
            <stop offset="1" stopColor="#0a0610" />
          </linearGradient>
          <linearGradient id="trends-brush-g3" gradientUnits="userSpaceOnUse" x1="1200" y1="0" x2="0" y2="0">
            <stop offset="0" stopColor="#7c3aed" />
            <stop offset="0.5" stopColor="#c4b5fd" />
            <stop offset="1" stopColor="#8b5cf6" />
          </linearGradient>
          <linearGradient id="trends-brush-g4" gradientUnits="userSpaceOnUse" x1="1200" y1="0" x2="0" y2="0">
            <stop offset="0" stopColor="#1a0b33" />
            <stop offset="0.5" stopColor="#4c1d95" />
            <stop offset="1" stopColor="#0a0610" />
          </linearGradient>
        </defs>
        <g filter="url(#trends-brush)" fill="none" strokeLinecap="round">
          <path d="M-40 90 C 220 40, 520 130, 860 70 S 1140 40, 1260 80" stroke="url(#trends-brush-g1)" strokeOpacity="0.6" strokeWidth="130" />
          <path d="M-40 150 C 260 120, 560 190, 900 140 S 1160 120, 1260 150" stroke="url(#trends-brush-g2)" strokeOpacity="0.75" strokeWidth="84" />
          <path d="M120 470 C 380 420, 700 500, 1000 440 S 1200 430, 1280 450" stroke="url(#trends-brush-g3)" strokeOpacity="0.32" strokeWidth="100" />
          <path d="M-60 500 C 200 470, 480 520, 760 490 S 1100 480, 1260 500" stroke="url(#trends-brush-g4)" strokeOpacity="0.7" strokeWidth="112" />
        </g>
      </svg>
    </div>
  );
}

/** Brush-stroke underline for the title (uses the `trends-brush` filter from `BrushStrokes`). */
export function BrushUnderline() {
  return (
    <svg
      aria-hidden="true"
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 600 30"
      preserveAspectRatio="none"
      className="mt-1.5 block h-[20px] w-full"
    >
      <defs>
        <linearGradient id="trends-brush-line" x1="1" y1="0" x2="0" y2="0">
          <stop offset="0" stopColor="#e9dcff" />
          <stop offset="0.5" stopColor="#8a3fe0" />
          <stop offset="1" stopColor="#8a3fe0" stopOpacity="0.15" />
        </linearGradient>
      </defs>
      <path
        d="M596 17 C 470 8, 340 23, 210 13 S 60 17 6 12"
        fill="none"
        stroke="url(#trends-brush-line)"
        strokeWidth="14"
        strokeLinecap="round"
        filter="url(#trends-brush)"
      />
    </svg>
  );
}
