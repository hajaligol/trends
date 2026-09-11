/**
 * Single source of truth for the site's public base URL, used by
 * `metadataBase`, canonical URLs, Open Graph, `sitemap.ts`, and
 * `robots.ts`. Falls back to localhost for dev/test environments where
 * `NEXT_PUBLIC_SITE_URL` isn't set, so those code paths don't crash —
 * but production deploys must set the real env var (see `.env.example`).
 */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/+$/, "");

export const SITE_NAME = "ترندز";
