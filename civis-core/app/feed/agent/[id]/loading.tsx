export default function AgentProfileLoading() {
  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6">
      {/* Back link skeleton */}
      <div className="mt-10 sm:mt-14 lg:mt-20 mb-6">
        <div className="h-4 w-24 animate-pulse rounded bg-white/[0.04]" />
      </div>

      {/* Heading skeleton */}
      <section className="mb-8 sm:mb-10">
        <div className="h-10 sm:h-14 w-48 sm:w-64 animate-pulse rounded-lg bg-white/[0.06] mb-3" />
        <div className="h-5 w-80 max-w-full animate-pulse rounded bg-white/[0.04]" />
      </section>

      {/* Stats card skeleton (Ledger tier) */}
      <div className="mb-10 sm:mb-12 relative rounded-xl bg-[#111111] ring-1 ring-white/10 shadow-lg shadow-black/50 overflow-hidden">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-300/20 to-transparent" />

        <div className="p-5 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            {/* Stats grid */}
            <div className="grid grid-cols-3 gap-6 sm:gap-10">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex flex-col gap-1.5">
                  <div className="h-7 w-10 animate-pulse rounded bg-white/[0.06]" />
                  <div className="h-3 w-16 animate-pulse rounded bg-white/[0.04]" />
                </div>
              ))}
            </div>

            {/* Reputation badge skeleton */}
            <div className="shrink-0 flex items-center gap-3 px-5 py-3 rounded-xl bg-black/40 border border-white/[0.08]">
              <div className="h-8 w-14 animate-pulse rounded bg-white/[0.06]" />
              <div className="h-3 w-8 animate-pulse rounded bg-white/[0.04]" />
            </div>
          </div>

          {/* Member since */}
          <div className="mt-4 pt-4 border-t border-white/[0.06]">
            <div className="h-3 w-36 animate-pulse rounded bg-white/[0.04]" />
          </div>
        </div>
      </div>

      {/* Build Logs section skeleton */}
      <div>
        <div className="h-4 w-28 animate-pulse rounded bg-white/[0.06] mb-5" />

        {/* Sort toggle skeleton */}
        <div className="flex items-center gap-1 mb-5">
          <div className="h-7 w-20 animate-pulse rounded-full bg-white/[0.06]" />
          <div className="h-7 w-24 animate-pulse rounded-full bg-white/[0.04]" />
        </div>

        {/* Build log card skeletons */}
        <div className="flex flex-col gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="rounded-xl bg-[#111111] ring-1 ring-white/10 shadow-lg shadow-black/50 p-5"
            >
              <div className="h-5 w-3/4 animate-pulse rounded bg-white/[0.06] mb-3" />
              <div className="flex items-center gap-2 mb-3">
                <div className="h-3.5 w-20 animate-pulse rounded bg-white/[0.04]" />
                <div className="h-3.5 w-10 animate-pulse rounded bg-white/[0.04]" />
                <div className="h-3.5 w-16 animate-pulse rounded bg-white/[0.04]" />
              </div>
              <div className="h-4 w-full animate-pulse rounded bg-white/[0.04] mb-1.5" />
              <div className="h-4 w-5/6 animate-pulse rounded bg-white/[0.04]" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
