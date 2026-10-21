import type { SVGProps } from "react";

/**
 * Icon paths copied verbatim from reference/prototype.html
 * (#cartBtn / account button / #searchBtn SVGs) so the header
 * matches the prototype exactly.
 */

export function CartIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M16 10a4 4 0 0 1-8 0" /><path d="M3.103 6.034h17.794" /><path d="M3.4 5.467a2 2 0 0 0-.4 1.2V20a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6.667a2 2 0 0 0-.4-1.2l-2-2.667A2 2 0 0 0 17 2H7a2 2 0 0 0-1.6.8z" /></svg>
  );
}

export function AccountIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M17.925 20.056a6 6 0 0 0-11.851.001" /><circle cx="12" cy="11" r="4" /><circle cx="12" cy="12" r="10" /></svg>
  );
}

export function SearchIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="m21 21-4.34-4.34" /><circle cx="11" cy="11" r="8" /></svg>
  );
}

export function HeartIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M2 9.5a5.5 5.5 0 0 1 9.591-3.676.56.56 0 0 0 .818 0A5.49 5.49 0 0 1 22 9.5c0 2.29-1.5 4-3 5.5l-5.492 5.313a2 2 0 0 1-3 .019L5 15c-1.5-1.5-3-3.2-3-5.5" /></svg>
  );
}

/** Lucide "house" — replaces the "صفحه اصلی" (home) text in nav bars. */
export function HomeIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#000000" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8" /><path d="M3 10a2 2 0 0 1 .709-1.528l7-6a2 2 0 0 1 2.582 0l7 6A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /></svg>
  );
}

export function SupportIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#000000" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"><path d="M3 11h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-5Zm0 0a9 9 0 1 1 18 0m0 0v5a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3Z"/><path d="M21 16v2a4 4 0 0 1-4 4h-5"/></svg>
  );
}

export function PaymentIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#000000" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" {...props}><rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/><path d="M6 14h2"/></svg>
  );
}

export function ReturnIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#000000" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M16 16h5v5"/></svg>
  );
}

export function ShippingIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#000000" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/><path d="M15 18H9"/><path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14"/><circle cx="17" cy="18" r="2"/><circle cx="7" cy="18" r="2"/></svg>
  );
}

export function InstagramIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 2476 2476" id="instagram"><path d="M825.4 1238c0-227.9 184.7-412.7 412.6-412.7 227.9 0 412.7 184.8 412.7 412.7 0 227.9-184.8 412.7-412.7 412.7-227.9 0-412.6-184.8-412.6-412.7m-223.1 0c0 351.1 284.6 635.7 635.7 635.7s635.7-284.6 635.7-635.7-284.6-635.7-635.7-635.7S602.3 886.9 602.3 1238m1148-660.9c0 82 66.5 148.6 148.6 148.6 82 0 148.6-66.6 148.6-148.6s-66.5-148.5-148.6-148.5-148.6 66.5-148.6 148.5M737.8 2245.7c-120.7-5.5-186.3-25.6-229.9-42.6-57.8-22.5-99-49.3-142.4-92.6-43.3-43.3-70.2-84.5-92.6-142.3-17-43.6-37.1-109.2-42.6-229.9-6-130.5-7.2-169.7-7.2-500.3s1.3-369.7 7.2-500.3c5.5-120.7 25.7-186.2 42.6-229.9 22.5-57.8 49.3-99 92.6-142.4 43.3-43.3 84.5-70.2 142.4-92.6 43.6-17 109.2-37.1 229.9-42.6 130.5-6 169.7-7.2 500.2-7.2 330.6 0 369.7 1.3 500.3 7.2 120.7 5.5 186.2 25.7 229.9 42.6 57.8 22.4 99 49.3 142.4 92.6 43.3 43.3 70.1 84.6 92.6 142.4 17 43.6 37.1 109.2 42.6 229.9 6 130.6 7.2 169.7 7.2 500.3 0 330.5-1.2 369.7-7.2 500.3-5.5 120.7-25.7 186.3-42.6 229.9-22.5 57.8-49.3 99-92.6 142.3-43.3 43.3-84.6 70.1-142.4 92.6-43.6 17-109.2 37.1-229.9 42.6-130.5 6-169.7 7.2-500.3 7.2-330.5 0-369.7-1.2-500.2-7.2M727.6 7.5c-131.8 6-221.8 26.9-300.5 57.5-81.4 31.6-150.4 74-219.3 142.8C139 276.6 96.6 345.6 65 427.1 34.4 505.8 13.5 595.8 7.5 727.6 1.4 859.6 0 901.8 0 1238s1.4 378.4 7.5 510.4c6 131.8 26.9 221.8 57.5 300.5 31.6 81.4 73.9 150.5 142.8 219.3 68.8 68.8 137.8 111.1 219.3 142.8 78.8 30.6 168.7 51.5 300.5 57.5 132.1 6 174.2 7.5 510.4 7.5 336.3 0 378.4-1.4 510.4-7.5 131.8-6 221.8-26.9 300.5-57.5 81.4-31.7 150.4-74 219.3-142.8 68.8-68.8 111.1-137.9 142.8-219.3 30.6-78.7 51.6-168.7 57.5-300.5 6-132.1 7.4-174.2 7.4-510.4s-1.4-378.4-7.4-510.4c-6-131.8-26.9-221.8-57.5-300.5-31.7-81.4-74-150.4-142.8-219.3C2199.4 139 2130.3 96.6 2049 65c-78.8-30.6-168.8-51.6-300.5-57.5-132-6-174.2-7.5-510.4-7.5-336.3 0-378.4 1.4-510.5 7.5" fill="#000000"></path></svg>
  );
}

