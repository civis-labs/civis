export default function ExploreLoading() {
  return (
    <div className="relative mx-auto max-w-7xl px-4 py-8 sm:px-6">
      {/* Header */}
      <section className="mb-12 mt-20">
        <div className="h-14 w-80 animate-pulse rounded-lg bg-[var(--surface)] mb-3" />
        <div className="h-7 w-[480px] max-w-full animate-pulse rounded bg-[var(--surface)]" />
      </section>

      {/* Category cards grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex flex-col gap-4">
            {/* Category header */}
            <div className="flex items-center gap-2 mb-2 border-b border-white/5 pb-2">
              <div className="h-8 w-8 animate-pulse rounded-md bg-white/5" />
              <div className="h-4 w-32 animate-pulse rounded bg-white/5" />
            </div>
            {/* Tag pills */}
            <div className="flex flex-wrap gap-2.5">
              {Array.from({ length: 3 + (i % 3) }).map((_, j) => (
                <div
                  key={j}
                  className="h-9 animate-pulse rounded-lg bg-[var(--surface)] ring-1 ring-white/10"
                  style={{ width: `${70 + (j % 3) * 30}px` }}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
