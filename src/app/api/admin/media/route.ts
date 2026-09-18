import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { isStaffOrAdmin } from "@/domains/auth/roles";
import { checkRateLimit, getClientIp } from "@/lib/security/rate-limit";

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

const ALLOWED_FOLDERS = ["products", "hero", "categories", "banners"] as const;
type AllowedFolder = (typeof ALLOWED_FOLDERS)[number];

function isAllowedFolder(value: FormDataEntryValue | null): value is AllowedFolder {
  return typeof value === "string" && (ALLOWED_FOLDERS as readonly string[]).includes(value);
}

const MAX_FILE_BYTES = 5 * 1024 * 1024; // 5 MB — generous for web-optimized product/banner photography.

type ImageSignature = { mime: string; ext: string; matches: (buffer: Buffer) => boolean };

// Detected by magic bytes, not by trusting the browser's declared
// `File.type` or the filename's extension — see header comment.
const IMAGE_SIGNATURES: ImageSignature[] = [
  {
    mime: "image/jpeg",
    ext: "jpg",
    matches: (b) => b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  },
  {
    mime: "image/png",
    ext: "png",
    matches: (b) =>
      b.length > 8 && b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
  },
  {
    mime: "image/webp",
    ext: "webp",
    matches: (b) =>
      b.length > 12 && b.subarray(0, 4).toString("ascii") === "RIFF" && b.subarray(8, 12).toString("ascii") === "WEBP",
  },
  {
    mime: "image/gif",
    ext: "gif",
    matches: (b) =>
      b.length > 6 && ["GIF87a", "GIF89a"].includes(b.subarray(0, 6).toString("ascii")),
  },
];

function detectImageType(buffer: Buffer): ImageSignature | null {
  return IMAGE_SIGNATURES.find((signature) => signature.matches(buffer)) ?? null;
}

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
    return NextResponse.json({ error: "حجم فایل نباید بیش از ۵ مگابایت باشد" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const signature = detectImageType(buffer);
  if (!signature) {
    return NextResponse.json(
      { error: "قالب فایل پشتیبانی نمی‌شود. فقط تصاویر JPG، PNG، WebP یا GIF مجاز است." },
      { status: 400 },
    );
  }

  const filename = `${randomUUID()}.${signature.ext}`;
  const uploadDir = path.join(process.cwd(), "public", "assets", folder);
  await mkdir(uploadDir, { recursive: true });
  await writeFile(path.join(uploadDir, filename), buffer);

  return NextResponse.json({ url: `/assets/${folder}/${filename}` }, { status: 201 });
}