/** Lucide "clipboard-list" — used for orders in the account dropdown. */
export function ClipboardListIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" {...props}><rect width="8" height="4" x="8" y="2" rx="1" ry="1" /><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" /><path d="M12 11h4" /><path d="M12 16h4" /><path d="M8 11h.01" /><path d="M8 16h.01" /></svg>
  );
}

/** Lucide "user-round" — used for the account page in the account dropdown. */
export function UserRoundIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" {...props}><circle cx="12" cy="8" r="5" /><path d="M20 21a8 8 0 0 0-16 0" /></svg>
  );
}

/** Lucide "log-out" — used for logout in the account dropdown. */
export function LogOutIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="m16 17 5-5-5-5" /><path d="M21 12H9" /><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /></svg>
  );
}

/** Lucide "clock" — recent searches. */
export function ClockIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" {...props}><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></svg>
  );
}

/** Lucide "trending-up" — trending searches. */
export function TrendingUpIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M16 7h6v6" /><path d="m22 7-8.5 8.5-5-5L2 17" /></svg>
  );
}

/** Lucide "x" — remove / close. */
export function XIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
  );
}

/** Lucide "folder" — category suggestions. */
export function FolderIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z" /></svg>
  );
}

export function FlameIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M12 3q1 4 4 6.5t3 5.5a1 1 0 0 1-14 0 5 5 0 0 1 1-3 1 1 0 0 0 5 0c0-2-1.5-3-1.5-5q0-2 2.5-4" /></svg>
  );
}

export function StarIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z" /></svg>
  );
}

export function LayersArrowUpIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M12 12V2" /><path d="M2 17.002a1 1 0 00.58.91l8.6 3.91a2 2 0 001.65 0l8.58-3.9a1 1 0 00.59-.92" /><path d="M7.674 8.774 2.58 11.09a1 1 0 000 1.822l8.6 3.91a2 2 0 001.65 0l8.58-3.9a1 1 0 00.59-.92 1 1 0 00-.59-.922l-5.078-2.308" /><path d="m9 5 3-3 3 3" /></svg>
  );
}

/** Lucide "star" for ratings (the plain `StarIcon` above is the 2px decorative one). Pass `filled` for a solid gold star (ratings); the
 * outline keeps the site's 1px stroke weight like the other icons. */
export const STAR_GOLD = "#F2B01E";

export function RatingStarIcon({ filled = false, ...props }: SVGProps<SVGSVGElement> & { filled?: boolean }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill={filled ? STAR_GOLD : "none"} stroke={filled ? STAR_GOLD : "currentColor"} strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}><path d="M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z" /></svg>
  );
}

const strokeProps = {
  xmlns: "http://www.w3.org/2000/svg",
  width: 24,
  height: 24,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

/** Lucide "eye" — show password. */
export function EyeIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...strokeProps} {...props}><path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0" /><circle cx="12" cy="12" r="3" /></svg>
  );
}

/** Lucide "eye-off" — hide password. */
export function EyeOffIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...strokeProps} {...props}><path d="M10.733 5.076a10.744 10.744 0 0 1 11.205 6.575 1 1 0 0 1 0 .696 10.747 10.747 0 0 1-1.444 2.49" /><path d="M14.084 14.158a3 3 0 0 1-4.242-4.242" /><path d="M17.479 17.499a10.75 10.75 0 0 1-15.417-5.151 1 1 0 0 1 0-.696 10.75 10.75 0 0 1 4.446-5.143" /><path d="m2 2 20 20" /></svg>
  );
}

/** Lucide "check" — satisfied requirement / success. */
export function CheckIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...strokeProps} {...props}><path d="M20 6 9 17l-5-5" /></svg>
  );
}

/** Lucide "circle-alert" — inline error marker. */
export function AlertCircleIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...strokeProps} {...props}><circle cx="12" cy="12" r="10" /><line x1="12" x2="12" y1="8" y2="12" /><line x1="12" x2="12.01" y1="16" y2="16" /></svg>
  );
}

/** Lucide "smartphone" — mobile number field. */
export function SmartphoneIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...strokeProps} {...props}><rect width="14" height="20" x="5" y="2" rx="2" ry="2" /><path d="M12 18h.01" /></svg>
  );
}

/** Lucide "trash-2" — remove a cart line. */
export function TrashIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...strokeProps} strokeWidth={1.4} {...props}><path d="M10 11v6" /><path d="M14 11v6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" /><path d="M3 6h18" /><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
  );
}

/** Lucide "arrow-left" — "continue" in an RTL flow (forward points left). */
export function ArrowLeftIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...strokeProps} {...props}><path d="m12 19-7-7 7-7" /><path d="M19 12H5" /></svg>
  );
}

