import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { detectImageType, optimizeImage, ImageOptimizeError, TARGET_MAX_BYTES } from "@/lib/media/optimize-image";
import { IMAGE_SPECS, imageSpecHint } from "@/lib/media/image-specs";

/** Noisy RGB image — deliberately hard to compress. */
async function noisy(width: number, height: number, format: "jpeg" | "png" | "webp" | "avif" | "tiff") {
  const raw = Buffer.alloc(width * height * 3);
  for (let i = 0; i < raw.length; i++) raw[i] = Math.floor(Math.random() * 256);
  return sharp(raw, { raw: { width, height, channels: 3 } })[format]().toBuffer();
}

async function run(buffer: Buffer) {
  const detected = detectImageType(buffer);
  expect(detected).not.toBeNull();
  return optimizeImage(buffer, detected!);
}

describe("optimizeImage", () => {
  it.each(["jpeg", "png", "webp", "avif", "tiff"] as const)("converts %s to WebP <= 50 KB", async (format) => {
    const input = await noisy(1400, 1000, format);
    const result = await run(input);
    expect(result.ext).toBe("webp");
    expect(result.converted).toBe(true);
    expect(result.finalBytes).toBeLessThanOrEqual(TARGET_MAX_BYTES);
    expect(detectImageType(result.buffer)?.mime).toBe("image/webp");
  }, 60_000);

  it("keeps an already-small image's aspect ratio and never upscales", async () => {
    const input = await sharp({ create: { width: 300, height: 400, channels: 3, background: "#e8dccb" } }).png().toBuffer();
    const result = await run(input);
    const meta = await sharp(result.buffer).metadata();
    expect(meta.width).toBe(300);
    expect(meta.height).toBe(400);
  });

  it("preserves transparency", async () => {
    const input = await sharp({ create: { width: 200, height: 200, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } }).png().toBuffer();
    const meta = await sharp((await run(input)).buffer).metadata();
    expect(meta.hasAlpha).toBe(true);
  });

  it("applies EXIF orientation and strips metadata", async () => {
    const input = await sharp({ create: { width: 400, height: 200, channels: 3, background: "#456" } })
      .jpeg()
      .withMetadata({ orientation: 6 })
      .toBuffer();
    const out = await sharp((await run(input)).buffer).metadata();
    expect(out.width).toBe(200);
    expect(out.height).toBe(400);
    expect(out.exif).toBeUndefined();
  });

  it("stores GIFs untouched (no conversion)", async () => {
    const gif = await sharp({ create: { width: 64, height: 64, channels: 3, background: "#f00" } }).gif().toBuffer();
    const result = await run(gif);
    expect(result.converted).toBe(false);
    expect(result.ext).toBe("gif");
    expect(result.buffer.equals(gif)).toBe(true);
  });

  it("rejects corrupt images with a typed error", async () => {
    const good = await noisy(200, 200, "jpeg");
    const truncated = good.subarray(0, 300);
    await expect(optimizeImage(truncated, { mime: "image/jpeg", ext: "jpg" })).rejects.toBeInstanceOf(ImageOptimizeError);
  });
});

describe("detectImageType", () => {
  it("ignores filenames and only trusts bytes", () => {
    expect(detectImageType(Buffer.from("<svg xmlns='http://www.w3.org/2000/svg'/>"))).toBeNull();
    expect(detectImageType(Buffer.from("not an image at all"))).toBeNull();
  });
});

describe("image specs", () => {
  it("has a Persian hint with the ratio for every fixed-ratio slot", () => {
    expect(imageSpecHint("product")).toContain("۴ به ۵");
    expect(imageSpecHint("hero")).toContain("۲۱ به ۸");
    expect(imageSpecHint("banner")).toContain("۱۱ به ۵");
    expect(imageSpecHint("blogCover")).toContain("۱۶ به ۱۰");
    expect(imageSpecHint("square")).toContain("۱ به ۱");
    for (const key of Object.keys(IMAGE_SPECS) as (keyof typeof IMAGE_SPECS)[]) {
      expect(imageSpecHint(key).length).toBeGreaterThan(10);
    }
  });
});
