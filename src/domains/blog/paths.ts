/** Public URL helpers for T-Mag (kept free of server-only imports). */
export const BLOG_BASE = "/tmag";
export const BLOG_TITLE = "مجله مد و استایل تی‌مگ";
export const BLOG_DESCRIPTION =
  "تی‌مگ، مجله مد و استایل ترندز: راهنمای انتخاب سایز و رنگ، ایده‌های ست لباس، ترندهای فصل و نکات نگهداری از پوشاک.";
export const BLOG_PAGE_SIZE = 9;

export const blogPostHref = (slug: string) => `${BLOG_BASE}/${encodeURIComponent(slug)}`;
export const blogCategoryHref = (slug: string, page = 1) =>
  `${BLOG_BASE}/category/${encodeURIComponent(slug)}${page > 1 ? `?page=${page}` : ""}`;
export const blogListHref = (page = 1) => (page > 1 ? `${BLOG_BASE}?page=${page}` : BLOG_BASE);
