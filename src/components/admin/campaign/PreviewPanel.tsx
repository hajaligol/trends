"use client";

import { useEffect, useState } from "react";
import { previewCampaignAction } from "@/domains/campaigns/admin-actions";
import type { CampaignPreview } from "@/domains/campaigns/admin-queries";
import { formatToman } from "@/lib/utils/money";
import { toPersianDigits } from "@/lib/utils/persian-digits";
import { AlertTriangleIcon } from "@/components/admin/ui/icons";

type Result = { ok: true; data: CampaignPreview } | { ok: false; message: string };

/** Debounced "who does this cover?" panel. `payload` is null until the offer
 * and scope are complete enough to preview. The answer is stored together
 * with the payload it was computed for, so "loading" is simply "the stored
 * answer is for an older payload" — no synchronous state updates in effects. */
export function PreviewPanel({ payload }: { payload: string | null }) {
  const [answer, setAnswer] = useState<{ key: string; result: Result } | null>(null);

  useEffect(() => {
    if (!payload) return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      let result: Result;
      try {
        const response = await previewCampaignAction(payload);
        result = response.ok ? { ok: true, data: response.data } : { ok: false, message: response.error };
      } catch {
        result = { ok: false, message: "پیش‌نمایش در دسترس نیست" };
      }
      if (!cancelled) setAnswer({ key: payload, result });
    }, 600);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [payload]);

  const state: { status: "idle" } | { status: "loading" } | { status: "error"; message: string } | { status: "ready"; data: CampaignPreview } = !payload
    ? { status: "idle" }
    : answer?.key !== payload
      ? { status: "loading" }
      : answer.result.ok
        ? { status: "ready", data: answer.result.data }
        : { status: "error", message: answer.result.message };

  return (
    <div aria-live="polite" className="flex flex-col gap-3 text-[0.82rem] leading-6">
      {state.status === "idle" && <p className="m-0 text-text-secondary">با تکمیل تنظیمات تخفیف و انتخاب محصولات، اینجا می‌بینید کمپین روی چه محصولاتی اعمال می‌شود.</p>}
      {state.status === "loading" && <p className="m-0 text-text-secondary">در حال محاسبه…</p>}
      {state.status === "error" && <p className="m-0 text-text-secondary">{state.message}</p>}
      {state.status === "ready" && (
        <>
          <p className="m-0 text-ink">
            این کمپین روی <b>{toPersianDigits(state.data.matchedCount)}</b> محصول از {toPersianDigits(state.data.activeProductCount)} محصول فعال اعمال می‌شود.
          </p>
          {state.data.matchedCount === 0 && (
            <p className="m-0 flex items-start gap-2 rounded-[var(--radius-sm)] bg-yellow/40 px-3 py-2 text-ink">
              <AlertTriangleIcon width={16} height={16} className="mt-1 shrink-0" />
              هیچ محصول فعالی مشمول نیست.
            </p>
          )}
          {state.data.sample.length > 0 && (
            <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
              {state.data.sample.map((item) => (
                <li key={item.productCode} className="flex items-center justify-between gap-3 border-b border-line pb-1.5 last:border-0">
                  <span className="truncate text-ink">{item.title}</span>
                  {item.regularPriceToman !== null && (
                    <span className="shrink-0 text-[0.76rem]">
                      {item.salePriceToman !== null && item.salePriceToman < item.regularPriceToman ? (
                        <>
                          <span className="text-text-secondary line-through">{formatToman(item.regularPriceToman)}</span>{" "}
                          <b className="text-brand-dark">{formatToman(item.salePriceToman)}</b>
                        </>
                      ) : (
                        <span className="text-text-secondary">از {formatToman(item.regularPriceToman)}</span>
                      )}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
          {state.data.overlapNames.length > 0 && (
            <p className="m-0 flex items-start gap-2 rounded-[var(--radius-sm)] bg-yellow/40 px-3 py-2 text-ink">
              <AlertTriangleIcon width={16} height={16} className="mt-1 shrink-0" />
              <span>
                روی بخشی از همین محصولات کمپین فعال دیگری هم هست: <b>{state.data.overlapNames.join("، ")}</b>. در تداخل، پیشنهادی که برای مشتری سودمندتر باشد اعمال می‌شود
                (مگر هر دو «قابل ترکیب» باشند).
              </span>
            </p>
          )}
        </>
      )}
    </div>
  );
}
