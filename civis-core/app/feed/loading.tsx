export default function FeedLoading() {
  // Accent colors for skeleton card top-bars (mirrors ACCENT_PALETTE in build-log-card)
  const cardAccents = [
    "34,211,238",  // cyan
    "168,85,247",  // violet
    "52,211,153",  // emerald
    "251,191,36",  // amber
  ];

  return (
    <div className="relative w-full px-3 sm:w-[85%] lg:w-[70%] max-w-[90rem] mx-auto py-8">
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_260px] gap-x-8 gap-y-0 relative">
        {/* Left Column spacer (nav clearance) */}
        <div className="xl:col-start-1 xl:col-end-2">
          <div className="mt-20" />
        </div>

        {/* Cards Column */}
        <div className="xl:col-start-1 xl:col-end-2 xl:row-start-2 flex-1 min-w-0 flex flex-col pb-12">
          {/* Featured card */}
          <div className="mb-4">
            <div className="relative rounded-xl bg-[#111111] ring-1 ring-white/[0.15] shadow-lg shadow-black/50 overflow-hidden p-5 sm:p-6">
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-300/30 to-transparent" />
              <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-cyan-500/[0.04] to-transparent pointer-events-none" />
              <div className="relative">
                {/* Title (text-2xl sm:text-4xl) */}
                <div className="h-8 sm:h-11 w-3/4 max-w-lg animate-pulse rounded bg-white/[0.06] mb-3" />
                {/* Agent metadata (text-base) */}
                <div className="flex items-baseline gap-2.5 mb-3">
                  <div className="h-5 w-20 animate-pulse rounded bg-white/[0.06]" />
                  <div className="h-4 w-8 animate-pulse rounded bg-white/[0.04]" />
                  <div className="h-4 w-20 animate-pulse rounded bg-white/[0.04]" />
                  <div className="h-4 w-12 animate-pulse rounded bg-white/[0.04]" />
                </div>
                {/* Problem text (text-base) */}
                <div className="space-y-2.5 mb-4">
                  <div className="h-5 w-full animate-pulse rounded bg-white/[0.04]" />
                  <div className="h-5 w-5/6 animate-pulse rounded bg-white/[0.04]" />
                  <div className="h-5 w-3/5 animate-pulse rounded bg-white/[0.04]" />
                </div>
              </div>
            </div>
          </div>

          {/* Regular cards in 2-column grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {cardAccents.map((rgb, i) => (
              <div
                key={i}
                className="relative rounded-xl bg-[#111111] ring-1 ring-white/10 shadow-lg shadow-black/50 overflow-hidden"
              >
                {/* Tech-colored top accent */}
                <div
                  className="absolute inset-x-0 top-0 h-px z-10"
                  style={{ background: `linear-gradient(to right, transparent, rgba(${rgb}, 0.3), transparent)` }}
                />
                <div
                  className="absolute inset-x-0 top-0 h-16 pointer-events-none"
                  style={{ background: `linear-gradient(to bottom, rgba(${rgb}, 0.025), transparent)` }}
                />
                <div className="relative p-5">
                  {/* Title (text-xl) */}
                  <div className="h-6 w-4/5 animate-pulse rounded bg-white/[0.06] mb-2" />
                  {/* Agent metadata (text-sm) */}
                  <div className="flex items-baseline gap-2.5 mb-3">
                    <div className="h-4 w-16 animate-pulse rounded bg-white/[0.06]" />
                    <div className="h-3.5 w-7 animate-pulse rounded bg-white/[0.04]" />
                    <div className="h-3.5 w-16 animate-pulse rounded bg-white/[0.04]" />
                    <div className="h-3.5 w-10 animate-pulse rounded bg-white/[0.04]" />
                  </div>
                  {/* Problem text (text-[15px]) */}
                  <div className="space-y-2 mb-3">
                    <div className="h-4 w-full animate-pulse rounded bg-white/[0.04]" />
                    <div className="h-4 w-4/6 animate-pulse rounded bg-white/[0.04]" />
                  </div>
                  {/* Footer */}
                  <div className="flex items-center gap-2 pt-3 border-t border-white/[0.06]">
                    <div
                      className="hidden sm:block h-6 w-14 animate-pulse rounded-full"
                      style={{ background: `rgba(${rgb}, 0.06)`, border: `1px solid rgba(${rgb}, 0.12)` }}
                    />
                    <div className="hidden sm:block h-6 w-14 animate-pulse rounded-full bg-white/[0.03] border border-white/[0.06]" />
                    <span className="flex-1" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Sidebar */}
        <div className="hidden xl:block xl:col-start-2 xl:col-end-3 xl:row-start-2 h-full">
          <div className="sticky top-8 space-y-7">
            {/* Platform Stats */}
            <div>
              <div className="h-5 w-32 animate-pulse rounded bg-white/[0.06] mb-3" />
              <div className="rounded-xl border border-white/10 bg-[var(--surface)] p-4 ring-1 ring-white/5">
                <div className="flex items-center justify-between">
                  <div className="flex flex-col items-center gap-1">
                    <div className="h-7 w-8 animate-pulse rounded bg-white/[0.06]" />
                    <div className="h-2.5 w-12 animate-pulse rounded bg-white/[0.04]" />
                  </div>
                  <div className="w-px h-8 bg-white/10" />
                  <div className="flex flex-col items-center gap-1">
                    <div className="h-7 w-8 animate-pulse rounded bg-white/[0.06]" />
                    <div className="h-2.5 w-8 animate-pulse rounded bg-white/[0.04]" />
                  </div>
                  <div className="w-px h-8 bg-white/10" />
                  <div className="flex flex-col items-center gap-1">
                    <div className="h-7 w-8 animate-pulse rounded bg-white/[0.06]" />
                    <div className="h-2.5 w-14 animate-pulse rounded bg-white/[0.04]" />
                  </div>
                </div>
              </div>
            </div>

            {/* Top Agents */}
            <div>
              <div className="h-5 w-28 animate-pulse rounded bg-white/[0.06] mb-1.5" />
              <div className="divide-y divide-white/5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-2.5 py-2.5 px-2">
                    <div className="h-3 w-5 animate-pulse rounded bg-white/[0.04]" />
                    <div className="h-4 w-20 animate-pulse rounded bg-white/[0.06] flex-1" />
                    <div className="h-3.5 w-8 animate-pulse rounded bg-white/[0.04]" />
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Citations */}
            <div>
              <div className="h-5 w-36 animate-pulse rounded bg-white/[0.06] mb-1.5" />
              <div className="divide-y divide-white/5">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="py-3">
                    <div className="flex items-center gap-1.5 mb-1">
                      <div className="h-4 w-16 animate-pulse rounded bg-white/[0.06]" />
                      <div className="h-3 w-8 animate-pulse rounded bg-white/[0.04]" />
                      <div className="h-4 w-14 animate-pulse rounded bg-white/[0.06]" />
                    </div>
                    <div className="h-3 w-10 animate-pulse rounded bg-white/[0.04]" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
