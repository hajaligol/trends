import type { ButtonHTMLAttributes, AnchorHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "ghost";

// Mirrors .btn-primary / .btn-ghost in reference/prototype.html.
const variantClasses: Record<Variant, string> = {
  primary: "bg-ink text-white hover:opacity-88 px-[30px] py-[15px] text-[0.95rem]",
  ghost: "bg-white text-ink hover:opacity-85 px-[26px] py-[13px] text-[0.92rem]",
};

const base =
  "inline-flex items-center gap-2.5 rounded-full border-0 cursor-pointer transition-opacity duration-200 ease-out";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  children: ReactNode;
};

export function Button({ variant = "primary", className = "", children, ...props }: ButtonProps) {
  return (
    <button className={`${base} ${variantClasses[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
}

type ButtonLinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
  variant?: Variant;
  children: ReactNode;
};

export function ButtonLink({ variant = "primary", className = "", children, ...props }: ButtonLinkProps) {
  return (
    <a className={`${base} ${variantClasses[variant]} ${className}`} {...props}>
      {children}
    </a>
  );
}
