"use client";

import { useEffect, useRef, useState } from "react";
import Form from "next/form";
import Image from "next/image";
import Link from "next/link";
import { ClockIcon, FolderIcon, SearchIcon, TrendingUpIcon, XIcon } from "@/components/ui/icons";
import { useDimPage } from "@/components/overlays/UIOverlayProvider";
import { TRENDING_SEARCHES } from "@/lib/search/trending-searches";
import { formatToman } from "@/lib/utils/money";
import { toPersianDigits } from "@/lib/utils/persian-digits";

const STORAGE_KEY = "trends:search-history";
const MAX_HISTORY = 8;

/** Search history lives in this browser only (localStorage). */
function readHistory(): string[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item): item is string => typeof item === "string" && item.trim() !== "")
      .slice(0, MAX_HISTORY);
  } catch {
    return [];
  }
}

function writeHistory(items: string[]) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    // Storage can be blocked (private mode, quota) — history is a convenience only.
  }
}

type Suggestion = {
  slug: string;
  title: string;
  price: number | null;
  discountPercent: number;
  image: string | null;
  imageAlt: string;
  /** Root-to-leaf category names, e.g. ["مردانه", "لباس", "هودی"]. */
  categoryPath: string[];
};

type CategorySuggestion = { slug: string; name: string; parents: string[] };

/** Live results start once the visitor has typed this many characters. */
const MIN_LIVE_LENGTH = 2;

const searchHref = (term: string) => `/search?q=${encodeURIComponent(term)}`;

/**
 * Desktop header search box. Narrower than the centre column, light gray,
 * no focus outline (the `!` beats the global `:focus-visible` rule in
 * globals.css, which is unlayered and would otherwise win), and — when focused or clicked — a dropdown with the visitor's
 * recent searches and a list of trending searches.
 */
