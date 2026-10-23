"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import Form from "next/form";
import Image from "next/image";
import Link from "next/link";
import { ClockIcon, FolderIcon, SearchIcon, TagIcon, TrendingUpIcon, XIcon } from "@/components/ui/icons";
import { TRENDING_SEARCHES } from "@/lib/search/trending-searches";
import { formatToman } from "@/lib/utils/money";
import { toPersianDigits } from "@/lib/utils/persian-digits";
import { productHref } from "@/domains/catalog/slug";

/**
 * Touch-screen search: one input plus its results, laid out as a normal
 * scrolling column (no floating dropdown), used by the full-screen search
 * panel (`SearchOverlay`) and by the top of the mobile categories page.
 *
 * It talks to the same `/api/search/suggest` endpoint as the desktop header
 * search and shares its recent-search list (same localStorage key), but it is
 * a separate component on purpose: the desktop `HeaderSearch` is untouched.
 *
 * Below two typed characters it shows `idleContent` when given (the
 * categories page puts its category list there), otherwise trending and
 * recent searches. The input is 16px so iOS does not zoom the page on focus.
 */

const STORAGE_KEY = "trends:search-history";
const MAX_HISTORY = 8;
const MIN_LIVE_LENGTH = 2;

const historyListeners = new Set<() => void>();
const notifyHistory = () => historyListeners.forEach((listener) => listener());