/** Lucide "arrow-right" — "back" in an RTL flow. */
export function ArrowRightIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...strokeProps} {...props}><path d="M5 12h14" /><path d="m12 5 7 7-7 7" /></svg>
  );
}

/** Lucide "tag" — coupon field. */
export function TagIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...strokeProps} {...props}><path d="M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z" /><circle cx="7.5" cy="7.5" r=".5" fill="currentColor" /></svg>
  );
}

/** Lucide "shopping-bag" — empty-cart state. */
export function BagIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...strokeProps} {...props}><path d="M16 10a4 4 0 0 1-8 0" /><path d="M3.103 6.034h17.794" /><path d="M3.4 5.467a2 2 0 0 0-.4 1.2V20a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6.667a2 2 0 0 0-.4-1.2l-2-2.667A2 2 0 0 0 17 2H7a2 2 0 0 0-1.6.8z" /></svg>
  );
}

/** Lucide "chevron-left" — "next" in an RTL carousel. */
export function ChevronLeftIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...strokeProps} {...props}><path d="m15 18-6-6 6-6" /></svg>
  );
}

/** Lucide "chevron-right" — "previous" in an RTL carousel. */
export function ChevronRightIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...strokeProps} {...props}><path d="m9 18 6-6-6-6" /></svg>
  );
}

/** Lucide "newspaper" — header «تی‌مگ» (magazine) link. */
export function NewspaperIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...strokeProps} {...props}><path d="M15 18h-5" /><path d="M18 14h-8" /><path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-4 0v-9a2 2 0 0 1 2-2h2" /><rect width="8" height="4" x="10" y="6" rx="1" /></svg>
  );
}

/** Lucide "list-sort-descending" — header «دسته‌بندی‌ها» trigger. */
export function ListSortDescendingIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...strokeProps} {...props}><path d="M15 12H3" /><path d="M3 5h18" /><path d="M9 19H3" /></svg>
  );
}

/** Lucide "shirt" (t-shirt) — «مردانه» in the category menu. */
export function ShirtIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...strokeProps} {...props}><path d="M20.38 3.46 16 2a4 4 0 0 1-8 0L3.62 3.46a2 2 0 0 0-1.34 2.23l.58 3.47a1 1 0 0 0 .99.84H6v10c0 1.1.9 2 2 2h8a2 2 0 0 0 2-2V10h2.15a1 1 0 0 0 .99-.84l.58-3.47a2 2 0 0 0-1.34-2.23z" /></svg>
  );
}

