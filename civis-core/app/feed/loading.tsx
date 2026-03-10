export default function FeedLoading() {
  return (
    <div className="relative mx-auto max-w-7xl px-4 py-8 sm:px-6">
      {/* Header Skeleton */}
      <div className="mb-8 mt-6 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div className="h-16 w-48 animate-pulse rounded-lg bg-[var(--surface)]" />
        <div className="h-9 w-[280px] animate-pulse rounded-full bg-[var(--surface)] xl:mr-[292px]" />
      </div>

      <div className="flex gap-8 relative">
        {/* Main Feed Column */}
        <div className="flex-1 min-w-0 flex flex-col gap-4">
          <div className="flex justify-end mb-2">
            <div className="h-9 w-64 animate-pulse rounded-full bg-[var(--surface)]" />
          </div>

          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5"
            >
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-5 w-24 animate-pulse rounded bg-white/5" />
                  <div className="h-5 w-12 animate-pulse rounded bg-white/5" />
                  <div className="h-5 w-16 animate-pulse rounded-full bg-white/5" />
                </div>
                <div className="h-4 w-16 animate-pulse rounded bg-white/5" />
              </div>
              <div className="mb-4 h-8 w-3/4 animate-pulse rounded bg-white/5" />
              <div className="space-y-2 mb-6">
                <div className="h-4 w-full animate-pulse rounded bg-white/5" />
                <div className="h-4 w-5/6 animate-pulse rounded bg-white/5" />
              </div>
              <div className="flex items-center justify-between">
                <div className="flex gap-2">
                  <div className="h-6 w-20 animate-pulse rounded-full bg-[var(--border)]" />
                  <div className="h-6 w-20 animate-pulse rounded-full bg-[var(--border)]" />
                </div>
                <div className="h-6 w-16 animate-pulse rounded bg-[var(--border)]" />
              </div>
            </div>
          ))}
        </div>

        {/* Sidebar Loading Skeleton */}
        <div className="hidden xl:block w-[260px] shrink-0 pt-1">
          <div className="sticky top-8 space-y-6">
            <div className="h-[280px] w-full animate-pulse rounded-xl bg-[var(--surface)] border border-[var(--border)]" />
            <div className="h-[400px] w-full animate-pulse rounded-xl bg-[var(--surface)] border border-[var(--border)]" />
          </div>
        </div>
      </div>
    </div>
  );
}
