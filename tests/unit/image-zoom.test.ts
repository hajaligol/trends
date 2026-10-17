import { describe, expect, it } from "vitest";
import { MAX_SCALE, clampOffset, clampScale, wrapIndex, zoomAt } from "@/lib/utils/image-zoom";

const stage = { width: 800, height: 600 };

describe("clampScale", () => {
  it("keeps the scale within 1..MAX", () => {
    expect(clampScale(0.2)).toBe(1);
    expect(clampScale(9)).toBe(MAX_SCALE);
    expect(clampScale(2.5)).toBe(2.5);
    expect(clampScale(Number.NaN)).toBe(1);
  });
});

describe("clampOffset", () => {
  it("does not allow panning at scale 1", () => {
    expect(clampOffset({ x: 50, y: -50 }, 1, stage)).toEqual({ x: 0, y: 0 });
  });
  it("limits the pan to the overflow of the scaled image", () => {
    expect(clampOffset({ x: 9999, y: -9999 }, 2, stage)).toEqual({ x: 400, y: -300 });
  });
});

describe("zoomAt", () => {
  it("recentres when zooming back to 1", () => {
    const r = zoomAt({ scale: 3, offset: { x: 100, y: 40 } }, 1, { x: 10, y: 10 }, stage);
    expect(r).toEqual({ scale: 1, offset: { x: 0, y: 0 } });
  });
  it("zooming at the centre does not move the image", () => {
    const r = zoomAt({ scale: 1, offset: { x: 0, y: 0 } }, 2, { x: 0, y: 0 }, stage);
    expect(r.scale).toBe(2);
    expect(r.offset).toEqual({ x: 0, y: 0 });
  });
  it("keeps the point under the cursor fixed", () => {
    const r = zoomAt({ scale: 1, offset: { x: 0, y: 0 } }, 2, { x: 100, y: 50 }, stage);
    expect(r.offset).toEqual({ x: -100, y: -50 });
  });
  it("never exceeds the max scale and stays inside the pan bounds", () => {
    const r = zoomAt({ scale: 1, offset: { x: 0, y: 0 } }, 99, { x: 390, y: 290 }, stage);
    expect(r.scale).toBe(MAX_SCALE);
    expect(Math.abs(r.offset.x)).toBeLessThanOrEqual(1200);
    expect(Math.abs(r.offset.y)).toBeLessThanOrEqual(900);
  });
});

describe("wrapIndex", () => {
  it("loops in both directions", () => {
    expect(wrapIndex(4, 4)).toBe(0);
    expect(wrapIndex(-1, 4)).toBe(3);
    expect(wrapIndex(2, 4)).toBe(2);
    expect(wrapIndex(1, 0)).toBe(0);
  });
});