const WOMEN_PATH =
  "M53.9,19.43c-0.29-0.02-0.56-0.09-0.8-0.21c-0.39-0.08-0.8-0.13-1.22-0.14c-2.72-0.11-5.97,1.14-8.99,4.4 c-0.07,0.08-0.15,0.15-0.23,0.22c-0.89,0.75-2.22,0.63-2.97-0.26c-2.59-3.1-5.59-4.32-8.24-4.26c-1.29,0.03-2.5,0.36-3.54,0.93 c-1,0.55-1.83,1.31-2.38,2.21c-0.83,1.37-1.04,3.11-0.28,4.98l1.45,3.57l2.64,6.49c4.26,8.43,1.34,11.18-3.23,15.5 c-0.86,0.81-1.8,1.7-2.74,2.7c-2.8,3-5.14,5.74-7.23,8.82c-2.1,3.1-3.99,6.59-5.91,11.13c-1.99,4.72-3.48,9.05-4.46,13.46 c-0.98,4.37-1.46,8.85-1.46,13.9c0,0.63-0.03,1.53-0.06,2.38c-0.11,3.35-0.19,5.63,3.79,7c1.03,0.36,2.12,0.48,3.24,0.45 c1.16-0.04,2.38-0.25,3.62-0.57c0.72-0.21,1.53-0.03,2.09,0.53c2.46,2.49,4.9,3.86,7.31,4.21c2.35,0.34,4.77-0.27,7.25-1.74 c0.76-0.49,1.79-0.45,2.51,0.17c2.49,2.13,4.88,3.27,7.17,3.36c2.22,0.08,4.48-0.85,6.77-2.85c0.62-0.57,1.55-0.74,2.35-0.34 c3.14,1.53,5.87,2.03,8.24,1.56c2.28-0.45,4.3-1.84,6.09-4.09c0.58-0.82,1.69-1.13,2.63-0.68c2.02,0.98,3.76,1.4,5.22,1.2 c1.3-0.18,2.44-0.9,3.41-2.21c2.21-2.99,1.97-8.54,1.76-13.25c-0.06-1.41-0.12-2.76-0.12-3.79C76.77,85.1,74,77.39,69.97,70.59 c-4.08-6.87-9.47-12.84-15.48-18.37l-0.02-0.02c-0.94-0.84-1.68-1.71-2.25-2.61c-0.59-0.93-1-1.87-1.26-2.83 c-0.37-1.41-0.41-2.81-0.2-4.21c0.19-1.31,0.58-2.61,1.09-3.89c0.02-0.04,0.03-0.08,0.05-0.12l3.64-8.03l1.7-3.74 c0.79-1.74,0.71-3.37,0.03-4.65c-0.45-0.85-1.16-1.57-2.05-2.09C54.81,19.78,54.37,19.58,53.9,19.43L53.9,19.43z M51.91,14.87V2.11 c0-1.17,0.95-2.11,2.11-2.11c1.17,0,2.11,0.95,2.11,2.11v13.67c0.42,0.18,0.82,0.38,1.2,0.61c1.57,0.92,2.83,2.21,3.65,3.75 c1.26,2.38,1.45,5.31,0.08,8.34l-1.7,3.74l-3.62,7.99c-0.39,1-0.69,1.98-0.82,2.92c-0.13,0.88-0.11,1.73,0.1,2.55 c0.14,0.54,0.38,1.08,0.73,1.63c0.37,0.58,0.87,1.16,1.53,1.75c0.02,0.02,0.04,0.04,0.06,0.06c6.28,5.78,11.93,12.05,16.25,19.32 c4.36,7.34,7.34,15.69,8.22,25.58c0.01,0.06,0.01,0.12,0.01,0.18h0.01c0,1.24,0.05,2.4,0.1,3.62c0.24,5.39,0.51,11.75-2.59,15.94 c-1.68,2.28-3.77,3.54-6.23,3.88c-1.88,0.26-3.92-0.06-6.11-0.92c-2.2,2.38-4.73,3.89-7.59,4.46c-2.93,0.58-6.14,0.16-9.65-1.33 c-2.81,2.16-5.7,3.15-8.67,3.04c-2.9-0.11-5.77-1.27-8.62-3.44c-2.92,1.48-5.85,2.05-8.78,1.62c-3.02-0.44-5.97-1.94-8.83-4.58 c-1.15,0.25-2.3,0.41-3.45,0.45c-1.6,0.05-3.18-0.14-4.74-0.68c-6.93-2.39-6.81-5.92-6.63-11.11c0.02-0.61,0.04-1.25,0.04-2.24 c0-5.32,0.52-10.1,1.58-14.81c1.04-4.68,2.61-9.24,4.69-14.18c2.03-4.8,4.05-8.53,6.3-11.86c2.26-3.34,4.71-6.22,7.63-9.33 c1.03-1.1,2.02-2.04,2.94-2.9c3.18-3,5.21-4.91,2.32-10.59c-0.04-0.07-0.07-0.15-0.1-0.22l-2.65-6.52l-1.45-3.57 c-1.31-3.22-0.91-6.3,0.59-8.76c0.94-1.54,2.3-2.82,3.94-3.72c0.43-0.24,0.88-0.44,1.34-0.63V2.11 c0-1.17,0.95-2.11,2.11-2.11 c1.17,0,2.11,0.95,2.11,2.11v12.86c3.24-0.05,6.78,1.15,9.91,4.11C44.87,15.99,48.61,14.77,51.91,14.87L51.91,14.87z";
// The supplied icon is a filled outline (≈4.22 units thick in an 82.07×122.88
// box). It is scaled to a 20-unit-tall glyph on the 24-unit icon grid and a
// stroke is added on top so the final line weight equals `strokeWidth` — the
// same weight as the stroked icons next to it.
const WOMEN_SCALE = 20 / 122.88;
const WOMEN_OUTLINE_THICKNESS = 4.22;

/** «زنانه» in the category menu. Line weight follows `strokeWidth` like the other icons. */
export function DressIcon({ strokeWidth = 1.6, ...props }: SVGProps<SVGSVGElement>) {
  const weight = Number(strokeWidth);
  const extraStroke = Math.max(0, weight / WOMEN_SCALE - WOMEN_OUTLINE_THICKNESS);
  return (
    <svg {...strokeProps} {...props}>
      <g transform={`translate(${(24 - 82.07 * WOMEN_SCALE) / 2} 2) scale(${WOMEN_SCALE})`}>
        <path d={WOMEN_PATH} fill="currentColor" stroke="currentColor" strokeWidth={extraStroke} />
      </g>
    </svg>
  );
}

