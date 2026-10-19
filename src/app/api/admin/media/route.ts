import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { isStaffOrAdmin } from "@/domains/auth/roles";
import { checkRateLimit, getClientIp } from "@/lib/security/rate-limit";
import { detectImageType, ImageOptimizeError, optimizeImage, TARGET_MAX_BYTES } from "@/lib/media/optimize-image";

/**
 * Admin image upload endpoint — lets `/admin/content`, `/admin/categories`
 * and product-image forms offer a real "browse for a file" button instead
 * of requiring the operator to paste a URL of an image already hosted
 * somewhere else (the gap this route closes).
 *
 * **Local disk storage, not object storage/CDN.** TRENDS_PROJECT_CONTEXT.md
 * §3 lists "object storage for product/media files" + "CDN for public
 * media" as the target infrastructure, but no provider (S3-compatible
 * bucket, credentials, CDN) has been configured anywhere in this project
 * — `.env.example` has no such variables. Per rule F.1 ("prefer the
 * simplest production-safe solution") and F.8 ("document meaningful
 * assumptions"), this stores uploads under `public/assets/<folder>/`,
 * served by Next.js itself exactly like the prototype's original static
 * assets already are. This is a real, working fix for the reported
 * problem (browse-and-upload instead of URL-only) on the current
 * single-Node-process deployment topology (see `rate-limit.ts`'s header
 * comment for the same "single process, not yet horizontally scaled"
 * assumption). It stops being sufficient the moment the app runs behind
 * multiple stateless instances/containers with no shared filesystem —
 * swapping this route's `writeFile` call for a real object-storage
 * adapter is then a contained, single-file change: every caller only
 * ever sees `{ url }` coming back from `POST /api/admin/media`, never a
 * filesystem path, so nothing else in the app needs to change.
 *
 * **Authorization**: staff/admin only, re-checked here directly (never
 * trusting that `/admin`'s layout gate was the only thing standing
 * between a request and this endpoint) — the same defense-in-depth
 * stance every other admin Server Action in this codebase takes.
 *
 * **Upload validation** ("safe file upload rules" — §11):
 * - `folder` must be one of a fixed allow-list (`ALLOWED_FOLDERS`) —
 *   never a caller-supplied path segment, which forecloses path
 *   traversal regardless of what a client sends.
 * - **Image optimization** (`lib/media/optimize-image.ts`): every JPEG/PNG/
 *   WebP/AVIF/TIFF upload is converted to WebP and shrunk to <= 50 KB
 *   (quality search, then downscaling). GIFs (and animated WebP) are stored
 *   as-is. The stored extension is therefore `webp` (or `gif`), never the
 *   uploaded one.
 * - File content is sniffed by magic bytes (`detectImageType`), not
 *   trusted from the browser-supplied `File.type`/filename — a `.jpg`
 *   extension or `image/png` MIME claim proves nothing about what bytes
 *   actually follow.
 * - Size is capped at `MAX_FILE_BYTES`.
 * - The stored filename is always a fresh `randomUUID()` plus the
 *   *detected* extension — the original filename (and therefore any
 *   attacker-controlled characters in it) never reaches the filesystem.
 * - Uploads never execute: everything lands under `public/assets/`,
 *   which Next.js only ever serves as static files.
 */

const ALLOWED_FOLDERS = ["products", "hero", "categories", "banners", "brands", "blog"] as const;
type AllowedFolder = (typeof ALLOWED_FOLDERS)[number];

function isAllowedFolder(value: FormDataEntryValue | null): value is AllowedFolder {
  return typeof value === "string" && (ALLOWED_FOLDERS as readonly string[]).includes(value);
}

// Raw uploads are re-encoded server-side, so phone photos are fine as input.
const MAX_FILE_BYTES = 12 * 1024 * 1024;
// GIFs are stored untouched (never converted), so keep them small.
const MAX_GIF_BYTES = 5 * 1024 * 1024;

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user || !isStaffOrAdmin(session.user.role)) {
    return NextResponse.json({ error: "شما اجازه دسترسی به این بخش را ندارید" }, { status: 403 });
  }

  // Authenticated-endpoint rate limit (defense-in-depth alongside the
  // auth check above) keyed by user id, with IP as a secondary key so a
  // compromised/shared session can't bypass it by itself — mirrors
  // `checkIpRateLimit`'s shape but this endpoint isn't a plain Server
  // Action, so it's inlined here against `checkRateLimit` directly.
  const ip = await getClientIp();
  const rate = checkRateLimit(`admin-media-upload:${session.user.id}:${ip}`, 30, 60_000);
  if (!rate.allowed) {
    return NextResponse.json(
      { error: "تعداد آپلود بیش از حد مجاز است. لطفاً کمی بعد دوباره تلاش کنید." },
      { status: 429 },
    );
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "درخواست نامعتبر است" }, { status: 400 });
  }

  const folder = formData.get("folder");
  if (!isAllowedFolder(folder)) {
    return NextResponse.json({ error: "مقصد فایل نامعتبر است" }, { status: 400 });
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "فایلی انتخاب نشده است" }, { status: 400 });
  }
  if (file.size === 0) {
    return NextResponse.json({ error: "فایل انتخاب‌شده خالی است" }, { status: 400 });
  }
  if (file.size > MAX_FILE_BYTES) {
    return NextResponse.json({ error: "حجم فایل نباید بیش از ۱۲ مگابایت باشد" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const detected = detectImageType(buffer);
  if (!detected) {
    return NextResponse.json(
      { error: "قالب فایل پشتیبانی نمی‌شود. فقط تصاویر JPG، PNG، WebP، AVIF، TIFF یا GIF مجاز است." },
      { status: 400 },
    );
  }
  if (detected.mime === "image/gif" && buffer.length > MAX_GIF_BYTES) {
    return NextResponse.json({ error: "حجم فایل GIF نباید بیش از ۵ مگابایت باشد" }, { status: 400 });
  }

  let result;
  try {
    result = await optimizeImage(buffer, detected, TARGET_MAX_BYTES);
  } catch (error) {
    if (error instanceof ImageOptimizeError) {
      return NextResponse.json({ error: error.message }, { status: 422 });
    }
    console.error("[admin/media] image optimization failed", error instanceof Error ? error.message : "unknown");
    return NextResponse.json({ error: "پردازش تصویر با خطا مواجه شد" }, { status: 500 });
  }

  const filename = `${randomUUID()}.${result.ext}`;
  const uploadDir = path.join(process.cwd(), "public", "assets", folder);
  await mkdir(uploadDir, { recursive: true });
  await writeFile(path.join(uploadDir, filename), result.buffer);

  return NextResponse.json(
    {
      url: `/assets/${folder}/${filename}`,
      originalBytes: result.originalBytes,
      finalBytes: result.finalBytes,
      converted: result.converted,
    },
    { status: 201 },
  );
}
