import Link from "next/link";
import { Container } from "@/components/ui/Container";

export default function NotFound() {
  return (
    <main className="py-[clamp(60px,10vw,120px)]">
      <Container className="flex flex-col items-center gap-4 text-center">
        <p className="text-[0.9rem] text-text-secondary">۴۰۴</p>
        <h1 className="m-0 text-[clamp(1.5rem,3vw,2rem)] font-bold">این صفحه پیدا نشد</h1>
        <p className="max-w-sm text-[0.95rem] text-text-secondary">
          صفحه‌ای که دنبالش بودید حذف شده یا اصلاً وجود نداشته است.
        </p>
        <Link
          href="/"
          className="mt-2 rounded-full bg-ink px-6 py-2.5 text-[0.9rem] font-semibold text-white"
        >
          بازگشت به صفحه اصلی
        </Link>
      </Container>
    </main>
  );
}
