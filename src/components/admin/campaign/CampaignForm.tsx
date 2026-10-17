"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/feedback/ToastProvider";
import { saveCampaignAction } from "@/domains/campaigns/admin-actions";
import type { AdminCampaignDetail, PickerBrand, PickerCategory } from "@/domains/campaigns/admin-queries";
import { parseCampaignConfig } from "@/domains/campaigns/config";
import { describeDefinition, KIND_META } from "@/domains/campaigns/labels";
import type { CampaignKind } from "@/lib/db/schema/campaigns";
import { dateToTehranInput } from "@/lib/utils/tehran-time";
import { FormAlert, SelectField, Spinner, TextField, TextareaField } from "@/components/admin/ui/form";
import { ImagePicker } from "@/components/admin/ImagePicker";
import { adminButton, Card } from "@/components/admin/ui/layout";
import { ConfigFields } from "./ConfigFields";
import { draftFromDefinition, draftToConfig, type Draft } from "./draft";
import { KindPicker } from "./KindPicker";
import { PreviewPanel } from "./PreviewPanel";
import { ScopePicker, type Scope } from "./ScopePicker";

function Switch({ checked, onChange, label, description }: { checked: boolean; onChange: (value: boolean) => void; label: string; description: string }) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-4 rounded-[var(--radius-md)] border border-line bg-white p-4 transition-colors hover:border-ink/25 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-brand/50">
      <span className="flex flex-col gap-0.5">
        <span className="text-[0.88rem] font-medium text-ink">{label}</span>
        <span className="text-[0.78rem] leading-5 text-text-secondary">{description}</span>
      </span>
      <input type="checkbox" role="switch" checked={checked} onChange={(event) => onChange(event.target.checked)} className="peer sr-only" />
      <span
        aria-hidden="true"
        className="relative mt-0.5 h-6 w-11 shrink-0 rounded-full bg-ink/20 transition-colors after:absolute after:start-0.5 after:top-0.5 after:h-5 after:w-5 after:rounded-full after:bg-white after:shadow-sm after:transition-[inset-inline-start] peer-checked:bg-brand peer-checked:after:start-[1.375rem]"
      />
    </label>
  );
}

function Step({ n, title, children, description }: { n: number; title: string; description?: string; children: React.ReactNode }) {
  return (
    <Card title={`${new Intl.NumberFormat("fa-IR").format(n)}. ${title}`} description={description}>
      {children}
    </Card>
  );
}

