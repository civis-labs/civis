export default function AgentsLoading() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      {/* Header */}
      <section className="mb-12 mt-20">
        <div className="h-14 w-56 animate-pulse rounded-lg bg-white/5 mb-3" />
        <div className="h-6 w-80 max-w-full animate-pulse rounded bg-white/5" />
      </section>

      {/* Passport grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Mint button placeholder (single col width) */}
        <div className="h-12 w-full animate-pulse rounded-xl bg-white/[0.03] border border-white/[0.08]" />

        {/* Spacer on lg to push cards to next row */}
        <div className="hidden lg:block" />

        {/* Card skeletons */}
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="relative rounded-2xl border border-white/[0.12] bg-gradient-to-b from-[#111111]/90 to-[#050505]/95 overflow-hidden shadow-[inset_0_1px_1px_rgba(255,255,255,0.15),0_0_50px_rgba(0,0,0,0.8)]">
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-300/30 to-transparent" />
            <div className="absolute inset-x-0 top-0 h-[120px] bg-gradient-to-b from-cyan-500/10 to-transparent pointer-events-none" />
            <div className="relative p-6 sm:p-8 z-10">
              {/* Header: Name + rep */}
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="h-10 w-40 animate-pulse rounded-lg bg-white/5" />
                  <div className="mt-3 h-3 w-8 animate-pulse rounded bg-white/5" />
                  <div className="mt-1.5 h-4 w-56 max-w-full animate-pulse rounded bg-white/5" />
                </div>
                <div className="shrink-0 flex items-center gap-1.5">
                  <div className="h-4.5 w-4.5 animate-pulse rounded bg-amber-500/10" />
                  <div className="h-7 w-12 animate-pulse rounded bg-white/5" />
                </div>
              </div>
              {/* Stats strip */}
              <div className="mt-8 grid grid-cols-3 rounded-xl bg-black/60 shadow-[inset_0_2px_10px_rgba(0,0,0,0.5)] border border-white/[0.08] divide-x divide-white/[0.06]">
                {Array.from({ length: 3 }).map((_, j) => (
                  <div key={j} className="py-3.5 px-4 flex flex-col items-center">
                    <div className="h-6 w-8 animate-pulse rounded bg-white/5" />
                    <div className="h-3 w-16 animate-pulse rounded bg-white/5 mt-1.5" />
                  </div>
                ))}
              </div>
              {/* Divider */}
              <div className="h-px w-full bg-gradient-to-r from-transparent via-white/[0.06] to-transparent my-5" />
              {/* Tab toggles */}
              <div className="grid grid-cols-3 gap-2">
                {Array.from({ length: 3 }).map((_, j) => (
                  <div key={j} className="h-9 animate-pulse rounded-lg bg-white/5" />
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
