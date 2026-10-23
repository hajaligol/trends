/**
 * The single definition of "an image file this site hosts": a path under
 * `/assets/` produced by the admin upload endpoint. Used by the admin and blog
 * validation schemas and by the Markdown renderer, so what may be stored and
 * what may be rendered can never drift apart. (`next/image` has no remote
 * hosts configured, so an external URL would crash the page that renders it,
 * and `javascript:`/`data:` values must never be stored at all.)
 */
export const HOSTED_ASSET_PATH_PATTERN = /^\/assets\/[A-Za-z0-9._\-/]+$/;

export function isHostedAssetPath(value: string | undefined | null): value is string {
  return typeof value === "string" && HOSTED_ASSET_PATH_PATTERN.test(value) && !value.includes("..");
}
