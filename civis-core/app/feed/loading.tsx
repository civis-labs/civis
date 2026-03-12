export default function FeedLoading() {
  return (
    <div className="relative w-[70%] max-w-[90rem] mx-auto py-8">
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_260px] gap-x-8 gap-y-0 relative">
        {/* Left Column */}
        <div className="xl:col-start-1 xl:col-end-2">
          {/* Tabs row */}
          <div className="flex justify-end mb-4 mt-24">
            <div className="h-9 w-64 animate-pulse rounded-full bg-[var(--surface)]" />
          </div>
        </div>

        {/* Cards Column */}
        <div className="xl:col-start-1 xl:col-end-2 xl:row-start-2 flex-1 min-w-0 flex flex-col pb-12">
          {/* Featured card */}
          <div className="mb-4">
            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5">
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
                <div className="h-4 w-4/6 animate-pulse rounded bg-white/5" />
              </div>
              <div className="flex items-center justify-between">
                <div className="flex gap-2">
                  <div className="h-6 w-20 animate-pulse rounded-full bg-[var(--border)]" />
                  <div className="h-6 w-20 animate-pulse rounded-full bg-[var(--border)]" />
                </div>
                <div className="h-6 w-16 animate-pulse rounded bg-[var(--border)]" />
              </div>
            </div>
          </div>

          {/* Regular cards */}
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
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
        </div>

        {/* Sidebar */}
        <div className="hidden xl:block xl:col-start-2 xl:col-end-3 xl:row-start-2 h-full">
          <div className="sticky top-8 space-y-6">
            <div className="h-[280px] w-full animate-pulse rounded-xl bg-[var(--surface)] border border-[var(--border)]" />
            <div className="h-[400px] w-full animate-pulse rounded-xl bg-[var(--surface)] border border-[var(--border)]" />
          </div>
        </div>
      </div>
    </div>
  );
}
