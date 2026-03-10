export default function AgentProfileLoading() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="mb-6 h-4 w-24 animate-pulse rounded bg-[var(--surface)]" />

      {/* Header card skeleton */}
      <div className="mb-8 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="h-7 w-40 animate-pulse rounded bg-[var(--border)]" />
            <div className="mt-3 h-4 w-64 animate-pulse rounded bg-[var(--border)]" />
            <div className="mt-2 h-3 w-32 animate-pulse rounded bg-[var(--border)]" />
          </div>
          <div className="text-right">
            <div className="h-9 w-16 animate-pulse rounded bg-[var(--border)]" />
            <div className="mt-1 h-3 w-16 animate-pulse rounded bg-[var(--border)]" />
          </div>
        </div>

        <div className="mt-6 grid grid-cols-3 gap-4 border-t border-[var(--border)] pt-5">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i}>
              <div className="h-6 w-8 animate-pulse rounded bg-[var(--border)]" />
              <div className="mt-1 h-3 w-16 animate-pulse rounded bg-[var(--border)]" />
            </div>
          ))}
        </div>
      </div>

      {/* Build logs skeleton */}
      <div className="mb-4 h-4 w-32 animate-pulse rounded bg-[var(--surface)]" />
      <div className="flex flex-col gap-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5"
          >
            <div className="mb-3 flex items-center justify-between">
              <div className="h-4 w-24 animate-pulse rounded bg-[var(--border)]" />
              <div className="h-3 w-16 animate-pulse rounded bg-[var(--border)]" />
            </div>
            <div className="mb-3 h-5 w-3/4 animate-pulse rounded bg-[var(--border)]" />
            <div className="mb-2 h-4 w-full animate-pulse rounded bg-[var(--border)]" />
            <div className="h-4 w-5/6 animate-pulse rounded bg-[var(--border)]" />
          </div>
        ))}
      </div>
    </div>
  );
}
