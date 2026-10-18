"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useRef, useState, type KeyboardEvent, type FormEvent } from "react";
import { createProductAction } from "@/domains/catalog/admin-actions";
import type { ActionResult } from "@/domains/auth/roles";
import type { CategoryPickerNode } from "@/domains/categories/queries";
import type { BrandOption } from "@/domains/brands/queries";
import { toPersianDigits } from "@/lib/utils/persian-digits";
import { CategoryCascadeSelect } from "@/components/admin/CategoryCascadeSelect";
import { ProductSizeChartEditor } from "@/components/admin/ProductSizeChartEditor";
import { ProductSpecificationsEditor } from "@/components/admin/ProductSpecificationsEditor";
import { TitleAndSlug } from "@/components/admin/ProductTitleAndSlug";
import { VariantMatrixBuilder, type VariantMatrixSummary } from "@/components/admin/VariantMatrixBuilder";
import { ReviewRow, WizardFooter, WizardPanel, WizardStepper, useWizard } from "@/components/admin/ui/wizard";
import {
  AdminSubmitButton,
  FieldGrid,
  FormAlert,
  SelectField,
  SwitchField,
  TextareaField,
  TextField,
  useAdminAction,
} from "@/components/admin/ui/form";
import { ProductImagesStep } from "./ProductImagesStep";
import {
  PRODUCT_STEPS,
  countSizeChartRows,
  countSpecRows,
  firstInvalidProductStep,
  imagesToJson,
  validateProductStep,
  type DraftImage,
  type ProductWizardValues,
} from "./validation";

const initialState: ActionResult<{ id: string }> = { ok: true, data: { id: "" } };
const EMPTY_VARIANTS: VariantMatrixSummary = { rowCount: 0, colorNames: [], incomplete: false, sizes: [] };

type Snapshot = ProductWizardValues & {
  brandId: string;
  tags: string;
  isActive: boolean;
  isFeatured: boolean;
  isNewArrival: boolean;
};

const BLANK_SNAPSHOT: Snapshot = {
  title: "",
  shortDescription: "",
  longDescription: "",
  categoryId: "",
  brandId: "",
  tags: "",
  seoTitle: "",
  seoDescription: "",
  isActive: true,
  isFeatured: false,
  isNewArrival: false,
  variants: { rowCount: 0, colorNames: [], incomplete: false },
  images: [],
  specRows: [],
  sizeChart: { columns: [], cells: [], note: "" },
};

function categoryPath(nodes: CategoryPickerNode[], id: string): string {
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const parts: string[] = [];
  for (let node = byId.get(id); node; node = node.parentId ? byId.get(node.parentId) : undefined) parts.unshift(node.name);
  return parts.join(" ‹ ");
}

/**
 * «محصول جدید» as a six-stage flow: basics → category/brand → sizes & colours
 * → photos → display & SEO → review. One `<form>`, all panels stay mounted,
 * and a single `createProductAction` call at the end creates the product, its
 * variants and its photos in one transaction. Stage checks are only a UX
 * convenience; the action re-validates everything.
 */
