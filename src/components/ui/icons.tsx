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

/** Lucide "mars" — «مردانه» in the category menu. */
export function MarsIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...strokeProps} {...props}><path d="M16 3h5v5" /><path d="m21 3-6.75 6.75" /><circle cx="10" cy="14" r="6" /></svg>
  );
}

/** Lucide "venus" — «زنانه» in the category menu. */
export function VenusIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...strokeProps} {...props}><path d="M12 15v7" /><path d="M9 19h6" /><circle cx="12" cy="9" r="6" /></svg>
  );
}

/** Lucide "baby" — «بچگانه» in the category menu. */
export function BabyIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...strokeProps} {...props}><path d="M10 16c.5.3 1.2.5 2 .5s1.5-.2 2-.5" /><path d="M15 12h.01" /><path d="M19.38 6.813A9 9 0 0 1 20.8 10.2a2 2 0 0 1 0 3.6 9 9 0 0 1-17.6 0 2 2 0 0 1 0-3.6A9 9 0 0 1 12 3c2 0 3.5 1.1 3.5 2.5s-.9 2.5-2 2.5c-.8 0-1.5-.4-1.5-1" /><path d="M9 12h.01" /></svg>
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
 * «جدیدترین محصولات» icon: a yellow star whose lower body shades from orange
 * to yellow, with a flat yellow highlight cap. Own colours (not
 * `currentColor`). The gradient id is fixed, so render it once per page.
 */
export function NewArrivalsStarIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 26.9 25.65" {...props}>
      <defs>
        <linearGradient id="trends-new-star-body" gradientUnits="userSpaceOnUse" x1="13.4" y1="5" x2="13.4" y2="25.65">
          <stop offset="0" stopColor="#FFB602" />
          <stop offset="1" stopColor="#F8D300" />
        </linearGradient>
      </defs>
      <path
        fill="url(#trends-new-star-body)"
        d="M14.1 0.43l3.44 8.05 8.72 0.78c0.39 0.03 0.67 0.37 0.64 0.76 -0.02 0.19 -0.1 0.35 -0.24 0.47l0 0 -6.6 5.76 1.95 8.54c0.09 0.38 -0.15 0.75 -0.53 0.84 -0.19 0.04 -0.39 0 -0.54 -0.1l-7.5 -4.48 -7.52 4.5c-0.33 0.2 -0.76 0.09 -0.96 -0.24 -0.1 -0.16 -0.12 -0.35 -0.08 -0.52h0l1.95 -8.54 -6.6 -5.76c-0.29 -0.25 -0.32 -0.7 -0.07 -0.99 0.14 -0.16 0.32 -0.23 0.5 -0.24l8.7 -0.78 3.44 -8.06c0.15 -0.36 0.56 -0.52 0.92 -0.37 0.16 0.07 0.29 0.21 0.36 0.37z"
      />
      <path
        fill="#FFD401"
        d="M14.1 0.43l3.44 8.05 8.72 0.78c0.39 0.03 0.67 0.37 0.64 0.76 -0.02 0.19 -0.1 0.35 -0.24 0.47l0 0 -1.18 1.03c-3.21 1.11 -7.42 1.78 -12.03 1.78 -4.61 0 -8.83 -0.67 -12.03 -1.78l-1.18 -1.03c-0.29 -0.25 -0.32 -0.7 -0.07 -0.99 0.14 -0.16 0.32 -0.23 0.5 -0.24l8.7 -0.78 3.44 -8.06c0.15 -0.36 0.56 -0.52 0.92 -0.37 0.16 0.07 0.29 0.21 0.36 0.37z"
      />
    </svg>
  );
}

