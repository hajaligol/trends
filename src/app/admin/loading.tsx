/** Skeleton shown while any admin page's data loads — keeps the shell
 * steady instead of the content area going blank on navigation. */
export default function AdminLoading() {
  return (
    <div className="flex flex-col gap-6" role="status" aria-label="در حال بارگذاری">
      <div className="flex flex-col gap-3">
        <div className="h-8 w-48 animate-pulse rounded-full bg-ink/[0.07]" />
        <div className="h-4 w-80 max-w-full animate-pulse rounded-full bg-ink/[0.05]" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} className="h-[104px] animate-pulse rounded-[var(--radius-lg)] border border-line bg-white" />
        ))}
      </div>
      <div className="h-72 animate-pulse rounded-[var(--radius-lg)] border border-line bg-white" />
    </div>
  );
}
