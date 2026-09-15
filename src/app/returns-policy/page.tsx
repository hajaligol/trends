import type { Metadata } from "next";
import { Container } from "@/components/ui/Container";

export const metadata: Metadata = {
  title: "بازگشت کالا",
  description: "شرایط لغو سفارش، بازگشت کالا و بازپرداخت در ترندز.",
  alternates: { canonical: "/returns-policy" },
};

export default function ReturnsPolicyPage() {
  return (
    <main className="py-[clamp(24px,4vw,40px)]">
      <Container>
        <div className="mx-auto max-w-[760px]">
          <h1 className="mb-5 text-[clamp(1.4rem,3vw,1.9rem)] font-bold text-ink">بازگشت کالا</h1>
          <div className="flex flex-col gap-4 text-[0.95rem] leading-8 text-ink/85">
            <h2 className="text-[1.05rem] font-bold text-ink">لغو سفارش</h2>
            <p>
              تا پیش از خارج شدن سفارش از انبار (ارسال)، می‌توانید از صفحه جزئیات سفارش در حساب کاربری خود آن را
              لغو کنید. در صورت پرداخت موفق، مبلغ سفارش پس از لغو به همان روش پرداخت بازگردانده می‌شود.
            </p>
            <h2 className="text-[1.05rem] font-bold text-ink">بازگشت کالای تحویل‌شده</h2>
            <p>
              کالاهایی که بدون استفاده و با بسته‌بندی اصلی باشند، تا هفت روز پس از تحویل قابل بازگشت‌اند. برای
              ثبت درخواست بازگشت، از طریق{" "}
              <a href="/contact" className="underline underline-offset-2">
                فرم تماس با ما
              </a>{" "}
              شماره سفارش خود را اعلام کنید.
            </p>
            <p className="text-[0.85rem] text-text-secondary">
              این متن یک راهنمای عمومی است و پیش از انتشار نهایی سایت باید توسط تیم عملیات/حقوقی فروشگاه
              بازبینی و تکمیل شود.
            </p>
          </div>
        </div>
      </Container>
    </main>
  );
}
