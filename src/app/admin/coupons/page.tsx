import Link from "next/link";
import { listCouponsForAdmin } from "@/domains/promotions/admin-queries";
import {
  COUPON_VALIDITY_LABELS,
  countCouponsByValidity,
  couponValidity,
  filterCoupons,
  filterCouponsIgnoringValidity,
  isCouponFilterActive,
  parseCouponFilter,
  type CouponValidity,
} from "@/domains/promotions/admin-filter";
import type { RawParam } from "@/lib/utils/admin-filters";
import { CouponActiveToggle } from "@/components/admin/CouponActiveToggle";
import { formatToman } from "@/lib/utils/money";
import { toPersianDigits } from "@/lib/utils/persian-digits";
import {
  adminButton,
  buildHref,
  EmptyState,
  FilterBar,
  FilterTabs,
  PageHeader,
  SearchField,
  SelectFilter,
  StatusBadge,
  TABLE,
  TD,
  TD_MUTED,
  TableCard,
  TH,
  THEAD,
  TR,
} from "@/components/admin/ui/layout";
import { PencilIcon, PlusIcon, TicketIcon } from "@/components/admin/ui/icons";

export const metadata = { title: "کدهای تخفیف", robots: { index: false, follow: false } };

const VALIDITY_ORDER: CouponValidity[] = ["valid", "not_started", "expired", "exhausted"];
const VALIDITY_TONES = { valid: "success", not_started: "info", expired: "danger", exhausted: "warning" } as const;

export default async function AdminCouponsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: RawParam; validity?: RawParam; active?: RawParam; type?: RawParam }>;
}) {
  const filter = parseCouponFilter(await searchParams);
  const allCoupons = await listCouponsForAdmin();
  const now = new Date();
  const coupons = filterCoupons(allCoupons, filter, now);
  const isFiltered = isCouponFilterActive(filter);
  const validityCounts = countCouponsByValidity(filterCouponsIgnoringValidity(allCoupons, filter), now);
  const tabHref = (validity?: CouponValidity) => buildHref("/admin/coupons", { q: filter.q, active: filter.active, type: filter.type, validity });

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="کدهای تخفیف"
        description="کدهایی که مشتری در مرحله پرداخت وارد می‌کند. با کلید «فعال» می‌توانید یک کد را بدون حذف، موقتاً از دسترس خارج کنید."
        actions={
          <Link href="/admin/coupons/new" className={adminButton("primary", "md")}>
            <PlusIcon width={18} height={18} />
            کد تخفیف جدید
          </Link>
        }
      />

      {allCoupons.length > 0 && (
        <>
          <FilterTabs
            items={[
              { label: "همه", href: tabHref(), active: !filter.validity, count: VALIDITY_ORDER.reduce((sum, key) => sum + validityCounts[key], 0) },
              ...VALIDITY_ORDER.map((key) => ({
                label: COUPON_VALIDITY_LABELS[key],
                href: tabHref(key),
                active: filter.validity === key,
                count: validityCounts[key],
              })),
            ]}
          />
          <FilterBar resetHref="/admin/coupons" isFiltered={isFiltered} submitLabel="جستجو">
            {filter.validity && <input type="hidden" name="validity" value={filter.validity} />}
            <SearchField defaultValue={filter.q} placeholder="جستجوی کد تخفیف..." />
            <SelectFilter name="type" label="نوع تخفیف" defaultValue={filter.type}>
              <option value="">همه</option>
              <option value="percentage">درصدی</option>
              <option value="fixed">مبلغ ثابت</option>
            </SelectFilter>
            <SelectFilter name="active" label="وضعیت فعال‌سازی" defaultValue={filter.active}>
              <option value="">همه</option>
              <option value="on">فعال</option>
              <option value="off">غیرفعال</option>
            </SelectFilter>
          </FilterBar>
          {isFiltered && <p className="m-0 text-[0.82rem] text-text-secondary">{toPersianDigits(coupons.length)} کد مطابق فیلتر</p>}
        </>
      )}

      {allCoupons.length === 0 ? (
        <EmptyState
          icon={<TicketIcon width={26} height={26} />}
          title="هنوز کد تخفیفی ساخته نشده است"
          description="برای جذب مشتری جدید یا کمپین‌های فصلی، اولین کد تخفیف را بسازید."
          action={
            <Link href="/admin/coupons/new" className={adminButton("primary", "md")}>
              <PlusIcon width={18} height={18} />
              ساخت کد تخفیف
            </Link>
          }
        />
      ) : coupons.length === 0 ? (
        <EmptyState icon={<TicketIcon width={26} height={26} />} title="کدی مطابق این فیلتر پیدا نشد" description="عبارت جستجو یا فیلترها را تغییر دهید." />
      ) : (
        <TableCard>
          <table className={`${TABLE} min-w-[780px]`}>
            <thead className={THEAD}>
              <tr>
                <th className={TH}>کد</th>
                <th className={TH}>تخفیف</th>
                <th className={TH}>حداقل سبد</th>
                <th className={TH}>استفاده‌شده</th>
                <th className={TH}>اعتبار</th>
                <th className={TH}>فعال</th>
                <th className={TH}>
                  <span className="sr-only">ویرایش</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {coupons.map((coupon) => {
                const validity = couponValidity(coupon, now);
                return (
                  <tr key={coupon.id} className={TR}>
                    <td className={TD}>
                      <Link href={`/admin/coupons/${coupon.id}`} dir="ltr" className="inline-block font-bold text-ink hover:text-brand hover:underline">
                        {coupon.code}
                      </Link>
                    </td>
                    <td className={`${TD} font-semibold`}>
                      {coupon.discountType === "percentage" ? `${toPersianDigits(coupon.discountValue)}٪` : formatToman(coupon.discountValue)}
                    </td>
                    <td className={TD_MUTED}>{coupon.minBasketToman > 0 ? formatToman(coupon.minBasketToman) : "بدون حداقل"}</td>
                    <td className={TD}>
                      {toPersianDigits(coupon.redemptionCount)}
                      {coupon.usageLimit ? <span className="text-text-secondary"> / {toPersianDigits(coupon.usageLimit)}</span> : null}
                    </td>
                    <td className={TD}>
                      <StatusBadge tone={VALIDITY_TONES[validity]}>{COUPON_VALIDITY_LABELS[validity]}</StatusBadge>
                    </td>
                    <td className={TD}>
                      <CouponActiveToggle couponId={coupon.id} isActive={coupon.isActive} />
                    </td>
                    <td className={TD}>
                      <div className="flex justify-end">
                        <Link
                          href={`/admin/coupons/${coupon.id}`}
                          aria-label={`ویرایش ${coupon.code}`}
                          title="ویرایش"
                          className="grid h-9 w-9 place-items-center rounded-full text-ink transition-colors hover:bg-ink/[0.06]"
                        >
                          <PencilIcon width={17} height={17} />
                        </Link>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </TableCard>
      )}
    </div>
  );
}
