import { CouponForm } from "@/components/admin/CouponForm";
import { PageHeader } from "@/components/admin/ui/layout";

export const metadata = { title: "کد تخفیف جدید", robots: { index: false, follow: false } };

export default function NewCouponPage() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <PageHeader title="کد تخفیف جدید" backHref="/admin/coupons" backLabel="بازگشت به کدهای تخفیف" />
      <CouponForm />
    </div>
  );
}