const KIDS_PATH =
  "M124.848,196.436h-0.015c0.015,0,0.029,0,0.037,0.008L124.848,196.436z M387.131,196.444c0,0,0.015,0,0.022-0.008h-0.007L387.131,196.444z M110.552,203.576c0.004-0.007,0.011-0.014,0.015-0.022l0.261-0.559L110.552,203.576z M506.527,262.334c-0.647-2.463-6.691-25.053-17.092-55.264c-10.99-31.903-26.76-72.225-46.488-106.59 c-15.966-27.77-30.756-47.586-46.009-62.774c-15.225-15.188-30.857-25.576-47.578-34.474c-2.288-1.213-4.562-1.947-6.916-2.456 c-2.339-0.501-4.765-0.748-7.278-0.748c-4.22,0.007-8.703,0.698-13.192,2.492c-2.237,0.908-4.468,2.099-6.581,3.661 c-2.121,1.554-4.112,3.486-5.796,5.782l1.366-1.86l-1.366,1.852c-5.172,7.002-12.218,13.177-21.109,17.637 c-8.898,4.453-19.656,7.228-32.484,7.235c-12.988-0.008-23.68-2.564-32.44-6.85c-8.76-4.3-15.676-10.337-21.036-17.854 c-1.671-2.34-3.646-4.315-5.768-5.898c-3.174-2.39-6.61-3.922-9.958-4.874C183.437,0.4,180.125,0,176.958,0 c-2.535,0-4.983,0.254-7.35,0.762c-2.357,0.516-4.628,1.242-6.919,2.448l0.556-0.298l-0.588,0.312l-0.007,0.008 c-16.721,8.898-32.353,19.286-47.592,34.474c-15.24,15.189-30.036,35.005-45.995,62.774 c-19.729,34.365-35.506,74.687-46.496,106.59c-10.395,30.21-16.438,52.801-17.091,55.264c-1.178,3.349-1.795,6.842-1.795,10.329 c0,4.692,1.06,9.385,3.167,13.693c3.835,7.852,10.787,13.735,19.162,16.22l30.254,8.978c2.934,0.865,5.927,1.294,8.876,1.294 c5.942-0.008,11.68-1.7,16.606-4.795c4.925-3.087,9.051-7.62,11.658-13.205l21.596-46.22L130.6,449.821h0.015 c0.537,15.916,6.101,31.155,16.358,42.77c5.193,5.862,11.614,10.765,19.045,14.157c7.424,3.4,15.843,5.26,24.828,5.252h0.102h0.022 h0.123c8.455,0.008,16.526-1.838,23.753-5.114c10.86-4.911,19.83-12.966,26.223-22.766c6.269-9.632,10.082-21.007,10.736-33.028 h0.007l4.192-41.433l4.169,41.331c0.872,16.148,7.417,31.118,17.986,42.298c5.353,5.651,11.76,10.329,18.995,13.598 c7.228,3.276,15.291,5.121,23.761,5.114h0.094h0.022h0.124c8.985,0.008,17.396-1.852,24.828-5.252 c11.164-5.092,19.983-13.554,25.932-23.622c5.876-9.922,9.072-21.407,9.479-33.305l15.603-201.186l21.603,46.212 c2.608,5.586,6.74,10.118,11.659,13.205c4.925,3.095,10.67,4.787,16.612,4.795c2.949,0,5.942-0.428,8.877-1.294l30.246-8.97 c8.383-2.492,15.327-8.376,19.162-16.227c2.106-4.308,3.167-9,3.167-13.693C508.321,269.177,507.704,265.683,506.527,262.334z M484.394,276.216c-0.995,2.041-2.804,3.566-4.976,4.213l-30.247,8.97c-0.777,0.233-1.547,0.342-2.303,0.342 c-1.525,0-3.036-0.443-4.314-1.249c-1.294-0.814-2.324-1.948-3.022-3.429l-37.91-81.108l-0.174-0.378 c-1.068-2.28-2.768-4.154-4.787-5.426c-2.019-1.278-4.387-1.99-6.864-1.99c-0.879,0-1.765,0.095-2.644,0.276 c-2.913,0.61-5.462,2.208-7.257,4.373c-1.67,1.997-2.695,4.568-2.89,7.292h-0.044l-18.624,240.23l-0.007,0.298 c-0.276,11.179-4.22,21.472-10.598,28.634c-3.196,3.602-6.973,6.464-11.346,8.462c-4.387,1.997-9.385,3.16-15.232,3.166h-0.11 h-0.014h-0.116c-5.144-0.007-9.88-1.089-14.238-3.058c-6.537-2.95-12.232-7.954-16.38-14.331 c-4.154-6.364-6.719-14.041-7.068-22.09l-0.014-0.326l-9.436-93.297h-17.774h-17.782l-9.428,93.297l-0.015,0.326 c-0.465,10.729-4.896,20.804-11.709,27.98c-3.414,3.596-7.38,6.473-11.738,8.441c-4.366,1.969-9.109,3.051-14.238,3.058h-0.101 h-0.022h-0.124c-5.84-0.007-10.852-1.169-15.224-3.166c-6.552-2.993-11.826-7.94-15.661-14.39 c-3.821-6.429-6.08-14.332-6.29-22.706v-0.298l-18.639-240.23h-0.029c-0.203-2.724-1.235-5.296-2.905-7.292 c-1.787-2.172-4.344-3.771-7.264-4.373c-0.864-0.181-1.758-0.276-2.629-0.276c-2.477,0-4.852,0.712-6.872,1.99 c-2.012,1.264-3.705,3.131-4.765,5.404l-38.099,81.508h0.008c-0.698,1.475-1.744,2.615-3.022,3.429 c-1.293,0.806-2.797,1.249-4.315,1.249c-0.755,0-1.525-0.109-2.309-0.342l-30.247-8.97c-2.18-0.646-3.981-2.172-4.976-4.213 c-0.545-1.119-0.821-2.332-0.821-3.552c0-1.002,0.189-1.997,0.567-2.956l0.247-0.632l0.174-0.661l0.058-0.232 c0.669-2.55,6.944-25.925,17.6-56.527c10.634-30.596,25.721-68.454,43.663-99.661c15.269-26.563,28.882-44.57,42.276-57.914 c13.41-13.336,26.658-22.184,42.138-30.45c0.051-0.022,0.458-0.189,1.068-0.306c0.64-0.124,1.496-0.217,2.382-0.217 c1.598-0.008,3.313,0.305,4.49,0.799c0.602,0.247,1.075,0.523,1.438,0.792c0.356,0.269,0.603,0.523,0.814,0.821 c7.452,10.489,17.477,19.234,29.695,25.213c12.224,5.993,26.57,9.21,42.61,9.203c16.198,0.007,30.653-3.573,42.842-9.682 c12.182-6.109,22.068-14.71,29.338-24.567c0.24-0.326,0.523-0.617,0.922-0.908c0.581-0.436,1.438-0.872,2.528-1.17 c1.075-0.312,2.354-0.479,3.53-0.472c0.936-0.007,1.816,0.101,2.44,0.24c0.32,0.066,0.567,0.138,0.727,0.196l0.159,0.058h0.015 c15.465,8.266,28.721,17.113,42.13,30.45c13.394,13.344,27.007,31.351,42.268,57.914c18.53,32.208,33.995,71.513,44.68,102.595 c5.353,15.545,9.53,29.056,12.363,38.651c1.409,4.794,2.484,8.615,3.211,11.215c0.363,1.308,0.632,2.31,0.813,2.978 c0.087,0.334,0.16,0.581,0.204,0.748l0.058,0.232l0.174,0.661l0.247,0.632c0.378,0.951,0.559,1.954,0.559,2.956 C485.214,273.884,484.938,275.097,484.394,276.216z M256.004,268.901c-9.124,0-16.526,7.394-16.526,16.518c0,9.13,7.402,16.525,16.526,16.525 c9.124,0,16.518-7.395,16.518-16.525C272.522,276.295,265.127,268.901,256.004,268.901z M256.004,193.226c-9.124,0-16.526,7.395-16.526,16.518c0,9.131,7.402,16.525,16.526,16.525 c9.124,0,16.518-7.394,16.518-16.525C272.522,200.62,265.127,193.226,256.004,193.226z M256.004,117.551c-9.124,0-16.526,7.395-16.526,16.526c0,9.124,7.402,16.518,16.526,16.518 c9.124,0,16.518-7.394,16.518-16.518C272.522,124.946,265.127,117.551,256.004,117.551z";
