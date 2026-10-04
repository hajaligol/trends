import { listSupportMessagesForAdmin } from "@/domains/support/queries";
import { SupportMessageResolvedToggle } from "@/components/admin/SupportMessageResolvedToggle";
import { toPersianDigits } from "@/lib/utils/persian-digits";
import { Avatar, buildHref, EmptyState, FilterTabs, formatDateTime, PageHeader, Pagination, StatusBadge } from "@/components/admin/ui/layout";
import { MailIcon, MessageIcon } from "@/components/admin/ui/icons";

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
    <div className="flex flex-col gap-5">
      <PageHeader
        title="پیام‌های پشتیبانی"
        description="پیام‌هایی که مشتریان از فرم «تماس با ما» فرستاده‌اند. پس از پاسخ‌گویی (با ایمیل یا تماس)، پیام را «حل شده» علامت بزنید."
      />

      <FilterTabs
        items={[
          { label: "همه", href: buildHref("/admin/support"), active: !onlyUnresolved },
          { label: "فقط بدون پاسخ", href: buildHref("/admin/support", { unresolved: "1" }), active: onlyUnresolved },
        ]}
      />

      {messagePage.rows.length === 0 ? (
        <EmptyState
          icon={<MessageIcon width={26} height={26} />}
          title={onlyUnresolved ? "پیام بی‌پاسخی وجود ندارد" : "هنوز پیامی دریافت نشده است"}
          description={onlyUnresolved ? "همه پیام‌ها حل شده‌اند." : undefined}
        />
      ) : (
        <ul className="m-0 flex list-none flex-col gap-4 p-0">
          {messagePage.rows.map((message) => (
            <li
              key={message.id}
              className={`flex flex-col gap-4 rounded-[var(--radius-lg)] border bg-white p-5 sm:p-6 ${message.isResolved ? "border-line" : "border-yellow"}`}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <Avatar name={message.name} />
                  <div className="flex flex-col leading-tight">
                    <span className="text-[0.92rem] font-semibold text-ink">{message.name}</span>
                    <span className="text-[0.76rem] text-text-secondary">{formatDateTime(message.createdAt)}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <StatusBadge tone={message.isResolved ? "success" : "warning"}>{message.isResolved ? "حل شده" : "بدون پاسخ"}</StatusBadge>
                  <SupportMessageResolvedToggle id={message.id} isResolved={message.isResolved} />
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <h2 className="m-0 text-[1rem] font-bold text-ink">{message.subject}</h2>
                <p className="m-0 text-[0.9rem] leading-8 whitespace-pre-line text-ink/85">{message.message}</p>
              </div>

              <div className="flex flex-wrap items-center gap-3 border-t border-line pt-4 text-[0.82rem]">
                <a
                  href={`mailto:${message.email}?subject=${encodeURIComponent(`پاسخ: ${message.subject}`)}`}
                  className="inline-flex items-center gap-2 rounded-full border border-ink/20 px-4 py-2 font-semibold text-ink transition-colors hover:border-ink/40 hover:bg-ink/[0.04]"
                >
                  <MailIcon width={16} height={16} />
                  پاسخ با ایمیل
                </a>
                <span dir="ltr" className="text-text-secondary">
                  {message.email}
                </span>
                {message.mobile && (
                  <a href={`tel:${message.mobile}`} dir="ltr" className="text-text-secondary hover:text-brand">
                    {toPersianDigits(message.mobile)}
                  </a>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      <Pagination
        pathname="/admin/support"
        params={{ unresolved: onlyUnresolved ? "1" : undefined }}
        page={page}
        totalPages={totalPages}
        total={messagePage.total}
        pageSize={messagePage.pageSize}
      />
    </div>
  );
}
