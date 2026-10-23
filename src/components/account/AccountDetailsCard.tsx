import type { ReactNode } from "react";
import { formatPersianDate } from "@/components/account/format";
import { DashboardUserIcon } from "@/components/ui/dashboard-icons";
import { formatIranianMobileForDisplay } from "@/lib/utils/phone";
import { toPersianDigits } from "@/lib/utils/persian-digits";

const CARD = "rounded-[var(--radius-lg)] border border-line bg-white shadow-[0_14px_34px_-24px_rgba(24,38,48,0.3)]";

/** The «اطلاعات حساب» card: name, mobile, email and member-since date. */
export function AccountDetailsCard({
  user,
  className = "",
}: {
  user: { fullName: string | null; mobile: string; email: string | null; createdAt: Date };
  className?: string;
}) {
  const details: Array<{ label: string; value: ReactNode }> = [
    { label: "نام", value: user.fullName ?? "—" },
    {
      label: "شماره موبایل",
      value: (
        <span dir="ltr" className="inline-block">
          {toPersianDigits(formatIranianMobileForDisplay(user.mobile))}
        </span>
      ),
    },
    { label: "ایمیل", value: user.email ?? "—" },
    { label: "عضویت از", value: formatPersianDate(user.createdAt) },
  ];

  return (
    <section className={`${CARD} p-5 ${className}`}>
      <h2 className="m-0 mb-4 flex items-center gap-2.5 text-[1.05rem] font-bold">
        <DashboardUserIcon className="h-6 w-6 text-ink" aria-hidden="true" />
        اطلاعات حساب
      </h2>
      <dl className="m-0 flex flex-col divide-y divide-line">
        {details.map((item) => (
          <div key={item.label} className="flex flex-col gap-1 py-3 first:pt-0 last:pb-0">
            <dt className="text-[0.78rem] text-text-secondary">{item.label}</dt>
            <dd className="m-0 break-words text-[0.92rem] font-medium">{item.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
