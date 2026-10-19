import sharp, { type Sharp } from "sharp";

/**
 * Server-side image optimizer for admin uploads.
 *
 * - Every raster image (JPEG, PNG, WebP, AVIF, TIFF) is converted to WebP and
 *   shrunk until it is at most `TARGET_MAX_BYTES` (50 KB).
 * - GIFs are never converted (animation would be lost): they are stored as-is.
 *   Animated WebP files get the same treatment for the same reason.
 * - EXIF orientation is applied, then all metadata (GPS, camera, ICC) is
 *   dropped. Transparency is preserved.
 *
 * Pure Node module (no Next.js imports) so it can be unit-tested directly.
 */

export const TARGET_MAX_BYTES = 50 * 1024;

/** Largest side we ever keep; storefront images never display larger than this. */
const MAX_DIMENSION = 1600;
/** Below this the image is too small to be useful — give up instead. */
const MIN_DIMENSION = 240;
const QUALITY_MAX = 85;
const QUALITY_MIN = 20;
const SHRINK_FACTOR = 0.8;
/** Guards against decompression bombs (a tiny file that expands to gigapixels). */
const MAX_INPUT_PIXELS = 50_000_000;

export type DetectedImage = { mime: string; ext: string };

const startsWith = (b: Buffer, bytes: number[], offset = 0) =>
  b.length >= offset + bytes.length && bytes.every((byte, i) => b[offset + i] === byte);
const ascii = (b: Buffer, start: number, end: number) => b.subarray(start, end).toString("ascii");

/** Detects the real image type from magic bytes — never from the filename or declared MIME type. */
export function detectImageType(b: Buffer): DetectedImage | null {
  if (startsWith(b, [0xff, 0xd8, 0xff])) return { mime: "image/jpeg", ext: "jpg" };
  if (startsWith(b, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return { mime: "image/png", ext: "png" };
  if (b.length > 12 && ascii(b, 0, 4) === "RIFF" && ascii(b, 8, 12) === "WEBP") return { mime: "image/webp", ext: "webp" };
  if (b.length > 6 && ["GIF87a", "GIF89a"].includes(ascii(b, 0, 6))) return { mime: "image/gif", ext: "gif" };
  if (b.length > 12 && ascii(b, 4, 8) === "ftyp" && ["avif", "avis"].includes(ascii(b, 8, 12))) {
    return { mime: "image/avif", ext: "avif" };
  }
  if (startsWith(b, [0x49, 0x49, 0x2a, 0x00]) || startsWith(b, [0x4d, 0x4d, 0x00, 0x2a])) {
    return { mime: "image/tiff", ext: "tiff" };
  }
  return null;
}

export type OptimizeResult = {
  buffer: Buffer;
  ext: "webp" | "gif";
  /** False when the file was stored untouched (GIF / animated WebP). */
  converted: boolean;
  originalBytes: number;
  finalBytes: number;
};

export class ImageOptimizeError extends Error {
  constructor(public readonly code: "unreadable" | "too_complex", message: string) {
    super(message);
    this.name = "ImageOptimizeError";
  }
}

async function encodeWebp(source: Sharp, width: number, quality: number): Promise<Buffer> {
  return source
    .clone()
    .resize({ width, height: width, fit: "inside", withoutEnlargement: true })
    .webp({ quality, effort: 5, smartSubsample: true })
    .toBuffer();
}

/**
 * Finds the highest quality that fits `maxBytes` at a given width (binary
 * search, ~6 encodes). Returns null when even the lowest quality is too big.
 */
async function bestQualityAtWidth(source: Sharp, width: number, maxBytes: number): Promise<Buffer | null> {
  let low = QUALITY_MIN;
  let high = QUALITY_MAX;
  let best: Buffer | null = null;

  const highest = await encodeWebp(source, width, high);
  if (highest.length <= maxBytes) return highest;

  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    const out = await encodeWebp(source, width, mid);
    if (out.length <= maxBytes) {
      best = out;
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }
  return best;
}

export async function optimizeImage(
  input: Buffer,
  detected: DetectedImage,
  maxBytes: number = TARGET_MAX_BYTES,
): Promise<OptimizeResult> {
  // GIFs are intentionally left alone.
  if (detected.mime === "image/gif") {
    return { buffer: input, ext: "gif", converted: false, originalBytes: input.length, finalBytes: input.length };
  }

  let source: Sharp;
  let width: number;
  try {
    source = sharp(input, { limitInputPixels: MAX_INPUT_PIXELS, failOn: "error" });
    const meta = await source.metadata();
    if (!meta.width || !meta.height) throw new Error("no dimensions");

    // Animated WebP would lose its animation as a still frame — keep it untouched, like GIF.
    if (detected.mime === "image/webp" && (meta.pages ?? 1) > 1) {
      return { buffer: input, ext: "webp", converted: false, originalBytes: input.length, finalBytes: input.length };
    }

    // `rotate()` with no args applies EXIF orientation; metadata is stripped by default on output.
    source = source.rotate();
    // Orientations 5–8 swap the axes, but we only use the longest side below, so it doesn't matter.
    width = Math.min(Math.max(meta.width, meta.height), MAX_DIMENSION);
  } catch {
    throw new ImageOptimizeError("unreadable", "فایل تصویر خراب یا ناقص است و قابل پردازش نیست");
  }

  try {
    // Jump-start: output size scales roughly with pixel count, so one probe
    // encode tells us a sensible starting width instead of searching from 1600px.
    const probe = await encodeWebp(source, width, 45);
    if (probe.length > maxBytes) {
      const guess = Math.floor(width * Math.sqrt(maxBytes / probe.length) * 1.15);
      width = Math.min(width, Math.max(guess, MIN_DIMENSION));
    }

    for (let current = width; ; current = Math.floor(current * SHRINK_FACTOR)) {
      const out = await bestQualityAtWidth(source, current, maxBytes);
      if (out) {
        return { buffer: out, ext: "webp", converted: true, originalBytes: input.length, finalBytes: out.length };
      }
      if (current * SHRINK_FACTOR < MIN_DIMENSION) break;
    }
  } catch {
    throw new ImageOptimizeError("unreadable", "فایل تصویر خراب یا ناقص است و قابل پردازش نیست");
  }

  throw new ImageOptimizeError(
    "too_complex",
    "کاهش حجم این تصویر به کمتر از ۵۰ کیلوبایت ممکن نشد. تصویر ساده‌تری انتخاب کنید.",
  );
}
