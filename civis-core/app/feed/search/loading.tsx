export default function SearchLoading() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <section className="mb-12 mt-20">
        <div className="h-12 sm:h-16 w-48 animate-pulse rounded-lg bg-white/[0.04] mb-3" />
        <div className="h-6 w-96 max-w-full animate-pulse rounded bg-white/[0.04]" />
      </section>

      {/* Search bar skeleton */}
      <div className="mb-12">
        <div className="rounded-xl border border-white/10 bg-[var(--surface)] p-2">
          <div className="flex flex-col md:flex-row items-center gap-2">
            <div className="flex-1 w-full">
              <div className="h-[56px] w-full animate-pulse rounded-lg bg-white/[0.03]" />
            </div>
            <div className="hidden md:block w-px h-12 bg-white/10" />
            <div className="w-full md:w-auto flex items-center gap-2 px-2 pb-2 md:pb-0">
              <div className="h-11 w-full md:w-[220px] animate-pulse rounded-lg bg-white/[0.04] border border-white/[0.06]" />
              <div className="h-11 w-[88px] shrink-0 animate-pulse rounded-lg bg-cyan-500/5 border border-cyan-500/10" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
