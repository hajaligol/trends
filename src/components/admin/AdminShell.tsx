"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { signOut } from "next-auth/react";
import { AdminNav } from "@/components/admin/AdminNav";
import { Avatar } from "@/components/admin/ui/layout";
import { CloseIcon, ExternalLinkIcon, LogOutIcon, MenuIcon } from "@/components/admin/ui/icons";
import { useDialogA11y } from "@/lib/hooks/useDialogA11y";
import type { AdminNavBadges } from "@/domains/admin/dashboard";

export type AdminShellUser = { name: string; role: "admin" | "staff" };

function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/admin" aria-label="مدیریت ترندز — داشبورد" className="flex items-center gap-3">
      <Image
        src="/assets/brand/logo.webp"
        alt=""
        width={1536}
        height={1024}
        sizes="72px"
        className={compact ? "h-10 w-auto" : "h-11 w-auto"}
      />
      <span className="flex flex-col leading-tight">
        <span className="text-[1rem] font-bold text-ink">ترندز</span>
        <span className="text-[0.74rem] text-text-secondary">پنل مدیریت</span>
      </span>
    </Link>
  );
}

function SidebarBody({
  user,
  badges,
  onNavigate,
  headerSlot,
}: {
  user: AdminShellUser;
  badges: AdminNavBadges;
  onNavigate?: () => void;
  headerSlot?: ReactNode;
}) {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center justify-between gap-3 px-5 pt-4 pb-3">
        <Brand />
        {headerSlot}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-4">
        <AdminNav badges={badges} onNavigate={onNavigate} />
      </div>
      <div className="flex flex-col gap-2.5 border-t border-line p-3.5">
        <div className="flex items-center gap-3">
          <Avatar name={user.name} size={40} />
          <div className="flex min-w-0 flex-col leading-tight">
            <span className="truncate text-[0.88rem] font-semibold text-ink">{user.name}</span>
            <span className="text-[0.76rem] text-text-secondary">{user.role === "admin" ? "مدیر کل" : "کارمند"}</span>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <a
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-1.5 rounded-full border border-ink/20 px-3 py-2 text-[0.8rem] font-medium text-ink transition-colors hover:border-ink/40 hover:bg-ink/[0.04]"
          >
            <ExternalLinkIcon width={15} height={15} />
            فروشگاه
          </a>
          <button
            type="button"
            onClick={() => void signOut({ callbackUrl: "/" })}
            className="inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-full border border-ink/20 px-3 py-2 text-[0.8rem] font-medium text-ink transition-colors hover:border-red-300 hover:bg-red-50 hover:text-red-700"
          >
            <LogOutIcon width={15} height={15} />
            خروج
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * The admin frame: a sticky sidebar on large screens and, below `lg`, a
 * compact top bar that opens the same navigation as an accessible drawer
 * (focus trap, Escape, scroll lock). Authorization is NOT decided here —
 * `app/admin/layout.tsx` gates the whole subtree on the server first.
 */
export function AdminShell({ user, badges, children }: { user: AdminShellUser; badges: AdminNavBadges; children: ReactNode }) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const drawerRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const closeDrawer = () => setDrawerOpen(false);

  useDialogA11y(drawerOpen, closeDrawer, drawerRef, closeRef);

  // Lock page scroll while the drawer is open.
  useEffect(() => {
    if (!drawerOpen) return undefined;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [drawerOpen]);

  return (
    <div className="min-h-screen bg-bg text-ink lg:flex">
      <a
        href="#admin-main"
        className="sr-only focus:not-sr-only focus:fixed focus:start-4 focus:top-4 focus:z-[200] focus:rounded-full focus:bg-ink focus:px-5 focus:py-2.5 focus:text-[0.85rem] focus:text-white"
      >
        پرش به محتوای اصلی
      </a>

      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen w-[272px] shrink-0 border-e border-line bg-white lg:block">
        <SidebarBody user={user} badges={badges} />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile / tablet top bar */}
        <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-line bg-white/90 px-4 py-2.5 backdrop-blur lg:hidden">
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            aria-label="باز کردن منوی مدیریت"
            aria-expanded={drawerOpen}
            className="grid h-11 w-11 cursor-pointer place-items-center rounded-full text-ink transition-colors hover:bg-ink/[0.06]"
          >
            <MenuIcon width={24} height={24} />
          </button>
          <Brand compact />
          <a
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="مشاهده فروشگاه (در تب جدید)"
            className="grid h-11 w-11 place-items-center rounded-full text-ink transition-colors hover:bg-ink/[0.06]"
          >
            <ExternalLinkIcon width={21} height={21} />
          </a>
        </header>

        <main id="admin-main" tabIndex={-1} className="mx-auto flex w-full max-w-[1200px] flex-1 flex-col gap-6 px-[var(--gutter)] py-6 outline-none lg:py-9">
          {children}
        </main>
      </div>

      {/* Mobile drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-[100] lg:hidden">
          <div aria-hidden="true" onClick={closeDrawer} className="modal-backdrop-in absolute inset-0 bg-ink/45" />
          <div
            ref={drawerRef}
            role="dialog"
            aria-modal="true"
            aria-label="منوی مدیریت"
            className="admin-drawer-in absolute inset-y-0 start-0 w-[min(86vw,320px)] bg-white shadow-[0_0_60px_-10px_rgba(24,38,48,0.45)]"
          >
            <SidebarBody
              user={user}
              badges={badges}
              onNavigate={closeDrawer}
              headerSlot={
                <button
                  ref={closeRef}
                  type="button"
                  onClick={closeDrawer}
                  aria-label="بستن منو"
                  className="grid h-10 w-10 shrink-0 cursor-pointer place-items-center rounded-full text-ink transition-colors hover:bg-ink/[0.06]"
                >
                  <CloseIcon width={22} height={22} />
                </button>
              }
            />
          </div>
        </div>
      )}
    </div>
  );
}