// The supplied baby romper is a filled outline (≈23.2 units thick; glyph box
// x 3.75–508, y 0–511.75). Scaled to a 20-unit-tall glyph on the 24 grid and
// stroked on top so the final line weight equals `strokeWidth`, like the
// other icons.
const KIDS_SCALE = 20 / 511.75;
const KIDS_OUTLINE_THICKNESS = 23.2;
const KIDS_BOX_X = 3.75;
const KIDS_BOX_WIDTH = 504.25;

/** «بچگانه» in the category menu. Line weight follows `strokeWidth` like the other icons. */
export function BabyIcon({ strokeWidth = 1.6, ...props }: SVGProps<SVGSVGElement>) {
  const weight = Number(strokeWidth);
  const extraStroke = Math.max(0, weight / KIDS_SCALE - KIDS_OUTLINE_THICKNESS);
  const x = (24 - KIDS_BOX_WIDTH * KIDS_SCALE) / 2 - KIDS_BOX_X * KIDS_SCALE;
  return (
    <svg {...strokeProps} {...props}>
      <g transform={`translate(${x} 2) scale(${KIDS_SCALE})`}>
        <path d={KIDS_PATH} fill="currentColor" stroke="currentColor" strokeWidth={extraStroke} />
      </g>
    </svg>
  );
}

/** Lucide "chevron-down" — dropdown trigger caret. */
export function ChevronDownIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...strokeProps} {...props}><path d="m6 9 6 6 6-6" /></svg>
  );
}

/** Lucide "zoom-in" — product image lightbox. */
export function ZoomInIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...strokeProps} {...props}><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /><path d="M11 8v6" /><path d="M8 11h6" /></svg>
  );
}

/** Lucide "zoom-out" — product image lightbox. */
export function ZoomOutIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...strokeProps} {...props}><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /><path d="M8 11h6" /></svg>
  );
}

/** Lucide "ruler" — product sizing-table button. */
export function RulerIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...strokeProps} {...props}><path d="M21.3 15.3a2.4 2.4 0 0 1 0 3.4l-2.6 2.6a2.4 2.4 0 0 1-3.4 0L2.7 8.7a2.4 2.4 0 0 1 0-3.4l2.6-2.6a2.4 2.4 0 0 1 3.4 0Z" /><path d="m14.5 12.5 2-2" /><path d="m11.5 9.5 2-2" /><path d="m8.5 6.5 2-2" /><path d="m17.5 15.5 2-2" /></svg>
  );
}

/**
 * The store's fire icon: a red flame with an orange→yellow core. Its own
 * colours are kept (it does not follow `currentColor`), and it reads well on
 * dark and light surfaces alike. The gradient id is fixed, so render it once
 * per page.
 */
