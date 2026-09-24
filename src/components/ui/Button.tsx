import type { ButtonHTMLAttributes, AnchorHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "ghost" | "brand" | "outline" | "danger" | "danger-outline";
type Size = "md" | "sm";

// primary / ghost / brand mirror .btn-primary / .btn-ghost in
// reference/prototype.html and carry their own padding.
const variantClasses: Record<Variant, string> = {
  primary: "bg-ink text-white hover:opacity-88 px-[30px] py-[15px] text-[0.95rem]",
  ghost: "bg-white text-ink hover:opacity-85 px-[26px] py-[13px] text-[0.92rem]",
  // Brand purple, same size as primary; used for the main action of account forms.
  brand: "bg-brand text-white hover:bg-brand-dark px-[30px] py-[15px] text-[0.95rem] transition-colors",
  // Secondary action on white surfaces (cards, panels): visible border so it
  // reads as a button, not a link. Sized via `size`.
  outline:
    "border border-ink/25 bg-transparent text-ink font-semibold hover:border-ink/40 hover:bg-ink/5 transition-colors",
  // Destructive confirm (e.g. "yes, cancel the order"). Sized via `size`.
  danger: "bg-red-600 text-white font-semibold hover:bg-red-700 transition-colors",
  // Destructive entry point that still asks for confirmation afterwards.
  "danger-outline":
    "border border-red-600/40 bg-transparent text-red-700 font-semibold hover:border-red-600/60 hover:bg-red-50 transition-colors",
};

// `size` only applies to the newer variants (outline / danger / danger-outline);
// the original three keep their fixed padding so existing screens don't change.
const sizeClasses: Record<Size, string> = {
  md: "px-[26px] py-[13px] text-[0.92rem]",
  sm: "px-5 py-2.5 text-[0.85rem]",
};

const base =
  "inline-flex items-center justify-center gap-2.5 rounded-full cursor-pointer transition-opacity duration-200 ease-out";

const LEGACY_VARIANTS: Variant[] = ["primary", "ghost", "brand"];

/** Class string shared by <Button>, <ButtonLink> and next/link elements styled as buttons. */
export function buttonClasses(variant: Variant = "primary", size: Size = "md", className = ""): string {
  const border = LEGACY_VARIANTS.includes(variant) ? "border-0" : "";
  const sizing = LEGACY_VARIANTS.includes(variant) ? "" : sizeClasses[size];
  return [base, border, variantClasses[variant], sizing, className].filter(Boolean).join(" ");
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  children: ReactNode;
};

export function Button({ variant = "primary", size = "md", className = "", children, ...props }: ButtonProps) {
  return (
    <button className={buttonClasses(variant, size, className)} {...props}>
      {children}
    </button>
  );
}

type ButtonLinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
  variant?: Variant;
  size?: Size;
  children: ReactNode;
};

export function ButtonLink({ variant = "primary", size = "md", className = "", children, ...props }: ButtonLinkProps) {
  return (
    <a className={buttonClasses(variant, size, className)} {...props}>
      {children}
    </a>
  );
}
