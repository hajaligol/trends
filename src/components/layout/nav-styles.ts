/**
 * Shared class for the desktop header's text links (plain links and the
 * category menu triggers alike): an ink underline that scales in on
 * hover/when active. Mirrors `.main-nav a` in reference/prototype.html.
 */
export function navLinkClass(isActive: boolean): string {
  return `relative py-1.5 text-[0.93rem] text-ink after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:origin-center after:rounded-sm after:bg-ink after:transition-transform after:duration-200 hover:after:scale-x-100 ${
    isActive ? "after:scale-x-100" : "after:scale-x-0"
  }`;
}