export function ProductCreateWizard({ categoryNodes, brandOptions }: { categoryNodes: CategoryPickerNode[]; brandOptions: BrandOption[] }) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const wizard = useWizard({ count: PRODUCT_STEPS.length });
  const [variants, setVariants] = useState<VariantMatrixSummary>(EMPTY_VARIANTS);
  const [images, setImages] = useState<DraftImage[]>([]);
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);

  const [state, formAction] = useAdminAction(createProductAction, initialState, {
    successMessage: "محصول ساخته شد",
    onSuccess: (result) => {
      if (result.ok && result.data.id) router.push(`/admin/products/${result.data.id}`);
    },
  });

  const read = useCallback((): Snapshot => {
    const data = formRef.current ? new FormData(formRef.current) : new FormData();
    const text = (name: string) => String(data.get(name) ?? "");
    return {
      title: text("title"),
      shortDescription: text("shortDescription"),
      longDescription: text("longDescription"),
      categoryId: text("categoryId"),
      brandId: text("brandId"),
      tags: text("tags"),
      seoTitle: text("seoTitle"),
      seoDescription: text("seoDescription"),
      isActive: data.get("isActive") !== null,
      isFeatured: data.get("isFeatured") !== null,
      isNewArrival: data.get("isNewArrival") !== null,
      variants: { rowCount: variants.rowCount, colorNames: variants.colorNames, incomplete: variants.incomplete },
      images,
      specRows: data.getAll("specLabel").map((label, index) => ({ label: String(label), value: String(data.getAll("specValue")[index] ?? "") })),
      sizeChart: {
        columns: data.getAll("sizeChartColumn").map(String),
        cells: data.getAll("sizeChartCell").map(String),
        note: text("sizeChartNote"),
      },
    };
  }, [variants, images]);

  const onVariantsChange = useCallback((summary: VariantMatrixSummary) => setVariants(summary), []);

  function goNext() {
    const values = read();
    setSnapshot(values);
    wizard.next(() => validateProductStep(PRODUCT_STEPS[wizard.step]?.id ?? "review", values));
  }

  function select(target: number) {
    // Leaving a stage forward through the stepper is checked too.
    if (target > wizard.step) {
      const values = read();
      for (let index = wizard.step; index < target; index += 1) {
        const error = validateProductStep(PRODUCT_STEPS[index]?.id ?? "review", values);
        if (error) {
          wizard.goTo(index);
          wizard.setStepError(error);
          return;
        }
      }
    }
    setSnapshot(read());
    wizard.select(target);
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    // Only the last stage can save; Enter in an earlier stage must not.
    if (!wizard.isLast) {
      event.preventDefault();
      return;
    }
    const problem = firstInvalidProductStep(read());
    if (problem) {
      event.preventDefault();
      wizard.goTo(problem.index);
      wizard.setStepError(problem.error);
    }
  }

  function onKeyDown(event: KeyboardEvent<HTMLFormElement>) {
    const target = event.target as HTMLElement;
    if (event.key !== "Enter" || target.tagName !== "INPUT") return;
    const type = (target as HTMLInputElement).type;
    if (type === "checkbox" || type === "radio" || type === "submit" || type === "button") return;
    event.preventDefault(); // Enter advances nothing by itself; use «ادامه».
  }

  const review = snapshot ?? BLANK_SNAPSHOT;
  const brandName = brandOptions.find((option) => option.id === review.brandId)?.name;
  const flags = [review.isActive && "فعال", review.isFeatured && "ویژه", review.isNewArrival && "جدید"].filter(Boolean).join("، ");

  const panel = (index: number, title: string, description: string, children: React.ReactNode) => (
    <WizardPanel
      active={wizard.step === index}
      index={index}
      total={PRODUCT_STEPS.length}
      title={title}
      description={description}
      headingRef={wizard.headingRef}
      error={wizard.stepError}
    >
      {children}
    </WizardPanel>
  );

  return (
    <form ref={formRef} action={formAction} noValidate onSubmit={onSubmit} onKeyDown={onKeyDown} className="flex flex-col gap-5">
      <input type="hidden" name="imagesJson" value={imagesToJson(images)} />
      <WizardStepper
        label="مراحل ساخت محصول"
        steps={[...PRODUCT_STEPS]}
        current={wizard.step}
        maxReached={wizard.maxReached}
        onSelect={select}
      />
      <FormAlert state={state} />

      {panel(
        0,
        "اطلاعات اصلی",
        "عنوان و توضیحاتی که مشتری در صفحه محصول می‌بیند.",
        <>
          <TitleAndSlug />
          <TextField label="توضیح کوتاه" name="shortDescription" optional hint="یک جمله برای کارت محصول و نتایج جستجو." />
          <TextareaField label="توضیح کامل" name="longDescription" optional rows={6} />
        </>,
      )}

      {panel(
        1,
        "دسته‌بندی و برند",
        "محصول فقط در آخرین سطح درخت دسته‌بندی (نوع) ثبت می‌شود. برند از فهرست برندهای ثبت‌شده انتخاب می‌شود.",
        <>
          <CategoryCascadeSelect nodes={categoryNodes} />
          <SelectField
            label="برند"
            name="brandId"
            defaultValue=""
            optional
            hint={brandOptions.length === 0 ? "هنوز برندی ثبت نشده است." : "فقط از میان برندهای ثبت‌شده انتخاب می‌شود."}
          >
            <option value="">بدون برند</option>
            {brandOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.name}
                {option.isActive ? "" : " (غیرفعال)"}
              </option>
            ))}
          </SelectField>
          <Link href="/admin/brands" target="_blank" className="-mt-2 w-fit text-[0.78rem] text-brand hover:underline">
            مدیریت برندها (در تب جدید)
          </Link>
          <TextField label="برچسب‌ها" name="tags" optional placeholder="پاییزه, پنبه" hint="با کاما جدا کنید." />
        </>,
      )}

      {panel(
        2,
        "سایز و رنگ",
        "چند سایز و چند رنگ را یکجا انتخاب کنید؛ هر ترکیب یک نوع جداگانه با کد کالای (SKU) خودکار می‌شود. این مرحله اختیاری است و بعداً هم می‌توانید انواع را اضافه کنید.",
        <VariantMatrixBuilder onSummaryChange={onVariantsChange} />,
      )}

      {panel(
        3,
        "تصاویر",
        "عکس‌های محصول را بارگذاری کنید. می‌توانید هر عکس را به یکی از رنگ‌های مرحله‌ی قبل اختصاص دهید.",
        <ProductImagesStep images={images} onChange={setImages} colorNames={variants.colorNames} />,
      )}

      {panel(
        4,
        "جدول مشخصات",
        "برند، دسته‌بندی، جنس، سایزها، رنگ‌ها و برچسب‌ها خودکار در جدول مشخصات صفحه‌ی محصول نمایش داده می‌شوند. ردیف‌های زیر (مثلاً «قد مدل») به انتهای جدول اضافه می‌شوند. این مرحله اختیاری است.",
        <ProductSpecificationsEditor embedded initialRows={[]} />,
      )}

      {panel(
        5,
        "جدول سایز",
        "کنار انتخاب سایز، دکمه‌ی «راهنمای سایز» نمایش داده می‌شود و این جدول را باز می‌کند. با انتخاب قالب، ستون سایز از سایزهای مرحله‌ی «سایز و رنگ» پر می‌شود. اگر جدولی ثبت نکنید، دکمه نمایش داده نمی‌شود. اختیاری.",
        <ProductSizeChartEditor embedded variantSizes={variants.sizes} initialChart={null} initialNote={null} />,
      )}

      {panel(
        6,
        "نمایش و سئو",
        "تعیین کنید محصول کجا نمایش داده شود و در گوگل چگونه دیده شود.",
        <>
          <div className="grid gap-3 md:grid-cols-3">
            <SwitchField name="isActive" label="فعال" description="غیرفعال‌ها در فروشگاه دیده نمی‌شوند." defaultChecked />
            <SwitchField name="isFeatured" label="محصول ویژه" description="در بخش «شگفت‌انگیزها» صفحه اصلی." />
            <SwitchField name="isNewArrival" label="جدید" description="در بخش «جدیدترین محصولات»." />
          </div>
          <p className="m-0 text-[0.8rem] font-bold text-ink">سئو (نمایش در گوگل)</p>
          <FieldGrid>
            <TextField label="عنوان سئو" name="seoTitle" optional hint="اگر خالی بماند از عنوان محصول استفاده می‌شود." />
            <TextField label="توضیح سئو" name="seoDescription" optional hint="اگر خالی بماند از توضیح کوتاه استفاده می‌شود." />
          </FieldGrid>
        </>,
      )}

      {panel(
        7,
        "مرور و ساخت",
        "همه‌چیز را یک بار مرور کنید. با زدن «ساخت محصول» محصول، انواع و تصاویر یکجا ساخته می‌شوند؛ کد کالا و آدرس صفحه خودکار ایجاد می‌شوند.",
        <>
          <dl className="m-0 flex flex-col">
            <ReviewRow label="عنوان">{review.title.trim() || "—"}</ReviewRow>
            <ReviewRow label="دسته‌بندی">{review.categoryId ? categoryPath(categoryNodes, review.categoryId) : "—"}</ReviewRow>
            <ReviewRow label="برند">{brandName ?? "بدون برند"}</ReviewRow>
            <ReviewRow label="انواع">
              {review.variants.rowCount > 0
                ? `${toPersianDigits(review.variants.rowCount)} نوع (${toPersianDigits(variants.sizes.length)} سایز × ${toPersianDigits(review.variants.colorNames.length)} رنگ)`
                : "ثبت نشده"}
            </ReviewRow>
            <ReviewRow label="تصاویر">{review.images.length > 0 ? `${toPersianDigits(review.images.length)} تصویر` : "ثبت نشده"}</ReviewRow>
            <ReviewRow label="جدول مشخصات">
              {countSpecRows(review) > 0 ? `${toPersianDigits(countSpecRows(review))} ردیف سفارشی` : "ثبت نشده"}
            </ReviewRow>
            <ReviewRow label="جدول سایز">
              {countSizeChartRows(review) > 0 ? `${toPersianDigits(countSizeChartRows(review))} ردیف` : "ثبت نشده"}
            </ReviewRow>
            <ReviewRow label="نمایش">{flags || "غیرفعال"}</ReviewRow>
          </dl>
          {review.variants.rowCount === 0 && (
            <p className="m-0 rounded-[var(--radius-md)] border border-amber-200 bg-amber-50 px-4 py-3 text-[0.82rem] leading-6 text-amber-900">
              هنوز سایز و رنگی ثبت نشده است. محصول بدون نوع قابل خرید نیست؛ می‌توانید به مرحله‌ی «سایز و رنگ» برگردید یا بعد از ساخت در صفحه‌ی ویرایش اضافه کنید.
            </p>
          )}
          {review.images.length === 0 && (
            <p className="m-0 rounded-[var(--radius-md)] border border-amber-200 bg-amber-50 px-4 py-3 text-[0.82rem] leading-6 text-amber-900">
              تصویری اضافه نشده است؛ محصول بدون عکس در فروشگاه ناقص دیده می‌شود.
            </p>
          )}
          {!review.isActive && (
            <p className="m-0 rounded-[var(--radius-md)] border border-line bg-bg px-4 py-3 text-[0.82rem] leading-6 text-text-secondary">
              محصول غیرفعال ساخته می‌شود و تا فعال‌کردن در فروشگاه دیده نمی‌شود.
            </p>
          )}
        </>,
      )}

      <WizardFooter
        isFirst={wizard.isFirst}
        isLast={wizard.isLast}
        onBack={wizard.back}
        onNext={goNext}
        hint="کد کالا و آدرس صفحه محصول بعد از ساخت به‌صورت خودکار ایجاد می‌شوند."
        submit={<AdminSubmitButton pendingLabel="در حال ساخت...">ساخت محصول</AdminSubmitButton>}
      />
    </form>
  );
}
