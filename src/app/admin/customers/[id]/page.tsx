import { notFound } from "next/navigation";
import Link from "next/link";
import { getCustomerForAdmin } from "@/domains/customers/queries";
import { getCurrentUser } from "@/domains/auth/actions";
import { CustomerRoleForm } from "@/components/admin/CustomerRoleForm";
import { ORDER_STATUS_LABELS } from "@/domains/orders/lifecycle";
import { formatToman } from "@/lib/utils/money";

export const metadata = { title: "جزئیات مشتری", robots: { index: false, follow: false } };

export default async function AdminCustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [customer, viewer] = await Promise.all([getCustomerForAdmin(id), getCurrentUser()]);
  if (!customer) notFound();

  return (
    <div className="flex flex-col gap-8">
      <div>
        <Link href="/admin/customers" className="text-[0.8rem] text-text-secondary underline underline-offset-2">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#000000" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6" /></svg> بازگشت به مشتریان
        </Link>
        <h1 className="mt-1 text-[1.15rem] font-bold text-ink">{customer.fullName ?? customer.mobile}</h1>
        <p className="mt-0.5 text-[0.85rem] text-text-secondary" dir="ltr">
          {customer.mobile} {customer.email ? `· ${customer.email}` : ""}
        </p>
      </div>

      {viewer && viewer.role === "admin" && (
        <section className="max-w-md rounded-[var(--radius-lg)] border border-line bg-white p-5">
          <h2 className="mb-3 text-[0.95rem] font-bold text-ink">نقش کاربر</h2>
          <CustomerRoleForm userId={customer.id} currentRole={customer.role} isSelf={viewer.id === customer.id} />
        </section>
      )}

      <section className="flex flex-col gap-3">
        <h2 className="text-[1rem] font-bold text-ink">سفارش‌های اخیر</h2>
        <div className="overflow-x-auto rounded-[var(--radius-lg)] border border-line">
          <table className="w-full min-w-[560px] text-[0.85rem]">
            <thead>
              <tr className="border-b border-line bg-header text-text-secondary">
                <th className="px-4 py-2.5 text-start font-medium">شماره سفارش</th>
                <th className="px-4 py-2.5 text-start font-medium">وضعیت</th>
                <th className="px-4 py-2.5 text-start font-medium">مبلغ</th>
                <th className="px-4 py-2.5 text-start font-medium">تاریخ</th>
              </tr>
            </thead>
            <tbody>
              {customer.recentOrders.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-text-secondary">
                    این مشتری هنوز سفارشی ثبت نکرده است
                  </td>
                </tr>
              ) : (
                customer.recentOrders.map((order) => (
                  <tr key={order.orderNumber} className="border-b border-line last:border-0">
                    <td className="px-4 py-2.5">
                      <Link href={`/admin/orders/${order.orderNumber}`} className="underline underline-offset-2">
                        {order.orderNumber}
                      </Link>
                    </td>
                    <td className="px-4 py-2.5">{ORDER_STATUS_LABELS[order.status as keyof typeof ORDER_STATUS_LABELS]}</td>
                    <td className="px-4 py-2.5">{formatToman(order.totalToman)}</td>
                    <td className="px-4 py-2.5 text-text-secondary">
                      {new Intl.DateTimeFormat("fa-IR").format(order.createdAt)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
