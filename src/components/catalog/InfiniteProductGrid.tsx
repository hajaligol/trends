"use client";

import { Fragment, useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { loadMoreProducts } from "@/domains/catalog/load-more";
import type { LoadMoreSource } from "@/domains/catalog/load-more-schema";
import { PRODUCT_GRID_CLASS } from "@/domains/catalog/presentation";
import { toPersianDigits } from "@/lib/utils/persian-digits";

type Chunk = { page: number; cards: ReactNode };

/**
 * Product grid that appends the next page when the visitor nears the end,
 * up to `lastInfinitePage`; after that `finalPagination` (numbered pages)
 * is shown. Page contents come from the `loadMoreProducts` Server Action,
 * so cards stay server-rendered and prices stay server-authoritative.
 *
 * The URL is kept in sync with `history.replaceState` (`?page=N` = pages
 * 1..N loaded), so refresh/back/share reproduce the same list. Without JS,
 * `fallbackPagination` (plain links inside <noscript>) still reaches every page.
 */
export function InfiniteProductGrid({
  source,
  initialCards,
  initialCount,
  initialPage,
  lastInfinitePage,
  total,
  baseHref,
  showCount = false,
  fallbackPagination,
  finalPagination,
}: {
  source: LoadMoreSource;
  initialCards: ReactNode;
  initialCount: number;
  initialPage: number;
  lastInfinitePage: number;
  total: number;
  baseHref: string;
  showCount?: boolean;
  fallbackPagination: ReactNode;
  finalPagination: ReactNode;
}) {
  const [chunks, setChunks] = useState<Chunk[]>([]);
  const [loadedPage, setLoadedPage] = useState(initialPage);
  const [count, setCount] = useState(initialCount);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const busy = useRef(false);
  const sentinel = useRef<HTMLDivElement>(null);
  const done = loadedPage >= lastInfinitePage;

  const loadNext = useCallback(async () => {
    if (busy.current || done) return;
    busy.current = true;
    setStatus("loading");
    try {
      const nextPage = loadedPage + 1;
      const result = await loadMoreProducts({ source, page: nextPage });
      if (!result.ok) {
        setStatus("error");
        return;
      }
      setChunks((current) => [...current, { page: result.page, cards: result.cards }]);
      setLoadedPage(result.page);
      setCount((current) => current + result.count);
      setStatus("idle");

      const url = new URL(baseHref, window.location.origin);
      url.searchParams.set("page", String(result.page));
      window.history.replaceState(null, "", `${url.pathname}${url.search}`);
    } catch {
      setStatus("error");
    } finally {
      busy.current = false;
    }
  }, [baseHref, done, loadedPage, source]);

  useEffect(() => {
    const target = sentinel.current;
    if (!target || done || status === "error") return;
    // Re-created after every page so a still-visible sentinel (tall screens)
    // immediately triggers the next load.
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) void loadNext();
      },
      { rootMargin: "600px 0px" },
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, [done, status, loadNext]);

  return (
    <>
      <div className={PRODUCT_GRID_CLASS}>
        {initialCards}
        {chunks.map((chunk) => (
          <Fragment key={chunk.page}>{chunk.cards}</Fragment>
        ))}
      </div>

      <div aria-live="polite" className="sr-only">
        {status === "idle" && chunks.length > 0 ? `${toPersianDigits(count)} محصول نمایش داده می‌شود.` : ""}
      </div>

      {!done && (
        <div ref={sentinel} className="mt-8 flex min-h-10 items-center justify-center text-[0.88rem] text-text-secondary">
          {status === "loading" && <span role="status">در حال بارگذاری محصولات بیشتر…</span>}
          {status === "error" && (
            <button
              type="button"
              onClick={() => {
                setStatus("idle");
              }}
              className="rounded-full border border-line px-4 py-1.5 text-ink hover:border-ink"
            >
              بارگذاری ناموفق بود؛ تلاش دوباره
            </button>
          )}
        </div>
      )}

      {!done && <noscript>{fallbackPagination}</noscript>}
      {done && finalPagination}

      {showCount && count > 0 && (
        <p className="mt-4 text-center text-[0.82rem] text-text-secondary">
          نمایش {toPersianDigits(count)} محصول از {toPersianDigits(total)} محصول
        </p>
      )}
    </>
  );
}