function subscribeHistory(listener: () => void) {
  historyListeners.add(listener);
  const onStorage = (event: StorageEvent) => {
    if (event.key === null || event.key === STORAGE_KEY) listener();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    historyListeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

function getHistorySnapshot(): string {
  try {
    return window.localStorage.getItem(STORAGE_KEY) ?? "";
  } catch {
    return "";
  }
}

const getServerHistorySnapshot = () => "";

function parseHistory(raw: string): string[] {
  try {
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
  notifyHistory();
}

type Suggestion = {
  slug: string;
  title: string;
  price: number | null;
  discountPercent: number;
  image: string | null;
  imageAlt: string;
  categoryPath: string[];
};
type CategorySuggestion = { slug: string; name: string; parents: string[] };
type BrandSuggestion = { name: string; nameEn: string | null; productCount: number };
type Live = {
  q: string;
  total: number;
  items: Suggestion[];
  categories: CategorySuggestion[];
  brands: BrandSuggestion[];
};

const searchHref = (term: string) => `/search?q=${encodeURIComponent(term)}`;

const SECTION_TITLE = "m-0 mb-2 text-[0.95rem] font-bold text-ink";
const ROW = "flex min-h-12 items-center gap-3 rounded-xl px-3 py-2.5 text-ink transition-colors active:bg-ink/6";

export function MobileSearch({
  inputId,
  autoFocus = false,
  onNavigate,
  idleContent,
  className = "",
  formClassName = "",
}: {
  inputId: string;
  autoFocus?: boolean;
  /** Called when the visitor leaves for a result page (the overlay closes itself here). */
  onNavigate?: () => void;
  idleContent?: ReactNode;
  className?: string;
  /** Extra classes for the search form (the categories page makes it stick to the top). */
  formClassName?: string;
}) {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const rawHistory = useSyncExternalStore(subscribeHistory, getHistorySnapshot, getServerHistorySnapshot);
  const history = useMemo(() => parseHistory(rawHistory), [rawHistory]);
  const [live, setLive] = useState<Live | null>(null);
  const [failedQuery, setFailedQuery] = useState<string | null>(null);

  const typed = query.trim();
  const showResults = typed.length >= MIN_LIVE_LENGTH;
  const liveFailed = showResults && failedQuery === typed;
  const liveLoading = showResults && !liveFailed && live?.q !== typed;

  // Debounced live results; each keystroke cancels the previous request.
  useEffect(() => {
    if (typed.length < MIN_LIVE_LENGTH) return;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch(`/api/search/suggest?q=${encodeURIComponent(typed)}`, {
          signal: controller.signal,
        });
        if (!response.ok) throw new Error("search failed");
        const data = (await response.json()) as Omit<Live, "q">;
        setLive({ q: typed, total: data.total, items: data.items, categories: data.categories, brands: data.brands ?? [] });
        setFailedQuery(null);
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setFailedQuery(typed);
      }
    }, 250);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [typed]);

  const remember = (raw: string) => {
    const term = raw.trim();
    if (!term) return;
    writeHistory([term, ...parseHistory(getHistorySnapshot()).filter((item) => item !== term)].slice(0, MAX_HISTORY));
  };
  const removeFromHistory = (term: string) => writeHistory(parseHistory(getHistorySnapshot()).filter((item) => item !== term));
  const leave = (term?: string) => {
    if (term) remember(term);
    inputRef.current?.blur();
    onNavigate?.();
  };

  const visibleHistory = typed ? history.filter((item) => item.includes(typed)) : history;

  return (
    <div className={className}>
      <Form
        action="/search"
        role="search"
        className={`relative ${formClassName}`}
        onSubmit={() => {
          remember(query);
          inputRef.current?.blur();
          onNavigate?.();
        }}
      >
        <label htmlFor={inputId} className="sr-only">
          جستجو در محصولات، برندها و دسته‌بندی‌ها
        </label>
        <input
          ref={inputRef}
          id={inputId}
          type="search"
          name="q"
          required
          autoFocus={autoFocus}
          autoComplete="off"
          enterKeyHint="search"
          maxLength={100}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="جستجوی محصول، برند یا دسته‌بندی"
          className="h-[50px] w-full rounded-full border border-[#d5d9dd] bg-[#e3e6e9] ps-5 pe-[86px] text-base text-ink outline-none! placeholder:text-text-secondary focus:outline-none! focus-visible:outline-none! [&::-webkit-search-cancel-button]:hidden [&::-webkit-search-cancel-button]:appearance-none [&::-webkit-search-decoration]:hidden"
        />
        {query && (
          <button
            type="button"
            aria-label="پاک کردن متن جستجو"
            onClick={() => {
              setQuery("");
              inputRef.current?.focus();
            }}
            className="absolute inset-y-1 end-[48px] flex w-[34px] items-center justify-center rounded-full text-red-500 active:bg-red-500/10"
          >
            <XIcon className="h-[20px] w-[20px]" />
          </button>
        )}
        <button
          type="submit"
          aria-label="جستجو"
          className="absolute inset-y-1 end-1 flex w-[44px] items-center justify-center rounded-full active:bg-ink/6"
        >
          <SearchIcon className="h-[24px] w-[24px] text-ink" />
        </button>
      </Form>

      <div className="mt-4">
        {showResults ? (
          <section aria-label="نتایج جستجو" aria-live="polite">
            {liveFailed ? (
              <p className="m-0 px-1 py-4 text-[0.9rem] text-text-secondary">خطا در دریافت نتایج. دوباره تلاش کنید.</p>
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
            ) : live && live.items.length === 0 && live.categories.length === 0 && live.brands.length === 0 ? (
              <p className="m-0 px-1 py-4 text-[0.9rem] text-text-secondary">نتیجه‌ای برای «{typed}» پیدا نشد.</p>
            ) : (
              live && (
                <>
                  {live.brands.length > 0 && (
                    <div className="mb-4">
                      <h3 className={SECTION_TITLE}>برندها</h3>
                      <ul className="m-0 list-none p-0">
                        {live.brands.map((brand) => (
                          <li key={brand.name}>
                            <Link href={searchHref(brand.name)} onClick={() => leave(brand.name)} className={ROW}>
                              <TagIcon className="h-[18px] w-[18px] shrink-0 text-black" />
                              <span className="min-w-0 flex-1 truncate text-[0.92rem]">
                                <span className="font-semibold">{brand.name}</span>
                                {brand.nameEn && brand.nameEn !== brand.name && (
                                  <span className="text-[0.82rem] text-text-secondary"> · {brand.nameEn}</span>
                                )}
                              </span>
                              <span className="shrink-0 text-[0.78rem] text-text-secondary">
                                {toPersianDigits(brand.productCount)} محصول
                              </span>
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {live.categories.length > 0 && (
                    <div className="mb-4">
                      <h3 className={SECTION_TITLE}>دسته‌بندی‌ها</h3>
                      <ul className="m-0 list-none p-0">
                        {live.categories.map((category) => (
                          <li key={category.slug}>
                            <Link href={`/category/${category.slug}`} onClick={() => leave()} className={ROW}>
                              <FolderIcon className="h-[18px] w-[18px] shrink-0 text-black" />
                              <span className="min-w-0 flex-1 truncate text-[0.92rem]">
                                <span className="font-semibold">{category.name}</span>
                                {category.parents.length > 0 && (
                                  <span className="text-[0.82rem] text-text-secondary"> در {category.parents.join(" › ")}</span>
                                )}
                              </span>
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {live.items.length > 0 && (
                    <>
                      <h3 className={SECTION_TITLE}>محصولات</h3>
                      <ul className="m-0 list-none p-0">
                        {live.items.map((item) => (
                          <li key={item.slug}>
                            <Link href={productHref(item.slug)} onClick={() => leave()} className="flex items-center gap-3 rounded-xl p-2 text-ink transition-colors active:bg-ink/6">
                              <span className="relative h-[60px] w-[48px] shrink-0 overflow-hidden rounded-lg bg-card-image">
                                {item.image && <Image src={item.image} alt={item.imageAlt} fill sizes="48px" className="object-cover" />}
                              </span>
                              <span className="min-w-0 flex-1">
                                <span className="block truncate text-[0.92rem] font-semibold">{item.title}</span>
                                {item.categoryPath.length > 0 && (
                                  <span className="mt-0.5 block truncate text-[0.78rem] text-text-secondary">{item.categoryPath.join(" › ")}</span>
                                )}
                                <span className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[0.85rem] text-text-secondary">
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
                        onClick={() => leave(typed)}
                        className="mt-3 flex min-h-12 items-center justify-center rounded-full bg-brand px-5 text-[0.92rem] font-semibold text-white transition-colors active:bg-brand-dark"
                      >
                        {live.total > live.items.length ? `مشاهده همه ${toPersianDigits(live.total)} نتیجه` : "مشاهده در صفحه‌ی جستجو"}
                      </Link>
                    </>
                  )}
                </>
              )
            )}
          </section>
        ) : idleContent ? (
          idleContent
        ) : (
          <>
            <section aria-label="جستجوهای پرطرفدار">
              <h3 className={`${SECTION_TITLE} mb-3`}>جستجوهای پرطرفدار</h3>
              <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
                {TRENDING_SEARCHES.map((term) => (
                  <li key={term}>
                    <Link
                      href={searchHref(term)}
                      onClick={() => leave(term)}
                      className="inline-flex min-h-11 items-center gap-2 rounded-full border border-[#dfe2e5] bg-white px-4 text-[0.9rem] text-ink active:bg-[#f0f2f4]"
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
                    <button type="button" onClick={() => writeHistory([])} className="min-h-9 px-1 text-[0.82rem] text-text-secondary">
                      پاک کردن همه
                    </button>
                  )}
                </div>
                <ul className="m-0 list-none p-0">
                  {visibleHistory.map((term) => (
                    <li key={term} className="flex items-center rounded-xl">
                      <Link href={searchHref(term)} onClick={() => leave(term)} className={`${ROW} min-w-0 flex-1`}>
                        <ClockIcon className="h-[18px] w-[18px] shrink-0 text-text-secondary" />
                        <span className="truncate text-[0.92rem]">{term}</span>
                      </Link>
                      <button
                        type="button"
                        aria-label={`حذف «${term}» از جستجوهای اخیر`}
                        onClick={() => removeFromHistory(term)}
                        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-text-secondary active:bg-ink/6"
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
  );
}