export function FireIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 384 511.4" fillRule="evenodd" clipRule="evenodd" {...props}>
      <defs>
        <linearGradient id="trends-fire-core" gradientUnits="userSpaceOnUse" x1="163.52" y1="286.47" x2="163.52" y2="500.71">
          <stop offset="0" stopColor="#FB6404" />
          <stop offset="1" stopColor="#F2BE10" />
        </linearGradient>
      </defs>
      <path fill="#E20919" d="M77.46 228.43C65.33 119.85 128.78 43.48 247.72 0c-72.85 94.5 62.09 196.88 69.53 295.03 17.44-29.75 27.34-69.48 29.3-122.55 89.18 139.92 15.25 368.59-181.02 335.73-18.02-3.01-35.38-8.7-51.21-17.17C42.76 452.8 0 369.53 0 290c0-50.69 21.68-95.95 49.74-131.91 3.75 35.23 11.73 61.51 27.72 70.34z" />
      <path fill="url(#trends-fire-core)" d="M139.16 372.49c-21.83-57.66-18.81-150.75 42.33-183.41.43 107.03 103.57 120.64 84.44 234.9 17.64-20.39 26.51-53.02 28.1-78.75 27.96 65.38 6.04 117.72-33.81 144.37-121.15 81-225.48-83.23-156.11-173.26 2.08 20.07 26.14 51.12 35.05 56.15z" />
    </svg>
  );
}

/**
 * «جدیدترین محصولات» icon: the "NEW" starburst badge in a black/purple theme (dark
 * purple body, bright purple inner burst, white lettering). Own colours
 * (not `currentColor`); no ids, so it can render more than once per page.
 */
export function NewArrivalsStarIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 122.88 117.29" {...props}>
      <path
        fill="#0f0817"
        d="M61.39,7.26,77.3.37A4.43,4.43,0,0,1,82.87,2.2L91.6,17l16.91,3.78A4.43,4.43,0,0,1,112,25.56L110.3,42.69l11.47,13a4.44,4.44,0,0,1-.24,6.12l-11.2,12.64L112,91.74a4.41,4.41,0,0,1-3.6,4.76l-16.65,3.68-8.84,14.93a4.44,4.44,0,0,1-5.77,1.73L61.49,110l-15.91,6.88A4.43,4.43,0,0,1,40,115.1l-8.73-14.84L14.37,96.47a4.42,4.42,0,0,1-3.45-4.73L12.58,74.6l-11.47-13a4.43,4.43,0,0,1,.24-6.12L12.54,42.83,10.92,25.56a4.42,4.42,0,0,1,3.6-4.77l16.65-3.68L40,2.18A4.42,4.42,0,0,1,45.78.46l15.61,6.8Z"
      />
      <polygon
        fill="#7c3aed"
        fillRule="evenodd"
        points="61.37 12.08 79.05 4.43 88.76 20.93 107.56 25.14 105.71 44.19 118.44 58.65 105.75 72.97 107.56 92.15 88.86 96.28 79.05 112.86 61.51 105.21 43.82 112.86 34.12 96.36 15.32 92.15 17.17 73.1 4.44 58.65 17.13 44.32 15.32 25.14 34.01 21.01 43.82 4.43 61.37 12.08 61.37 12.08"
      />
      <path
        fill="#0f0817"
        d="M38.93,77.88l-.23-.2a3.56,3.56,0,0,1-2.57,2.7l-7.37,2a3.57,3.57,0,0,1-4.36-2.52L18.23,56.79a3.56,3.56,0,0,1,2.52-4.36l6.93-1.85a3.55,3.55,0,0,1,3.46.94l.13.11a3.55,3.55,0,0,1,2.57-2.7l7.37-2a3.59,3.59,0,0,1,2,0,3.61,3.61,0,0,1,1.71-1l16.22-4.34a3.26,3.26,0,0,1,.76-.12l.2-.1a3.69,3.69,0,0,1,.56-.19l7.66-2.05a3.51,3.51,0,0,1,2.54.27,3.57,3.57,0,0,1,2.07-1.51l5.64-1.51a3.54,3.54,0,0,1,2.55.27,3.59,3.59,0,0,1,2.06-1.5l7.7-2.07a3.56,3.56,0,0,1,4.36,2.52,3.31,3.31,0,0,1,.12.7l2.54,23.86A3.55,3.55,0,0,1,97.26,64l-9.62,2.58a3.57,3.57,0,0,1-2-.06,3.61,3.61,0,0,1-1.75,1.08l-9.62,2.58a3.55,3.55,0,0,1-2.72-.38,3.56,3.56,0,0,1-2.18,1.69l-16.41,4.4a3.5,3.5,0,0,1-2,0,3.53,3.53,0,0,1-1.71,1l-6.93,1.86a3.55,3.55,0,0,1-3.36-.85Z"
      />
      <path
        fill="#fff"
        d="M41.37,75.29l-7.83-6.67A3.93,3.93,0,0,1,32.7,67l-.15,0,2.66,10-7.37,2L21.67,55.87,28.6,54l7.83,6.67a4,4,0,0,1,.85,1.67l.14,0-2.66-10,7.37-2,6.17,23-6.93,1.86Zm23-15.5-7.38,2,.75,2.8,9-2.42,1.58,5.9L52,72.45,45.82,49.4,62,45.06l.66,6.14-7.93,2.13.83,3.09,7.37-2,1.44,5.34ZM86.08,38.61l7.7-2.06,2.56,24-9.62,2.58-4-8-.44.12.61,8.93L73.3,66.74,63.51,44.66l7.71-2.06L76.4,55l.22-.06-.79-13.58,5.64-1.51L87.53,52l.23,0L86.08,38.61Z"
      />
    </svg>
  );
}

