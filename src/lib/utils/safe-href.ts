/** Returns `href` only if it is a site-relative path or an http(s) URL —
 * never `javascript:`, `data:` or protocol-relative `//host` links. */
export function safeHref(href: string | null | undefined): string | null {
  if (!href) return null;
  const value = href.trim();
  if (value.startsWith("/") && !value.startsWith("//")) return value;
  if (/^https?:\/\//i.test(value)) return value;
  return null;
}
