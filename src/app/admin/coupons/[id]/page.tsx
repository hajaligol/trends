import { notFound } from "next/navigation";
import { getCouponByIdForAdmin } from "@/domains/promotions/admin-queries";
import { CouponForm } from "@/components/admin/CouponForm";
import { PageHeader, StatusBadge } from "@/components/admin/ui/layout";
import { toPersianDigits } from "@/lib/utils/persian-digits";

export const metadata = { title: "ویرایش کد تخفیف", robots: { index: false, follow: false } };

export default async function EditCouponPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const coupon = await getCouponByIdForAdmin(id);
  if (!coupon) notFound();

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <PageHeader
        title={coupon.code}
        ltrTitle
        backHref="/admin/coupons"
        backLabel="بازگشت به کدهای تخفیف"
        badge={<StatusBadge tone={coupon.isActive ? "success" : "neutral"}>{coupon.isActive ? "فعال" : "غیرفعال"}</StatusBadge>}
        description={coupon.usageLimit ? `سقف کل استفاده: ${toPersianDigits(coupon.usageLimit)} بار` : undefined}
      />
      <CouponForm coupon={coupon} />
    </div>
  );
}
