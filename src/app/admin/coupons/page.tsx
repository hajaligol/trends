import Link from "next/link";
import { listCouponsForAdmin } from "@/domains/promotions/admin-queries";
import { CouponActiveToggle } from "@/components/admin/CouponActiveToggle";
import { formatToman } from "@/lib/utils/money";
import { toPersianDigits } from "@/lib/utils/persian-digits";

export const metadata = { title: "کدهای تخفیف", robots: { index: false, follow: false } };

export default async function AdminCouponsPage() {
  const coupons = await listCouponsForAdmin();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-[1.15rem] font-bold text-ink">کدهای تخفیف</h1>
        <Link href="/admin/coupons/new" className="rounded-full bg-ink px-5 py-2.5 text-[0.85rem] text-white hover:opacity-88">
          + کد تخفیف جدید
        </Link>
      </div>

      <div className="overflow-x-auto rounded-[var(--radius-lg)] border border-line">
        <table className="w-full min-w-[720px] text-[0.85rem]">
          <thead>
            <tr className="border-b border-line bg-header text-text-secondary">
              <th className="px-4 py-2.5 text-start font-medium">کد</th>
              <th className="px-4 py-2.5 text-start font-medium">تخفیف</th>
              <th className="px-4 py-2.5 text-start font-medium">حداقل سبد خرید</th>
              <th className="px-4 py-2.5 text-start font-medium">استفاده‌شده</th>
              <th className="px-4 py-2.5 text-start font-medium">وضعیت</th>
              <th className="px-4 py-2.5 text-start font-medium">عملیات</th>
            </tr>
          </thead>
          <tbody>
            {coupons.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-text-secondary">
                  هنوز کد تخفیفی ثبت نشده است
                </td>
              </tr>
            ) : (
              coupons.map((coupon) => (
                <tr key={coupon.id} className="border-b border-line last:border-0">
                  <td className="px-4 py-2.5 font-medium" dir="ltr">
                    {coupon.code}
                  </td>
                  <td className="px-4 py-2.5">
                    {coupon.discountType === "percentage"
                      ? `${toPersianDigits(coupon.discountValue)}٪`
                      : formatToman(coupon.discountValue)}
                  </td>
                  <td className="px-4 py-2.5">{formatToman(coupon.minBasketToman)}</td>
                  <td className="px-4 py-2.5">
                    {toPersianDigits(coupon.redemptionCount)}
                    {coupon.usageLimit ? ` / ${toPersianDigits(coupon.usageLimit)}` : ""}
                  </td>
                  <td className="px-4 py-2.5">
                    <CouponActiveToggle couponId={coupon.id} isActive={coupon.isActive} />
                  </td>
                  <td className="px-4 py-2.5">
                    <Link href={`/admin/coupons/${coupon.id}`} className="underline underline-offset-2">
                      ویرایش
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
