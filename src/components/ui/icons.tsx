import type { SVGProps } from "react";

/**
 * Icon paths copied verbatim from reference/prototype.html
 * (#cartBtn / account button / #searchBtn SVGs) so the header
 * matches the prototype exactly.
 */

export function CartIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 1024 1024" fill="none" aria-hidden="true" {...props}>
      <g
        transform="translate(15.5 -27.5)"
        fill="none"
        stroke="currentColor"
        strokeWidth={34}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M214 302h82l45 353c5 39 38 68 78 68h316" />
        <path d="M307 382h472l-45 214H334" />
        <path d="M372 468h358" />
        <path d="M382 556h330" />
        <path d="M424 723a27 27 0 1 0 0 54 27 27 0 1 0 0-54Z" />
        <path d="M680 723a27 27 0 1 0 0 54 27 27 0 1 0 0-54Z" />
      </g>
    </svg>
  );
}

export function AccountIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 1024 1024" fill="none" aria-hidden="true" {...props}>
      <g
        transform="translate(0 5)"
        fill="none"
        stroke="currentColor"
        strokeWidth={34}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx={512} cy={350} r={126} />
        <path d="M230 790c22-148 125-238 282-238s260 90 282 238" />
      </g>
    </svg>
  );
}

export function SearchIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 1024 1024" fill="none" aria-hidden="true" {...props}>
      <g
        transform="translate(-4 -4)"
        fill="none"
        stroke="currentColor"
        strokeWidth={34}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M690 486c0 124-100 224-224 224S242 610 242 486s100-224 224-224 224 100 224 224Z" />
        <path d="M636 650l154 154" />
      </g>
    </svg>
  );
}

export function HeartIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 1024 1024" fill="none" aria-hidden="true" {...props}>
      <path
        d="M512 824C487 802 244 602 218 438C195 292 286 210 386 210C445 210 490 239 512 292C534 239 579 210 638 210C738 210 829 292 806 438C780 602 537 802 512 824Z"
        stroke="currentColor"
        strokeWidth={32}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
