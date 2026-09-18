"use client";

import { useEffect } from "react";

/**
 * Next.js's built-in "scroll to top on navigation" behavior is based on
 * comparing layout segments between the old and new route. When two
 * pages share the exact same layout — e.g. navigating from one product
 * detail page to another via a "related products" link, since both are
 * `/product/[slug]` under the same layout — Next.js sometimes decides
 * the shared layout is already positioned correctly and skips the
 * reset, even though the page's own content is entirely new.
 *
 * `trackKey` should be something that changes whenever the page's
 * *content* changes (here, the product slug) so this fires on every
 * real navigation to a different product, not just on first mount.
 */
export function ScrollToTopOnMount({ trackKey }: { trackKey: string }) {
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [trackKey]);

  return null;
}
