import { notFound } from "next/navigation";
import Link from "next/link";
import { getCouponByIdForAdmin } from "@/domains/promotions/admin-queries";
import { CouponForm } from "@/components/admin/CouponForm";

export const metadata = { title: "ویرایش کد تخفیف", robots: { index: false, follow: false } };

export default async function EditCouponPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const coupon = await getCouponByIdForAdmin(id);
  if (!coupon) notFound();

  return (
    <div className="flex max-w-xl flex-col gap-6">
      <div>
        <Link href="/admin/coupons" className="text-[0.8rem] text-text-secondary underline underline-offset-2">
          ← بازگشت به کدهای تخفیف
        </Link>
        <h1 className="mt-1 text-[1.15rem] font-bold text-ink" dir="ltr">
          {coupon.code}
        </h1>
      </div>
      <CouponForm coupon={coupon} />
    </div>
  );
}