/** «پرفروش‌ترین محصولات» icon: a medal with a star on two ribbon tails, in a black/purple theme. Own colours. */
export function TopSellingMedalIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 360 511.48" fillRule="evenodd" clipRule="evenodd" {...props}>
      <polygon fill="#0f0817" points="144.83,306.61 296.28,280.53 360,429.51 281.2,428.61 216.45,481.14" />
      <polygon fill="#6d28d9" points="231.94,290.08 69.57,294.38 0,459.86 78.8,458.95 143.55,511.48" />
      <path fill="#150b24" d="M183.21 0.03c9.35,-0.4 16.72,2.86 24.15,7.59 9.44,5.98 20.06,17.8 33.17,25.3 18.45,10.54 52.61,-4 70.11,21.99 10.21,15.16 10.69,27.04 11.45,38.78 0.82,12.67 3.04,24.32 16,41.47 21.47,28.38 25.94,47.27 14.88,66.96 -7.54,13.42 -23.41,20.88 -27.09,29.38 -7.81,18.09 0.83,31.72 -9.87,52.81 -7.43,14.62 -18.89,24.26 -34.16,29.18 -12.88,4.14 -25.8,-1.85 -36.1,2.48 -18.12,7.61 -31.48,25.3 -45.89,29.77 -5.57,1.73 -11.11,2.58 -16.65,2.54 -5.53,0.04 -11.08,-0.81 -16.64,-2.54 -14.42,-4.47 -27.78,-22.16 -45.9,-29.77 -10.3,-4.33 -23.22,1.66 -36.1,-2.48 -15.26,-4.92 -26.73,-14.56 -34.16,-29.18 -10.7,-21.09 -2.06,-34.72 -9.87,-52.81 -3.68,-8.5 -19.55,-15.96 -27.09,-29.38 -11.06,-19.69 -6.58,-38.58 14.88,-66.96 12.96,-17.15 15.18,-28.8 16,-41.47 0.76,-11.74 1.24,-23.62 11.45,-38.78 17.5,-25.99 51.66,-11.45 70.11,-21.99 13.12,-7.5 23.73,-19.32 33.17,-25.3 7.44,-4.73 14.81,-7.99 24.15,-7.59z" />
      <path fill="#3b1d6e" d="M183.21 0.04c9.35,-0.41 16.71,2.86 24.15,7.58 9.44,5.98 20.06,17.8 33.17,25.3 14.67,8.38 39.28,0.91 57.54,10.56l-206.12 271.42c-2.45,-0.2 -4.92,-0.62 -7.38,-1.41 -15.27,-4.92 -26.73,-14.55 -34.16,-29.18 -10.7,-21.09 -2.06,-34.72 -9.87,-52.81 -3.68,-8.5 -19.55,-15.96 -27.09,-29.38 -11.06,-19.69 -6.58,-38.58 14.87,-66.96 12.97,-17.14 15.19,-28.8 16.01,-41.47 0.76,-11.74 1.24,-23.62 11.44,-38.78 17.51,-26 51.68,-11.45 70.12,-21.99 13.12,-7.5 23.74,-19.32 33.17,-25.3 7.44,-4.72 14.81,-7.99 24.15,-7.58z" />
      <circle fill="#8b5cf6" cx="182.71" cy="176.83" r="130.04" />
      <path fill="#1e0f3a" d="M182.71 72.88c57.41,0 103.94,46.54 103.94,103.95 0,57.41 -46.53,103.95 -103.94,103.95 -57.41,0 -103.95,-46.54 -103.95,-103.95 0,-57.41 46.54,-103.95 103.95,-103.95z" />
      <path fill="#3b1d6e" d="M182.71 72.88c27.48,0 52.49,10.67 71.07,28.09l-127.44 163.2c-4.62,-2.98 -8.99,-6.33 -13.07,-9.99 -21.18,-19.02 -34.51,-46.63 -34.51,-77.35 0,-57.41 46.54,-103.95 103.95,-103.95z" />
      <path fill="#c4b5fd" fillRule="nonzero" d="M185.78 116.08l16.31 38.19 41.36 3.71c1.83,0.16 3.18,1.77 3.02,3.59 -0.07,0.89 -0.49,1.67 -1.12,2.21l0 0 -31.29 27.33 9.26 40.5c0.41,1.79 -0.71,3.57 -2.5,3.98 -0.92,0.21 -1.83,0.02 -2.56,-0.45l-35.55 -21.26 -35.66 21.32c-1.57,0.94 -3.61,0.43 -4.55,-1.14 -0.46,-0.77 -0.57,-1.64 -0.39,-2.45l0 0 9.26 -40.5 -31.3 -27.33c-1.38,-1.2 -1.52,-3.3 -0.31,-4.68 0.61,-0.7 1.46,-1.08 2.32,-1.13l41.26 -3.7 16.32 -38.21c0.72,-1.69 2.67,-2.47 4.35,-1.75 0.84,0.35 1.45,1 1.77,1.77l0 0z" />
    </svg>
  );
}
