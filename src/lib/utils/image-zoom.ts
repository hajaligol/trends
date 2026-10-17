/**
 * Pure zoom/pan math for the product image lightbox — no DOM access, so the
 * rules are unit-tested. Offsets are in CSS pixels, measured from the centre
 * of the stage (transform-origin: center) and applied as
 * `translate(x, y) scale(s)`.
 */

export const MIN_SCALE = 1;
export const MAX_SCALE = 4;
export const ZOOM_STEP = 0.5;

export type Point = { x: number; y: number };
export type Size = { width: number; height: number };

export function clampScale(scale: number): number {
  if (!Number.isFinite(scale)) return MIN_SCALE;
  return Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale));
}

/** Largest pan that still keeps the scaled image covering the stage. */
export function clampOffset(offset: Point, scale: number, stage: Size): Point {
  const maxX = (stage.width * (scale - 1)) / 2;
  const maxY = (stage.height * (scale - 1)) / 2;
  return {
    // `+ 0` normalises -0 (from -maxX when maxX is 0) to 0.
    x: Math.min(maxX, Math.max(-maxX, offset.x)) + 0,
    y: Math.min(maxY, Math.max(-maxY, offset.y)) + 0,
  };
}

/**
 * New scale/offset after zooming to `nextScale` while keeping the image point
 * under `anchor` (relative to the stage centre) fixed — so wheel/pinch zoom
 * follows the cursor/fingers. Zooming back to 1 recentres the image.
 */
export function zoomAt(
  current: { scale: number; offset: Point },
  nextScale: number,
  anchor: Point,
  stage: Size,
): { scale: number; offset: Point } {
  const scale = clampScale(nextScale);
  if (scale === MIN_SCALE) return { scale, offset: { x: 0, y: 0 } };
  const ratio = scale / current.scale;
  const offset = clampOffset(
    {
      x: anchor.x - (anchor.x - current.offset.x) * ratio,
      y: anchor.y - (anchor.y - current.offset.y) * ratio,
    },
    scale,
    stage,
  );
  return { scale, offset };
}

/** Wraps `index` into [0, count) so next/previous loop around the gallery. */
export function wrapIndex(index: number, count: number): number {
  if (count <= 0) return 0;
  return ((index % count) + count) % count;
}
