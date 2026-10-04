import { notFound } from "next/navigation";
import Link from "next/link";
import { getCustomerForAdmin } from "@/domains/customers/queries";
import { getCurrentUser } from "@/domains/auth/actions";
import { CustomerRoleForm } from "@/components/admin/CustomerRoleForm";
import { ORDER_STATUS_LABELS, type OrderStatus } from "@/domains/orders/lifecycle";
import { formatToman } from "@/lib/utils/money";
import { toPersianDigits } from "@/lib/utils/persian-digits";
import { ORDER_STATUS_TONES, ROLE_LABELS, ROLE_TONES } from "@/components/admin/status";
import {
  Avatar,
  Card,
  DetailRow,
  EmptyRow,
  formatDate,
  PageHeader,
  StatusBadge,
  TABLE,
  TD,
  TD_MUTED,
  TableCard,
  TH,
  THEAD,
  TR,
} from "@/components/admin/ui/layout";

export const metadata = { title: "جزئیات مشتری", robots: { index: false, follow: false } };

export default async function AdminCustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [customer, viewer] = await Promise.all([getCustomerForAdmin(id), getCurrentUser()]);
  if (!customer) notFound();

  const mobile = toPersianDigits(customer.mobile.replace("+98", "0"));

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={customer.fullName ?? mobile}
        backHref="/admin/customers"
        backLabel="بازگشت به مشتریان"
        badge={<StatusBadge tone={ROLE_TONES[customer.role] ?? "neutral"}>{ROLE_LABELS[customer.role] ?? customer.role}</StatusBadge>}
      />

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <section aria-labelledby="customer-orders" className="flex min-w-0 flex-col gap-3">
          <h2 id="customer-orders" className="m-0 text-[1.05rem] font-bold text-ink">
            سفارش‌های اخیر
          </h2>
          <TableCard>
            <table className={`${TABLE} min-w-[520px]`}>
              <thead className={THEAD}>
                <tr>
                  <th className={TH}>شماره سفارش</th>
                  <th className={TH}>وضعیت</th>
                  <th className={TH}>مبلغ</th>
                  <th className={TH}>تاریخ</th>
                </tr>
              </thead>
              <tbody>
                {customer.recentOrders.length === 0 ? (
                  <EmptyRow colSpan={4}>این مشتری هنوز سفارشی ثبت نکرده است.</EmptyRow>
                ) : (
                  customer.recentOrders.map((order) => (
                    <tr key={order.orderNumber} className={TR}>
                      <td className={TD}>
                        <Link href={`/admin/orders/${order.orderNumber}`} dir="ltr" className="inline-block font-semibold text-ink hover:text-brand hover:underline">
                          {order.orderNumber}
                        </Link>
                      </td>
                      <td className={TD}>
                        <StatusBadge tone={ORDER_STATUS_TONES[order.status as OrderStatus] ?? "neutral"}>
                          {ORDER_STATUS_LABELS[order.status as OrderStatus] ?? order.status}
                        </StatusBadge>
                      </td>
                      <td className={`${TD} font-semibold`}>{formatToman(order.totalToman)}</td>
                      <td className={TD_MUTED}>{formatDate(order.createdAt)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </TableCard>
        </section>

        <aside className="flex min-w-0 flex-col gap-6">
          <Card title="اطلاعات تماس">
            <div className="mb-4 flex items-center gap-3">
              <Avatar name={customer.fullName ?? customer.mobile} size={48} />
              <span className="font-semibold text-ink">{customer.fullName ?? "بدون نام"}</span>
            </div>
            <dl className="m-0 flex flex-col gap-3">
              <DetailRow label="موبایل">
                <span dir="ltr">{mobile}</span>
              </DetailRow>
              <DetailRow label="ایمیل">{customer.email ? <span dir="ltr">{customer.email}</span> : "—"}</DetailRow>
            </dl>
          </Card>

          {viewer && viewer.role === "admin" && (
            <Card title="نقش و دسترسی">
              <CustomerRoleForm userId={customer.id} currentRole={customer.role} isSelf={viewer.id === customer.id} />
            </Card>
          )}
        </aside>
      </div>
    </div>
  );
}
