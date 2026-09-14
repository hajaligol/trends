import { CouponForm } from "@/components/admin/CouponForm";

export const metadata = { title: "کد تخفیف جدید", robots: { index: false, follow: false } };

export default function NewCouponPage() {
  return (
    <div className="flex max-w-xl flex-col gap-6">
      <h1 className="text-[1.15rem] font-bold text-ink">کد تخفیف جدید</h1>
      <CouponForm />
    </div>
  );
}
