import type { Metadata } from "next";
import Link from "next/link";
import { listOrdersForAdmin } from "@/domains/orders/queries";
import { ORDER_STATUS_LABELS, type OrderStatus } from "@/domains/orders/lifecycle";
import { formatToman } from "@/lib/utils/money";
import { toPersianDigits } from "@/lib/utils/persian-digits";
import { ORDER_STATUS_TONES } from "@/components/admin/status";
import {
  buildHref,
  EmptyRow,
  FilterBar,
  FilterTabs,
  formatDate,
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

export const metadata: Metadata = {
  title: "سفارش‌ها — مدیریت",
  robots: { index: false, follow: false },
};

/**
 * `listOrdersForAdmin` is paginated/filterable/searchable (see that
 * function's header comment). Status is a row of quick tabs; search
 * keeps the chosen status via a hidden field.
 */
export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string; page?: string }>;
}) {
  const params = await searchParams;
  const page = Number(params.page ?? "1") || 1;
  const validStatuses = Object.keys(ORDER_STATUS_LABELS) as OrderStatus[];
  const status = validStatuses.includes(params.status as OrderStatus) ? (params.status as OrderStatus) : undefined;

  const orderPage = await listOrdersForAdmin({ status, search: params.q, page });
  const totalPages = Math.max(1, Math.ceil(orderPage.total / orderPage.pageSize));

  const tabHref = (value?: string) => buildHref("/admin/orders", { status: value, q: params.q });

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="سفارش‌ها"
        description={`${toPersianDigits(orderPage.total)} سفارش${status || params.q ? " مطابق فیلتر" : " ثبت شده"}. برای مشاهده جزئیات و تغییر وضعیت، روی شماره سفارش بزنید.`}
      />

      <FilterTabs
        items={[
          { label: "همه", href: tabHref(), active: !status },
          ...validStatuses.map((value) => ({
            label: ORDER_STATUS_LABELS[value],
            href: tabHref(value),
            active: status === value,
          })),
        ]}
      />

      <FilterBar resetHref={status ? `/admin/orders?status=${status}` : "/admin/orders"} isFiltered={Boolean(params.q)} submitLabel="جستجو">
        {status && <input type="hidden" name="status" value={status} />}
        <SearchField defaultValue={params.q} placeholder="جستجوی شماره سفارش یا موبایل گیرنده..." />
      </FilterBar>

      <TableCard>
        <table className={`${TABLE} min-w-[720px]`}>
          <thead className={THEAD}>
            <tr>
              <th className={TH}>شماره سفارش</th>
              <th className={TH}>گیرنده</th>
              <th className={TH}>تاریخ</th>
              <th className={TH}>وضعیت</th>
              <th className={TH}>مبلغ کل</th>
            </tr>
          </thead>
          <tbody>
            {orderPage.rows.map((order) => (
              <tr key={order.id} className={TR}>
                <td className={TD}>
                  <Link
                    href={`/admin/orders/${order.orderNumber}`}
                    dir="ltr"
                    className="inline-block font-semibold text-ink hover:text-brand hover:underline"
                  >
                    {order.orderNumber}
                  </Link>
                </td>
                <td className={TD}>
                  <span className="block font-medium text-ink">{order.recipientName}</span>
                  <span dir="ltr" className="block text-end text-[0.78rem] text-text-secondary">
                    {toPersianDigits(order.recipientMobile.replace("+98", "0"))}
                  </span>
                </td>
                <td className={TD_MUTED}>{formatDate(order.createdAt)}</td>
                <td className={TD}>
                  <StatusBadge tone={ORDER_STATUS_TONES[order.status] ?? "neutral"}>
                    {ORDER_STATUS_LABELS[order.status] ?? order.status}
                  </StatusBadge>
                </td>
                <td className={`${TD} font-semibold`}>{formatToman(order.totalToman)}</td>
              </tr>
            ))}
            {orderPage.rows.length === 0 && (
              <EmptyRow colSpan={5}>{status || params.q ? "سفارشی مطابق این فیلتر پیدا نشد." : "هنوز سفارشی ثبت نشده است."}</EmptyRow>
            )}
          </tbody>
        </table>
      </TableCard>

      <Pagination
        pathname="/admin/orders"
        params={{ status, q: params.q }}
        page={page}
        totalPages={totalPages}
        total={orderPage.total}
        pageSize={orderPage.pageSize}
      />
    </div>
  );
}
