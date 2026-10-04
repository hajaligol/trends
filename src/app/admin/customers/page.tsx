import Link from "next/link";
import { listCustomersForAdmin } from "@/domains/customers/queries";
import { formatToman } from "@/lib/utils/money";
import { toPersianDigits } from "@/lib/utils/persian-digits";
import { ROLE_LABELS, ROLE_TONES } from "@/components/admin/status";
import {
  Avatar,
  EmptyRow,
  FilterBar,
  PageHeader,
  Pagination,
  SearchField,
  StatusBadge,
  TABLE,
  TD,
  TD_MUTED,
  TableCard,
  TH,
  THEAD,
  TR,
} from "@/components/admin/ui/layout";

export const metadata = { title: "مشتریان", robots: { index: false, follow: false } };

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
    <div className="flex flex-col gap-5">
      <PageHeader title="مشتریان" description={`${toPersianDigits(customerPage.total)} حساب کاربری${params.q ? " مطابق جستجو" : ""}.`} />

      <FilterBar resetHref="/admin/customers" isFiltered={Boolean(params.q)} submitLabel="جستجو">
        <SearchField defaultValue={params.q} placeholder="جستجو با موبایل، نام یا ایمیل..." />
      </FilterBar>

      <TableCard>
        <table className={`${TABLE} min-w-[680px]`}>
          <thead className={THEAD}>
            <tr>
              <th className={TH}>مشتری</th>
              <th className={TH}>موبایل</th>
              <th className={TH}>نقش</th>
              <th className={TH}>سفارش‌ها</th>
              <th className={TH}>مجموع خرید</th>
            </tr>
          </thead>
          <tbody>
            {customerPage.rows.length === 0 ? (
              <EmptyRow colSpan={5}>{params.q ? "مشتری‌ای مطابق این جستجو پیدا نشد." : "هنوز مشتری‌ای ثبت‌نام نکرده است."}</EmptyRow>
            ) : (
              customerPage.rows.map((customer) => (
                <tr key={customer.id} className={TR}>
                  <td className={TD}>
                    <Link href={`/admin/customers/${customer.id}`} className="group flex items-center gap-3">
                      <Avatar name={customer.fullName ?? customer.mobile} />
                      <span className="font-semibold text-ink group-hover:text-brand group-hover:underline">{customer.fullName ?? "بدون نام"}</span>
                    </Link>
                  </td>
                  <td className={TD_MUTED} dir="ltr">
                    <span className="block text-end">{toPersianDigits(customer.mobile.replace("+98", "0"))}</span>
                  </td>
                  <td className={TD}>
                    <StatusBadge tone={ROLE_TONES[customer.role] ?? "neutral"}>{ROLE_LABELS[customer.role] ?? customer.role}</StatusBadge>
                  </td>
                  <td className={TD}>{toPersianDigits(customer.orderCount)}</td>
                  <td className={`${TD} font-medium`}>{customer.totalSpentToman > 0 ? formatToman(customer.totalSpentToman) : "—"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </TableCard>

      <Pagination
        pathname="/admin/customers"
        params={{ q: params.q }}
        page={page}
        totalPages={totalPages}
        total={customerPage.total}
        pageSize={customerPage.pageSize}
      />
    </div>
  );
}
