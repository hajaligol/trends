import Link from "next/link";
import { listSupportMessagesForAdmin } from "@/domains/support/queries";
import { SupportMessageResolvedToggle } from "@/components/admin/SupportMessageResolvedToggle";
import { toPersianDigits } from "@/lib/utils/persian-digits";

export const metadata = { title: "پیام‌های پشتیبانی", robots: { index: false, follow: false } };

export default async function AdminSupportPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; unresolved?: string }>;
}) {
  const params = await searchParams;
  const page = Number(params.page ?? "1") || 1;
  const onlyUnresolved = params.unresolved === "1";
  const messagePage = await listSupportMessagesForAdmin({ page, onlyUnresolved });
  const totalPages = Math.max(1, Math.ceil(messagePage.total / messagePage.pageSize));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-[1.15rem] font-bold text-ink">پیام‌های پشتیبانی</h1>
        <Link
          href={{ query: onlyUnresolved ? {} : { unresolved: "1" } }}
          className={`rounded-full px-4 py-2 text-[0.82rem] ${
            onlyUnresolved ? "bg-ink text-white" : "bg-header text-ink hover:opacity-80"
          }`}
        >
          فقط بدون پاسخ
        </Link>
      </div>

      <div className="flex flex-col gap-4">
        {messagePage.rows.length === 0 ? (
          <p className="rounded-[var(--radius-lg)] border border-line bg-white p-6 text-center text-[0.85rem] text-text-secondary">
            پیامی یافت نشد
          </p>
        ) : (
          messagePage.rows.map((message) => (
            <div key={message.id} className="flex flex-col gap-2 rounded-[var(--radius-lg)] border border-line bg-white p-5">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-medium text-ink">{message.subject}</p>
                  <p className="text-[0.8rem] text-text-secondary">
                    {message.name} — <span dir="ltr">{message.email}</span>
                    {message.mobile && <span dir="ltr"> — {message.mobile}</span>}
                  </p>
                </div>
                <SupportMessageResolvedToggle id={message.id} isResolved={message.isResolved} />
              </div>
              <p className="text-[0.88rem] leading-7 whitespace-pre-line text-ink/85">{message.message}</p>
              <p className="text-[0.75rem] text-text-secondary">
                {new Intl.DateTimeFormat("fa-IR", { dateStyle: "medium", timeStyle: "short" }).format(message.createdAt)}
              </p>
            </div>
          ))
        )}
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
