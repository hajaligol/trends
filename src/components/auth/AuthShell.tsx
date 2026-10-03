import type { ReactNode } from "react";
import { Container } from "@/components/ui/Container";
import { ClipboardListIcon, HeartIcon, ShippingIcon } from "@/components/ui/icons";

type AuthShellProps = {
  title: string;
  subtitle: string;
  /** Short line above the title inside the side panel. */
  panelHeading: string;
  children: ReactNode;
};

// Only features that actually exist in the account area today
// (order history, address book at checkout, wishlist).
const PERKS = [
  { icon: ClipboardListIcon, text: "ثبت سفارش و پیگیری وضعیت آن" },
  { icon: ShippingIcon, text: "ذخیره آدرس‌ها برای پرداخت سریع‌تر" },
  { icon: HeartIcon, text: "نگهداری لیست علاقه‌مندی‌ها" },
] as const;

/**
 * Shared frame for login / register / forgot / reset pages: a rounded
 * two-panel card — editorial pastel panel (hidden on small screens) next
 * to the form. Pure server component; all interactivity lives in the forms.
 */
export function AuthShell({ title, subtitle, panelHeading, children }: AuthShellProps) {
  return (
    <main className="py-[clamp(32px,6vw,80px)]">
      <Container>
        <div className="mx-auto grid max-w-[980px] overflow-hidden rounded-[var(--radius-lg)] border border-line bg-white lg:grid-cols-[1fr_1.05fr]">
          <aside
            aria-hidden="true"
            className="relative hidden flex-col justify-between gap-10 overflow-hidden bg-lavender p-10 lg:flex"
          >
            <span className="absolute -start-16 -top-16 h-52 w-52 rounded-full bg-pink/70" />
            <span className="absolute -bottom-20 -end-14 h-56 w-56 rounded-full bg-blue/60" />
            <span className="absolute end-10 top-28 h-14 w-14 rounded-full bg-yellow/80" />

            <div className="relative">
              <p className="m-0 text-[0.85rem] font-medium text-ink/70">ترندز</p>
              <p className="mb-0 mt-3 text-[1.7rem] font-bold leading-snug text-ink">{panelHeading}</p>
            </div>

            <ul className="relative m-0 flex list-none flex-col gap-3 p-0">
              {PERKS.map(({ icon: Icon, text }) => (
                <li
                  key={text}
                  className="flex items-center gap-3 rounded-[var(--radius-md)] bg-white/70 px-4 py-3 text-[0.88rem] text-ink backdrop-blur-[2px]"
                >
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white">
                    <Icon width={20} height={20} stroke="currentColor" />
                  </span>
                  {text}
                </li>
              ))}
            </ul>
          </aside>

          <section className="flex flex-col gap-6 p-[clamp(24px,5vw,44px)]">
            <header>
              <h1 className="m-0 text-[1.55rem] font-bold text-ink">{title}</h1>
              <p className="mb-0 mt-2 text-[0.9rem] leading-relaxed text-text-secondary">{subtitle}</p>
            </header>
            {children}
          </section>
        </div>
      </Container>
    </main>
  );
}

/** Consistent error / success banners used by the auth forms. */
export function AuthAlert({ tone, children }: { tone: "error" | "success"; children: ReactNode }) {
  return (
    <p
      role={tone === "error" ? "alert" : "status"}
      tabIndex={-1}
      className={`m-0 outline-none rounded-[var(--radius-md)] px-4 py-3 text-[0.85rem] leading-relaxed ${
        tone === "error" ? "bg-red-50 text-red-700" : "bg-aqua/40 text-ink"
      }`}
    >
      {children}
    </p>
  );
}
