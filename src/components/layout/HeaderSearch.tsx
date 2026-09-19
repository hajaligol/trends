"use client";

import { useEffect, useRef, useState } from "react";
import Form from "next/form";
import Link from "next/link";
import { ClockIcon, SearchIcon, TrendingUpIcon, XIcon } from "@/components/ui/icons";
import { TRENDING_SEARCHES } from "@/lib/search/trending-searches";

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

  // Read after mount so server and first client render match.
  useEffect(() => {
    setHistory(readHistory());
  }, []);

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

  const typed = query.trim();
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
          className="h-[48px] w-full rounded-full border border-[#e2e5e8] bg-[#f0f2f4] ps-6 pe-[78px] text-[0.95rem] text-ink outline-none! placeholder:text-text-secondary focus:outline-none! focus-visible:outline-none! [&::-webkit-search-cancel-button]:hidden [&::-webkit-search-cancel-button]:appearance-none [&::-webkit-search-decoration]:hidden"
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
          </div>
        </div>
    </div>
  );
}