export function HeaderSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [history, setHistory] = useState<string[]>([]);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [live, setLive] = useState<{
    q: string;
    total: number;
    items: Suggestion[];
    categories: CategorySuggestion[];
  } | null>(null);
  const [liveFailed, setLiveFailed] = useState(false);

  // Dim the page *and the header* while the dropdown is open. The search
  // box (z-[51]) and its dropdown (z-50) stay above the header's dim layer
  // (z-[45], see Header.tsx) so they remain bright.
  useDimPage(open, { includeHeader: true });

  const typed = query.trim();
  const showResults = typed.length >= MIN_LIVE_LENGTH;
  const liveLoading = showResults && !liveFailed && live?.q !== typed;

  // Read after mount so server and first client render match.
  useEffect(() => {
    setHistory(readHistory());
  }, []);

  // Live results: debounced fetch while the panel is open. Each keystroke
  // cancels the previous timer/request, so only the latest query resolves.
  useEffect(() => {
    if (!open || typed.length < MIN_LIVE_LENGTH) {
      setLive(null);
      setLiveFailed(false);
      return;
    }
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch(`/api/search/suggest?q=${encodeURIComponent(typed)}`, {
          signal: controller.signal,
        });
        if (!response.ok) throw new Error("search failed");
        const data = (await response.json()) as {
          total: number;
          items: Suggestion[];
          categories: CategorySuggestion[];
        };
        setLive({ q: typed, total: data.total, items: data.items, categories: data.categories });
        setLiveFailed(false);
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setLiveFailed(true);
      }
    }, 250);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [open, typed]);

  // Close when clicking anywhere outside the search box + dropdown.
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!wrapperRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open]);

  const remember = (raw: string) => {
    const term = raw.trim();
    if (!term) return;
    const next = [term, ...readHistory().filter((item) => item !== term)].slice(0, MAX_HISTORY);
    setHistory(next);
    writeHistory(next);
  };

  const removeFromHistory = (term: string) => {
    const next = readHistory().filter((item) => item !== term);
    setHistory(next);
    writeHistory(next);
  };

  const clearHistory = () => {
    setHistory([]);
    writeHistory([]);
  };

  const pick = (term: string) => {
    remember(term);
    setQuery(term);
    setOpen(false);
    inputRef.current?.blur();
  };

  const visibleHistory = typed ? history.filter((item) => item.includes(typed)) : history;

  return (
    <div
      ref={wrapperRef}
      className="relative w-full max-w-[400px] self-center"
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          setOpen(false);
          inputRef.current?.blur();
        }
      }}
    >
      <Form
        action="/search"
        role="search"
        className="relative z-[51]"
        onSubmit={() => {
          remember(query);
          setOpen(false);
          inputRef.current?.blur();
        }}
      >
        <label htmlFor="header-search" className="sr-only">
          جستجو در ترندز
        </label>
        <input
          ref={inputRef}
          id="header-search"
          type="search"
          name="q"
          required
          autoComplete="off"
          enterKeyHint="search"
          maxLength={100}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onFocus={() => setOpen(true)}
          onClick={() => setOpen(true)}
          placeholder="نام محصول یا دسته را جستجو کنید..."
          className="h-[48px] w-full rounded-full border border-[#d5d9dd] bg-[#e3e6e9] ps-6 pe-[78px] text-[0.95rem] text-ink outline-none! placeholder:text-text-secondary focus:outline-none! focus-visible:outline-none! [&::-webkit-search-cancel-button]:hidden [&::-webkit-search-cancel-button]:appearance-none [&::-webkit-search-decoration]:hidden"
        />
        {/* Custom clear button (the browser's built-in one is hidden above). */}
        {query && (
          <button
            type="button"
            aria-label="پاک کردن متن جستجو"
            onClick={() => {
              setQuery("");
              setOpen(true);
              inputRef.current?.focus();
            }}
            className="absolute inset-y-1 end-[46px] flex w-[28px] items-center justify-center rounded-full text-red-500 transition-colors duration-200 hover:bg-red-500/10"
          >
            <XIcon className="h-[20px] w-[20px]" />
          </button>
        )}
        <button
          type="submit"
          aria-label="جستجو"
          className="absolute inset-y-1 end-1 flex w-[40px] items-center justify-center rounded-full transition-colors duration-200 hover:bg-ink/6"
        >
          <SearchIcon className="h-[24px] w-[24px] text-ink" />
        </button>
      </Form>

      {/* Expanded search panel: a white rounded card that opens *around* the
          input (the input sits at its top, raised above it via z-[51]),
          followed by trending searches as chips and then the recent-search
          history. */}
      {/* Always mounted so it can animate both ways: fades and eases down
          from the input on open, reverses on close. `invisible` (visibility)
          also removes it from the tab order while closed. */}
      <div
          aria-hidden={!open}
          className={`absolute -inset-x-3 -top-3 z-50 origin-top rounded-[26px] border border-line bg-white pt-[72px] shadow-[0_12px_32px_rgba(24,38,48,0.14)] transition-[opacity,transform,visibility] duration-200 ease-out motion-reduce:transition-none ${
            open
              ? "visible translate-y-0 scale-100 opacity-100"
              : "pointer-events-none invisible -translate-y-2 scale-[0.97] opacity-0"
          }`}
        >
          <div className="max-h-[60vh] overflow-y-auto px-4 pb-5 pt-2">
            {showResults ? (
              <section aria-label="نتایج جستجو" aria-live="polite">
                {liveFailed ? (
                  <p className="m-0 px-1 py-4 text-[0.9rem] text-text-secondary">
                    خطا در دریافت نتایج. دوباره تلاش کنید.
                  </p>
                ) : liveLoading ? (
                  <ul className="m-0 list-none p-0" aria-busy="true">
                    {[0, 1, 2].map((n) => (
                      <li key={n} className="flex items-center gap-3 p-2">
                        <div className="h-[60px] w-[48px] shrink-0 animate-pulse rounded-lg bg-[#f0f2f4]" />
                        <div className="flex-1 space-y-2">
                          <div className="h-3 w-2/3 animate-pulse rounded bg-[#f0f2f4]" />
                          <div className="h-3 w-1/3 animate-pulse rounded bg-[#f0f2f4]" />
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : live && live.items.length === 0 && live.categories.length === 0 ? (
                  <p className="m-0 px-1 py-4 text-[0.9rem] text-text-secondary">
                    نتیجه‌ای برای «{typed}» پیدا نشد.
                  </p>
                ) : (
                  <>
                    {live && live.categories.length > 0 && (
                      <div className="mb-4">
                        <h3 className="m-0 mb-2 text-[0.95rem] font-bold text-ink">دسته‌بندی‌ها</h3>
                        <ul className="m-0 list-none p-0">
                          {live.categories.map((category) => (
                            <li key={category.slug}>
                              <Link
                                href={`/category/${category.slug}`}
                                onClick={() => {
                                  setOpen(false);
                                  inputRef.current?.blur();
                                }}
                                className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-[#f0f2f4]"
                              >
                                <FolderIcon className="h-[18px] w-[18px] shrink-0 text-black" />
                                <span className="min-w-0 flex-1 truncate text-[0.92rem] text-ink">
                                  <span className="font-semibold">{category.name}</span>
                                  {category.parents.length > 0 && (
                                    <span className="text-[0.82rem] text-text-secondary">
                                      {" "}
                                      در {category.parents.join(" › ")}
                                    </span>
                                  )}
                                </span>
                              </Link>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {live && live.items.length > 0 && (
                      <>
                        <h3 className="m-0 mb-2 text-[0.95rem] font-bold text-ink">محصولات</h3>
                        <ul className="m-0 list-none p-0">
                          {live.items.map((item) => (
                            <li key={item.slug}>
                              <Link
                                href={`/product/${item.slug}`}
                                onClick={() => {
                                  setOpen(false);
                                  inputRef.current?.blur();
                                }}
                                className="flex items-center gap-3 rounded-xl p-2 transition-colors hover:bg-[#f0f2f4]"
                              >
                                <span className="relative h-[60px] w-[48px] shrink-0 overflow-hidden rounded-lg bg-card-image">
                                  {item.image && (
                                    <Image src={item.image} alt={item.imageAlt} fill sizes="48px" className="object-cover" />
                                  )}
                                </span>
                                <span className="min-w-0 flex-1">
                                  <span className="block truncate text-[0.92rem] font-semibold text-ink">
                                    {item.title}
                                  </span>
                                  {item.categoryPath.length > 0 && (
                                    <span className="mt-0.5 block truncate text-[0.78rem] text-text-secondary">
                                      {item.categoryPath.join(" › ")}
                                    </span>
                                  )}
                                  <span className="mt-0.5 flex items-center gap-2 text-[0.85rem] text-text-secondary">
                                    {item.price !== null ? formatToman(item.price) : "—"}
                                    {item.discountPercent > 0 && (
                                      <span className="rounded-full bg-red-50 px-2 py-0.5 text-[0.75rem] font-semibold text-red-600">
                                        {toPersianDigits(item.discountPercent)}٪ تخفیف
                                      </span>
                                    )}
                                  </span>
                                </span>
                              </Link>
                            </li>
                          ))}
                        </ul>
                        <Link
                          href={searchHref(typed)}
                          onClick={() => pick(typed)}
                          className="mt-3 flex items-center justify-center rounded-full bg-brand px-5 py-2.5 text-[0.9rem] font-semibold text-white transition-colors duration-200 hover:bg-brand-dark"
                        >
                          {live.total > live.items.length
                            ? `مشاهده همه ${toPersianDigits(live.total)} نتیجه`
                            : "مشاهده در صفحه‌ی جستجو"}
                        </Link>
                      </>
                    )}
                  </>
                )}
              </section>
            ) : (
              <>
            <section aria-label="جستجوهای پرطرفدار">
              <h3 className="m-0 mb-3 text-[0.95rem] font-bold text-ink">جستجوهای پرطرفدار</h3>
              <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
                {TRENDING_SEARCHES.map((term) => (
                  <li key={term}>
                    <Link
                      href={searchHref(term)}
                      onClick={() => pick(term)}
                      className="inline-flex items-center gap-2 rounded-full border border-[#dfe2e5] bg-white px-4 py-2 text-[0.9rem] text-ink transition-colors hover:bg-[#f0f2f4]"
                    >
                      <span>{term}</span>
                      <TrendingUpIcon className="h-[18px] w-[18px] shrink-0 text-black" />
                    </Link>
                  </li>
                ))}
              </ul>
            </section>

            {visibleHistory.length > 0 && (
              <section aria-label="جستجوهای اخیر" className="mt-6">
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="m-0 text-[0.95rem] font-bold text-ink">جستجوهای اخیر</h3>
                  {!typed && (
                    <button
                      type="button"
                      onClick={clearHistory}
                      className="text-[0.8rem] text-text-secondary transition-colors hover:text-ink"
                    >
                      پاک کردن همه
                    </button>
                  )}
                </div>
                <ul className="m-0 list-none p-0">
                  {visibleHistory.map((term) => (
                    <li key={term} className="flex items-center rounded-xl hover:bg-[#f0f2f4]">
                      <Link
                        href={searchHref(term)}
                        onClick={() => pick(term)}
                        className="flex min-w-0 flex-1 items-center gap-3 px-3 py-2.5 text-[0.92rem] text-ink"
                      >
                        <ClockIcon className="h-[18px] w-[18px] shrink-0 text-text-secondary" />
                        <span className="truncate">{term}</span>
                      </Link>
                      <button
                        type="button"
                        aria-label={`حذف «${term}» از جستجوهای اخیر`}
                        onClick={() => removeFromHistory(term)}
                        className="me-2 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-text-secondary transition-colors hover:bg-ink/6 hover:text-ink"
                      >
                        <XIcon className="h-[16px] w-[16px]" />
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            )}
              </>
            )}
          </div>
        </div>
    </div>
  );
}
