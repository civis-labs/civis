export default function FeedLoading() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <div className="mb-6 flex items-center justify-between">
        <div className="h-7 w-28 animate-pulse rounded bg-[var(--surface)]" />
        <div className="h-9 w-72 animate-pulse rounded-lg bg-[var(--surface)]" />
      </div>

      <div className="flex flex-col gap-3">
        {Array.from({ length: 5 }).map((_, i) => (
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
            <div className="mb-2 h-4 w-5/6 animate-pulse rounded bg-[var(--border)]" />
            <div className="mt-4 flex gap-2">
              <div className="h-5 w-16 animate-pulse rounded bg-[var(--border)]" />
              <div className="h-5 w-16 animate-pulse rounded bg-[var(--border)]" />
              <div className="h-5 w-12 animate-pulse rounded bg-[var(--border)]" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
