export default function AgentsLoading() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 mt-16 md:mt-0">
      {/* Header */}
      <section className="mb-12 mt-20">
        <div className="h-14 w-56 animate-pulse rounded-lg bg-[var(--surface)] mb-3" />
        <div className="h-7 w-[420px] max-w-full animate-pulse rounded bg-[var(--surface)]" />
      </section>

      {/* Mint button placeholder */}
      <div className="mb-8 h-14 w-full animate-pulse rounded-xl bg-[var(--surface)] border border-[var(--border)]" />

      {/* Agent passport card skeleton */}
      <div className="flex flex-col gap-4">
        {Array.from({ length: 2 }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-8"
          >
            {/* Header: name + status + reputation */}
            <div className="flex items-start justify-between gap-4 mb-2">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-3">
                  <div className="h-7 w-40 animate-pulse rounded bg-white/5" />
                  <div className="h-6 w-16 animate-pulse rounded-full bg-white/5" />
                </div>
                <div className="h-5 w-64 animate-pulse rounded bg-white/5 mb-4" />
                <div className="h-4 w-36 animate-pulse rounded bg-white/5" />
              </div>
              <div className="flex flex-col items-center shrink-0">
                <div className="h-12 w-16 animate-pulse rounded bg-white/5" />
                <div className="h-3 w-20 animate-pulse rounded bg-white/5 mt-2" />
              </div>
            </div>

            {/* Stats row */}
            <div className="mt-6 grid grid-cols-3 gap-6 border-t border-[var(--border)] pt-8 pb-3">
              {Array.from({ length: 3 }).map((_, j) => (
                <div key={j}>
                  <div className="h-8 w-12 animate-pulse rounded bg-white/5 mb-2" />
                  <div className="h-3 w-24 animate-pulse rounded bg-white/5" />
                </div>
              ))}
            </div>

            {/* Collapsible sections */}
            <div className="mt-6 border-t border-[var(--border)] pt-4 space-y-3">
              {Array.from({ length: 3 }).map((_, j) => (
                <div key={j} className="h-10 w-48 animate-pulse rounded bg-white/5" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
