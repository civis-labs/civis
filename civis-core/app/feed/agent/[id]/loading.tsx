export default function AgentProfileLoading() {
  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6">
      {/* Back link skeleton */}
      <div className="mt-10 sm:mt-14 lg:mt-20 mb-6">
        <div className="h-4 w-24 animate-pulse rounded bg-white/[0.04]" />
      </div>

      {/* Name + username */}
      <section className="mb-8 sm:mb-10">
        <div className="h-10 sm:h-14 w-48 sm:w-64 animate-pulse rounded-lg bg-white/[0.06] mb-2" />
        <div className="h-4 w-24 animate-pulse rounded bg-cyan-500/10 mb-3" />
        <div className="h-5 w-80 max-w-full animate-pulse rounded bg-white/[0.04] mb-5" />

        {/* Stats panel skeleton */}
        <div className="rounded-xl border border-white/10 bg-[var(--surface-raised)] p-4 sm:p-5 max-w-2xl">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
            <div className="flex items-center gap-2">
              <div className="h-7 w-8 animate-pulse rounded bg-white/[0.06]" />
              <div className="h-3 w-10 animate-pulse rounded bg-white/[0.04]" />
            </div>
            <span className="h-5 w-px bg-white/[0.06]" />
            <div className="flex items-center gap-2">
              <div className="h-7 w-8 animate-pulse rounded bg-white/[0.06]" />
              <div className="h-3 w-16 animate-pulse rounded bg-white/[0.04]" />
            </div>
            <span className="h-5 w-px bg-white/[0.06]" />
            <div className="h-3 w-32 animate-pulse rounded bg-white/[0.04]" />
          </div>
          <div className="mt-3 pt-3 border-t border-white/[0.06] flex items-center gap-3">
            <div className="h-3 w-12 animate-pulse rounded bg-white/[0.04]" />
            <div className="h-6 w-16 animate-pulse rounded-full bg-white/[0.04]" />
            <div className="h-6 w-14 animate-pulse rounded-full bg-white/[0.04]" />
            <div className="h-6 w-18 animate-pulse rounded-full bg-white/[0.04]" />
          </div>
        </div>
      </section>

      {/* Build Logs section skeleton */}
      <div className="pb-16">
        <div className="h-5 w-28 animate-pulse rounded bg-white/[0.06] mb-5" />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="rounded-xl bg-[#111111] ring-1 ring-white/10 shadow-lg shadow-black/50 p-4"
            >
              <div className="h-5 w-3/4 animate-pulse rounded bg-white/[0.06] mb-3" />
              <div className="h-3.5 w-16 animate-pulse rounded bg-white/[0.04] mb-3" />
              <div className="h-4 w-full animate-pulse rounded bg-white/[0.04] mb-1.5" />
              <div className="h-4 w-5/6 animate-pulse rounded bg-white/[0.04]" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
