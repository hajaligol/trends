import Link from "next/link";
import { listCouponsForAdmin } from "@/domains/promotions/admin-queries";
import { CouponActiveToggle } from "@/components/admin/CouponActiveToggle";
import { formatToman } from "@/lib/utils/money";
import { toPersianDigits } from "@/lib/utils/persian-digits";
import { adminButton, EmptyState, PageHeader, StatusBadge, TABLE, TD, TD_MUTED, TableCard, TH, THEAD, TR } from "@/components/admin/ui/layout";
import { PencilIcon, PlusIcon, TicketIcon } from "@/components/admin/ui/icons";

export const metadata = { title: "کدهای تخفیف", robots: { index: false, follow: false } };

export default async function AdminCouponsPage() {
  const coupons = await listCouponsForAdmin();
  const now = new Date();

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

      {coupons.length === 0 ? (
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
                const expired = coupon.endsAt !== null && coupon.endsAt < now;
                const notStarted = coupon.startsAt !== null && coupon.startsAt > now;
                const exhausted = coupon.usageLimit !== null && coupon.redemptionCount >= coupon.usageLimit;
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
                      {expired ? (
                        <StatusBadge tone="danger">منقضی‌شده</StatusBadge>
                      ) : exhausted ? (
                        <StatusBadge tone="warning">سقف پر شده</StatusBadge>
                      ) : notStarted ? (
                        <StatusBadge tone="info">شروع نشده</StatusBadge>
                      ) : (
                        <StatusBadge tone="success">معتبر</StatusBadge>
                      )}
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
