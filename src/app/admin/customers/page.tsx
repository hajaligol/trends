import Link from "next/link";
import { listCustomersForAdmin } from "@/domains/customers/queries";
import { formatToman } from "@/lib/utils/money";
import { toPersianDigits } from "@/lib/utils/persian-digits";

export const metadata = { title: "مشتریان", robots: { index: false, follow: false } };

const ROLE_LABELS: Record<string, string> = { customer: "مشتری", staff: "کارمند", admin: "مدیر کل" };

export default async function AdminCustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const params = await searchParams;
  const page = Number(params.page ?? "1") || 1;
  const customerPage = await listCustomersForAdmin({ search: params.q, page });
  const totalPages = Math.max(1, Math.ceil(customerPage.total / customerPage.pageSize));

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-[1.15rem] font-bold text-ink">مشتریان</h1>

      <form className="flex gap-3 text-[0.85rem]" method="get">
        <input
          type="search"
          name="q"
          defaultValue={params.q}
          placeholder="جستجو با موبایل، نام یا ایمیل..."
          className="min-w-[240px] flex-1 rounded-[var(--radius-md)] border border-line px-4 py-2.5 outline-none focus:border-ink"
        />
        <button type="submit" className="rounded-full bg-header px-5 py-2.5 text-ink hover:opacity-80">
          جستجو
        </button>
      </form>

      <div className="overflow-x-auto rounded-[var(--radius-lg)] border border-line">
        <table className="w-full min-w-[640px] text-[0.85rem]">
          <thead>
            <tr className="border-b border-line bg-header text-text-secondary">
              <th className="px-4 py-2.5 text-start font-medium">نام</th>
              <th className="px-4 py-2.5 text-start font-medium">موبایل</th>
              <th className="px-4 py-2.5 text-start font-medium">نقش</th>
              <th className="px-4 py-2.5 text-start font-medium">تعداد سفارش</th>
              <th className="px-4 py-2.5 text-start font-medium">مجموع خرید</th>
            </tr>
          </thead>
          <tbody>
            {customerPage.rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-text-secondary">
                  مشتری‌ای یافت نشد
                </td>
              </tr>
            ) : (
              customerPage.rows.map((customer) => (
                <tr key={customer.id} className="border-b border-line last:border-0">
                  <td className="px-4 py-2.5">
                    <Link href={`/admin/customers/${customer.id}`} className="underline underline-offset-2">
                      {customer.fullName ?? "—"}
                    </Link>
                  </td>
                  <td className="px-4 py-2.5 text-text-secondary" dir="ltr">
                    {customer.mobile}
                  </td>
                  <td className="px-4 py-2.5">{ROLE_LABELS[customer.role] ?? customer.role}</td>
                  <td className="px-4 py-2.5">{toPersianDigits(customer.orderCount)}</td>
                  <td className="px-4 py-2.5">{formatToman(customer.totalSpentToman)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 text-[0.85rem]">
          {Array.from({ length: totalPages }, (_, index) => index + 1).map((pageNumber) => (
            <Link
              key={pageNumber}
              href={{ query: { ...params, page: String(pageNumber) } }}
              className={`rounded-full px-3.5 py-1.5 ${
                pageNumber === page ? "bg-ink text-white" : "bg-header text-ink hover:opacity-80"
              }`}
            >
              {toPersianDigits(pageNumber)}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