export function CampaignForm({
  campaign,
  brands,
  categories,
}: {
  campaign: AdminCampaignDetail | null;
  brands: PickerBrand[];
  categories: PickerCategory[];
}) {
  const router = useRouter();
  const { showToast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [kind, setKind] = useState<CampaignKind>(campaign?.row.kind ?? "percent_off");
  const [draft, setDraft] = useState<Draft>(() => draftFromDefinition(campaign?.definition ?? null));
  const [scope, setScope] = useState<Scope>({
    appliesToAll: campaign?.row.appliesToAll ?? false,
    brandIds: campaign?.brandIds ?? [],
    categoryIds: campaign?.categoryIds ?? [],
    products: campaign?.products ?? [],
    excludedProducts: campaign?.excludedProducts ?? [],
  });
  const [name, setName] = useState(campaign?.row.name ?? "");
  const [description, setDescription] = useState(campaign?.row.description ?? "");
  const [startsAt, setStartsAt] = useState(dateToTehranInput(campaign?.row.startsAt ?? null));
  const [endsAt, setEndsAt] = useState(dateToTehranInput(campaign?.row.endsAt ?? null));
  const [showCountdown, setShowCountdown] = useState(campaign?.row.showCountdown ?? false);
  const [stackable, setStackable] = useState(campaign?.row.stackable ?? false);
  const [isActive, setIsActive] = useState(campaign?.row.isActive ?? true);
  const [homePlacement, setHomePlacement] = useState<"none" | "hero" | "banner">(campaign?.row.homePlacement ?? "none");
  const [homeImageUrl, setHomeImageUrl] = useState(campaign?.row.homeImageUrl ?? "");
  const [homeBannerTone, setHomeBannerTone] = useState<"pink" | "blue">(campaign?.row.homeBannerTone ?? "pink");
  const [homeTitle, setHomeTitle] = useState(campaign?.row.homeTitle ?? "");
  const [homeDescription, setHomeDescription] = useState(campaign?.row.homeDescription ?? "");
  const [homeCtaLabel, setHomeCtaLabel] = useState(campaign?.row.homeCtaLabel ?? "");

  const config = useMemo(() => draftToConfig(kind, draft), [kind, draft]);
  const parsedConfig = useMemo(() => parseCampaignConfig(kind, config), [kind, config]);
  const hasTargets = scope.appliesToAll || scope.brandIds.length + scope.categoryIds.length + scope.products.length > 0;

  const scopePayload = {
    appliesToAll: scope.appliesToAll,
    brandIds: scope.brandIds,
    categoryIds: scope.categoryIds,
    productIds: scope.products.map((p) => p.id),
    excludedProductIds: scope.excludedProducts.map((p) => p.id),
  };

  const previewPayload = useMemo(
    () =>
      parsedConfig.ok && hasTargets
        ? JSON.stringify({ kind, config, ...scopePayload, excludeCampaignId: campaign?.row.id ?? null })
        : null,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [parsedConfig.ok, hasTargets, kind, config, scope, campaign?.row.id],
  );

  function save() {
    setError(null);
    const payload = JSON.stringify({
      name,
      description: description.trim() === "" ? null : description,
      kind,
      config,
      ...scopePayload,
      stackable,
      showCountdown,
      isActive,
      homePlacement,
      homeImageUrl: homePlacement === "none" ? null : homeImageUrl || null,
      homeBannerTone,
      homeTitle: homeTitle.trim() || null,
      homeDescription: homeDescription.trim() || null,
      homeCtaLabel: homeCtaLabel.trim() || null,
      startsAt: startsAt || null,
      endsAt: endsAt || null,
    });
    startTransition(async () => {
      const result = await saveCampaignAction(payload, campaign?.row.id ?? null);
      if (!result.ok) {
        setError(result.error);
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }
      showToast(campaign ? "کمپین ذخیره شد" : "کمپین ایجاد شد");
      router.push("/admin/campaigns");
      router.refresh();
    });
  }

  const summary = parsedConfig.ok ? describeDefinition(parsedConfig.definition) : null;

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_21rem]">
      <div className="flex min-w-0 flex-col gap-5">
        {error && <FormAlert state={{ ok: false, error } as { ok: boolean }} />}

        <Step n={1} title="نوع کمپین" description="چه نوع پیشنهادی می‌خواهید بدهید؟ هر نوع فقط فیلدهای لازم خودش را نشان می‌دهد.">
          <KindPicker value={kind} onChange={setKind} />
        </Step>

        <Step n={2} title="تنظیمات تخفیف" description={KIND_META[kind].description}>
          <ConfigFields kind={kind} draft={draft} onChange={(patch) => setDraft((current) => ({ ...current, ...patch }))} />
          {!parsedConfig.ok && <p className="m-0 mt-3 text-[0.78rem] text-text-secondary">برای ادامه: {parsedConfig.error}</p>}
        </Step>

        <Step n={3} title="شامل چه محصولاتی؟" description="کمپین را روی کل فروشگاه یا فقط روی برند، دسته‌بندی یا محصولات انتخابی اعمال کنید.">
          <ScopePicker scope={scope} onChange={(patch) => setScope((current) => ({ ...current, ...patch }))} brands={brands} categories={categories} />
        </Step>

        <Step
          n={4}
          title="نمایش در صفحه اصلی"
          description="کمپین را می‌توانید در صفحه اصلی تبلیغ کنید. با کلیک روی آن، مشتری به صفحه محصولات همین کمپین می‌رود."
        >
          <div className="flex flex-col gap-4">
            <fieldset className="m-0 grid min-w-0 gap-2.5 border-0 p-0 sm:grid-cols-3">
              <legend className="sr-only">نحوه نمایش در صفحه اصلی</legend>
              {(
                [
                  ["none", "بدون نمایش", "فقط تخفیف اعمال می‌شود."],
                  ["hero", "اسلاید اصلی", "یک تصویر بزرگ در اسلایدر بالای صفحه."],
                  ["banner", "بنر تبلیغاتی", "کارت پاستلی با عنوان، توضیح و دکمه."],
                ] as const
              ).map(([value, title, text]) => (
                <label
                  key={value}
                  className={`flex cursor-pointer flex-col gap-0.5 rounded-[var(--radius-md)] border p-3.5 transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-brand/50 ${
                    homePlacement === value ? "border-brand bg-lavender/30 shadow-[0_0_0_1px_var(--color-brand)]" : "border-line bg-white hover:border-ink/30"
                  }`}
                >
                  <input
                    type="radio"
                    name="campaign-home-placement"
                    className="sr-only"
                    checked={homePlacement === value}
                    onChange={() => setHomePlacement(value)}
                  />
                  <span className="text-[0.9rem] font-semibold text-ink">{title}</span>
                  <span className="text-[0.76rem] leading-5 text-text-secondary">{text}</span>
                </label>
              ))}
            </fieldset>

            {homePlacement !== "none" && (
              <div className="flex flex-col gap-4 rounded-[var(--radius-md)] border border-line bg-header-bg/40 p-4">
                <ImagePicker
                  // Remount when the placement changes so the picker's folder/shape follow it.
                  key={homePlacement}
                  name="campaign-home-image"
                  folder={homePlacement === "hero" ? "hero" : "banners"}
                  label={homePlacement === "hero" ? "تصویر اسلاید" : "تصویر بنر"}
                  shape="wide"
                  required
                  defaultValue={homeImageUrl}
                  onChange={setHomeImageUrl}
                  hint={homePlacement === "hero" ? "پیشنهاد: تصویر عریض با نسبت حدود ۲۱ به ۸." : "تصویر کنار متن بنر نمایش داده می‌شود."}
                />
                {homePlacement === "banner" && (
                  <div className="flex flex-col gap-4">
                    <SelectField label="رنگ بنر" name="campaign-home-tone" value={homeBannerTone} onChange={(e) => setHomeBannerTone(e.target.value as "pink" | "blue")}>
                      <option value="pink">صورتی</option>
                      <option value="blue">آبی</option>
                    </SelectField>
                    <TextField
                      label="عنوان بنر"
                      name="campaign-home-title"
                      optional
                      maxLength={120}
                      placeholder={name.trim() || "پیش‌فرض: نام کمپین"}
                      value={homeTitle}
                      onChange={(e) => setHomeTitle(e.target.value)}
                    />
                    <TextareaField
                      label="توضیح بنر"
                      name="campaign-home-description"
                      optional
                      rows={2}
                      maxLength={400}
                      placeholder={description.trim() || summary || "پیش‌فرض: توضیح کمپین یا خلاصه تخفیف"}
                      value={homeDescription}
                      onChange={(e) => setHomeDescription(e.target.value)}
                    />
                    <TextField
                      label="متن دکمه"
                      name="campaign-home-cta"
                      optional
                      maxLength={60}
                      placeholder="مشاهده محصولات"
                      value={homeCtaLabel}
                      onChange={(e) => setHomeCtaLabel(e.target.value)}
                    />
                  </div>
                )}
                <p className="m-0 text-[0.78rem] leading-6 text-text-secondary">
                  فقط تا وقتی کمپین <b className="text-ink">فعال و در بازه زمانی خودش</b> باشد در صفحه اصلی دیده می‌شود (قبل از شروع و بعد از پایان، خودکار حذف می‌شود).{" "}
                  {campaign ? (
                    <>
                      لینک: <span dir="ltr" className="font-mono">/sale/{campaign.row.slug}</span>
                    </>
                  ) : (
                    "صفحه محصولات کمپین هنگام ذخیره به‌صورت خودکار ساخته می‌شود."
                  )}
                </p>
              </div>
            )}
          </div>
        </Step>

        <Step n={5} title="زمان‌بندی" description="زمان‌ها به وقت تهران است. خالی گذاشتن شروع = از همین حالا؛ خالی گذاشتن پایان = تا زمانی که دستی متوقف کنید.">
          <div className="flex flex-col gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField label="شروع" name="campaign-starts" type="datetime-local" optional value={startsAt} onChange={(e) => setStartsAt(e.target.value)} />
              <TextField label="پایان" name="campaign-ends" type="datetime-local" optional value={endsAt} onChange={(e) => setEndsAt(e.target.value)} />
            </div>
            <Switch
              checked={showCountdown}
              onChange={setShowCountdown}
              label="نمایش شمارش معکوس"
              description="در صفحه محصول زمان باقی‌مانده تا پایان کمپین نمایش داده می‌شود (نیازمند زمان پایان)."
            />
          </div>
        </Step>

        <Step n={6} title="نام و قوانین">
          <div className="flex flex-col gap-4">
            <TextField
              label="نام کمپین (نمایش به مشتری)"
              name="campaign-name"
              required
              maxLength={60}
              placeholder="مثلاً حراج پاییزه"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <TextareaField
              label="توضیح کوتاه"
              name="campaign-description"
              optional
              rows={2}
              maxLength={160}
              hint="در صفحه محصول زیر نام کمپین نمایش داده می‌شود."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
            <Switch
              checked={stackable}
              onChange={setStackable}
              label="قابل ترکیب با سایر کمپین‌ها"
              description="به‌طور پیش‌فرض کالایی که از یک کمپین تخفیف گرفته، در کمپین دیگری شرکت نمی‌کند. فقط وقتی هر دو کمپین «قابل ترکیب» باشند، تخفیف‌ها روی هم اعمال می‌شوند."
            />
            <Switch checked={isActive} onChange={setIsActive} label="کمپین فعال باشد" description="با خاموش کردن، کمپین بدون حذف متوقف می‌شود." />
          </div>
        </Step>
      </div>

      <aside className="flex flex-col gap-4 lg:sticky lg:top-4">
        <Card title="خلاصه کمپین">
          <div className="flex flex-col gap-2 text-[0.84rem] leading-6">
            <p className="m-0 font-semibold text-ink">{name.trim() || "بدون نام"}</p>
            <p className="m-0 text-brand-dark">{KIND_META[kind].title}</p>
            <p className="m-0 text-text-secondary">{summary ?? "تنظیمات تخفیف هنوز کامل نیست"}</p>
            <p className="m-0 text-text-secondary">
              {scope.appliesToAll ? "دامنه: کل فروشگاه" : hasTargets ? "دامنه: موارد انتخابی" : "دامنه: هنوز چیزی انتخاب نشده"}
            </p>
          </div>
        </Card>
        <Card title="پیش‌نمایش اثر">
          <PreviewPanel payload={previewPayload} />
        </Card>
        <div className="flex flex-col gap-2">
          <button type="button" onClick={save} disabled={isPending} aria-busy={isPending} className={adminButton("primary", "md", "w-full justify-center")}>
            {isPending && <Spinner />}
            {isPending ? "در حال ذخیره..." : campaign ? "ذخیره تغییرات" : "ایجاد کمپین"}
          </button>
          <p className="m-0 text-center text-[0.76rem] leading-5 text-text-secondary">قیمت‌ها در فروشگاه تا چند دقیقه بعد از ذخیره به‌روز می‌شوند؛ سبد خرید و پرداخت همیشه آخرین وضعیت را دارند.</p>
        </div>
      </aside>
    </div>
  );
}
