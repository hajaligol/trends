import Link from "next/link";
import { listCampaignsForAdmin } from "@/domains/campaigns/admin-queries";
import { campaignStatus, STATUS_LABEL, type CampaignStatus } from "@/domains/campaigns/status";
import { KIND_META } from "@/domains/campaigns/labels";
import { CampaignActiveToggle, DeleteCampaignButton, DuplicateCampaignButton } from "@/components/admin/campaign/CampaignRowActions";
import { adminButton, EmptyState, formatDateTime, PageHeader, StatusBadge, TABLE, TableCard, TD, TD_MUTED, TH, THEAD, TR, type Tone } from "@/components/admin/ui/layout";
import { PlusIcon } from "@/components/admin/ui/icons";
import { formatToman } from "@/lib/utils/money";
import { toPersianDigits } from "@/lib/utils/persian-digits";

export const metadata = { title: "کمپین‌های فروش", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

const TONE: Record<CampaignStatus, Tone> = { live: "success", scheduled: "info", ended: "neutral", paused: "warning" };

function scopeText(item: Awaited<ReturnType<typeof listCampaignsForAdmin>>[number]) {
  if (item.row.appliesToAll) return "کل فروشگاه" + (item.excludedCount ? ` (به‌جز ${toPersianDigits(item.excludedCount)} محصول)` : "");
  const parts = [
    item.brandCount && `${toPersianDigits(item.brandCount)} برند`,
    item.categoryCount && `${toPersianDigits(item.categoryCount)} دسته`,
    item.productCount && `${toPersianDigits(item.productCount)} محصول`,
  ].filter(Boolean);
  return parts.join("، ") || "—";
}

export default async function AdminCampaignsPage() {
  const items = await listCampaignsForAdmin();
  const now = new Date();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="کمپین‌های فروش"
        description="حراج‌ها و پیشنهادهای ویژه که به‌صورت خودکار و در بازه زمانی مشخص روی برند، دسته‌بندی یا محصولات انتخابی اعمال می‌شوند. مشتری نیازی به وارد کردن کد ندارد."
        actions={
          <Link href="/admin/campaigns/new" className={adminButton("primary", "md")}>
            <PlusIcon width={18} height={18} />
            کمپین جدید
          </Link>
        }
      />

      {items.length === 0 ? (
        <EmptyState
          title="هنوز کمپینی ساخته نشده است"
          description="اولین کمپین خود را بسازید: تخفیف درصدی، «۲ بخر ۱ رایگان بگیر»، ارسال رایگان و…"
          action={
            <Link href="/admin/campaigns/new" className={adminButton("primary", "md")}>
              ساخت کمپین
            </Link>
          }
        />
      ) : (
        <TableCard>
          <table className={`${TABLE} min-w-[980px]`}>
            <thead className={THEAD}>
              <tr>
                <th className={TH}>کمپین</th>
                <th className={TH}>شامل</th>
                <th className={TH}>زمان‌بندی</th>
                <th className={TH}>وضعیت</th>
                <th className={TH}>نتیجه</th>
                <th className={TH}>فعال</th>
                <th className={TH}>عملیات</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => {
                const status = campaignStatus(item.row, now);
                return (
                  <tr key={item.row.id} className={TR}>
                    <td className={TD}>
                      <Link href={`/admin/campaigns/${item.row.id}`} className="font-semibold text-ink hover:text-brand">
                        {item.row.name}
                      </Link>
                      <div className="text-[0.76rem] text-brand-dark">{KIND_META[item.row.kind].title}</div>
                      {item.row.homePlacement !== "none" && (
                        <div className="text-[0.74rem] text-text-secondary">
                          صفحه اصلی: {item.row.homePlacement === "hero" ? "اسلاید اصلی" : "بنر تبلیغاتی"}
                        </div>
                      )}
                      <div className={`text-[0.76rem] ${item.configValid ? "text-text-secondary" : "text-red-700"}`}>{item.summary}</div>
                    </td>
                    <td className={TD_MUTED}>{scopeText(item)}</td>
                    <td className={`${TD_MUTED} text-[0.78rem]`}>
                      <div>{item.row.startsAt ? `از ${formatDateTime(item.row.startsAt)}` : "از همین حالا"}</div>
                      <div>{item.row.endsAt ? `تا ${formatDateTime(item.row.endsAt)}` : "بدون پایان"}</div>
                    </td>
                    <td className={TD}>
                      <StatusBadge tone={TONE[status]}>{STATUS_LABEL[status]}</StatusBadge>
                    </td>
                    <td className={`${TD_MUTED} text-[0.78rem]`}>
                      <div>{toPersianDigits(item.orderCount)} سفارش</div>
                      <div>{formatToman(item.discountGivenToman)} تخفیف</div>
                    </td>
                    <td className={TD}>
                      <CampaignActiveToggle id={item.row.id} isActive={item.row.isActive} />
                    </td>
                    <td className={TD}>
                      <div className="flex items-center gap-2">
                        <Link href={`/admin/campaigns/${item.row.id}`} className={adminButton("secondary", "sm")}>
                          ویرایش
                        </Link>
                        <DuplicateCampaignButton id={item.row.id} />
                        <DeleteCampaignButton id={item.row.id} name={item.row.name} />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </TableCard>
      )}
    </div>
  );
}