/** «پرفروش‌ترین محصولات» icon: a gold medal with a star on two ribbon tails. Own colours. */
export function TopSellingMedalIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 360 511.48" fillRule="evenodd" clipRule="evenodd" {...props}>
      <polygon fill="#D0401B" points="144.83,306.61 296.28,280.53 360,429.51 281.2,428.61 216.45,481.14" />
      <polygon fill="#FF6600" points="231.94,290.08 69.57,294.38 0,459.86 78.8,458.95 143.55,511.48" />
      <path fill="#F5C800" d="M183.21 0.03c9.35,-0.4 16.72,2.86 24.15,7.59 9.44,5.98 20.06,17.8 33.17,25.3 18.45,10.54 52.61,-4 70.11,21.99 10.21,15.16 10.69,27.04 11.45,38.78 0.82,12.67 3.04,24.32 16,41.47 21.47,28.38 25.94,47.27 14.88,66.96 -7.54,13.42 -23.41,20.88 -27.09,29.38 -7.81,18.09 0.83,31.72 -9.87,52.81 -7.43,14.62 -18.89,24.26 -34.16,29.18 -12.88,4.14 -25.8,-1.85 -36.1,2.48 -18.12,7.61 -31.48,25.3 -45.89,29.77 -5.57,1.73 -11.11,2.58 -16.65,2.54 -5.53,0.04 -11.08,-0.81 -16.64,-2.54 -14.42,-4.47 -27.78,-22.16 -45.9,-29.77 -10.3,-4.33 -23.22,1.66 -36.1,-2.48 -15.26,-4.92 -26.73,-14.56 -34.16,-29.18 -10.7,-21.09 -2.06,-34.72 -9.87,-52.81 -3.68,-8.5 -19.55,-15.96 -27.09,-29.38 -11.06,-19.69 -6.58,-38.58 14.88,-66.96 12.96,-17.15 15.18,-28.8 16,-41.47 0.76,-11.74 1.24,-23.62 11.45,-38.78 17.5,-25.99 51.66,-11.45 70.11,-21.99 13.12,-7.5 23.73,-19.32 33.17,-25.3 7.44,-4.73 14.81,-7.99 24.15,-7.59z" />
      <path fill="#FFDD61" d="M183.21 0.04c9.35,-0.41 16.71,2.86 24.15,7.58 9.44,5.98 20.06,17.8 33.17,25.3 14.67,8.38 39.28,0.91 57.54,10.56l-206.12 271.42c-2.45,-0.2 -4.92,-0.62 -7.38,-1.41 -15.27,-4.92 -26.73,-14.55 -34.16,-29.18 -10.7,-21.09 -2.06,-34.72 -9.87,-52.81 -3.68,-8.5 -19.55,-15.96 -27.09,-29.38 -11.06,-19.69 -6.58,-38.58 14.87,-66.96 12.97,-17.14 15.19,-28.8 16.01,-41.47 0.76,-11.74 1.24,-23.62 11.44,-38.78 17.51,-26 51.68,-11.45 70.12,-21.99 13.12,-7.5 23.74,-19.32 33.17,-25.3 7.44,-4.72 14.81,-7.99 24.15,-7.58z" />
      <circle fill="#E37E00" cx="182.71" cy="176.83" r="130.04" />
      <path fill="#F5C800" d="M182.71 72.88c57.41,0 103.94,46.54 103.94,103.95 0,57.41 -46.53,103.95 -103.94,103.95 -57.41,0 -103.95,-46.54 -103.95,-103.95 0,-57.41 46.54,-103.95 103.95,-103.95z" />
      <path fill="#FFDD61" d="M182.71 72.88c27.48,0 52.49,10.67 71.07,28.09l-127.44 163.2c-4.62,-2.98 -8.99,-6.33 -13.07,-9.99 -21.18,-19.02 -34.51,-46.63 -34.51,-77.35 0,-57.41 46.54,-103.95 103.95,-103.95z" />
      <path fill="#E37E00" fillRule="nonzero" d="M185.78 116.08l16.31 38.19 41.36 3.71c1.83,0.16 3.18,1.77 3.02,3.59 -0.07,0.89 -0.49,1.67 -1.12,2.21l0 0 -31.29 27.33 9.26 40.5c0.41,1.79 -0.71,3.57 -2.5,3.98 -0.92,0.21 -1.83,0.02 -2.56,-0.45l-35.55 -21.26 -35.66 21.32c-1.57,0.94 -3.61,0.43 -4.55,-1.14 -0.46,-0.77 -0.57,-1.64 -0.39,-2.45l0 0 9.26 -40.5 -31.3 -27.33c-1.38,-1.2 -1.52,-3.3 -0.31,-4.68 0.61,-0.7 1.46,-1.08 2.32,-1.13l41.26 -3.7 16.32 -38.21c0.72,-1.69 2.67,-2.47 4.35,-1.75 0.84,0.35 1.45,1 1.77,1.77l0 0z" />
    </svg>
  );
}
