export default function LogDetailLoading() {
  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6">
      {/* Back link */}
      <div className="mt-10 sm:mt-14 lg:mt-20 mb-8 sm:mb-10">
        <div className="h-4 w-28 rounded bg-white/[0.04] animate-pulse" />
      </div>

      {/* Header: title first, metadata + tags below */}
      <div className="mb-10 sm:mb-12">
        <div className="space-y-2.5 mb-5">
          <div className="h-9 sm:h-11 w-[85%] rounded-lg bg-white/[0.06] animate-pulse" />
          <div className="h-9 sm:h-11 w-[55%] rounded-lg bg-white/[0.04] animate-pulse" />
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="h-4 w-20 rounded bg-white/[0.08] animate-pulse" />
          <div className="h-4 w-10 rounded bg-white/[0.04] animate-pulse" />
          <div className="h-4 w-24 rounded bg-white/[0.04] animate-pulse" />
          <div className="h-4 w-20 rounded bg-white/[0.04] animate-pulse" />
          <div className="h-5 w-16 rounded-full bg-white/[0.04] animate-pulse" />
          <div className="h-5 w-14 rounded-full bg-white/[0.04] animate-pulse" />
          <div className="h-5 w-20 rounded-full bg-white/[0.04] animate-pulse" />
        </div>
      </div>

      {/* Sections */}
      <div className="space-y-4 sm:space-y-5">
        {/* Problem */}
        <div className="rounded-xl border border-white/[0.08] bg-[#0e0e0e] border-l-2 border-l-amber-500/30">
          <div className="p-5 sm:p-6">
            <div className="h-5 w-40 rounded bg-amber-500/10 animate-pulse mb-4" />
            <div className="space-y-2">
              <div className="h-4 w-full rounded bg-white/[0.04] animate-pulse" />
              <div className="h-4 w-[95%] rounded bg-white/[0.04] animate-pulse" />
              <div className="h-4 w-[80%] rounded bg-white/[0.04] animate-pulse" />
            </div>
          </div>
        </div>

        {/* Solution */}
        <div className="rounded-xl border border-white/[0.08] bg-[#0e0e0e] border-l-2 border-l-cyan-400/30">
          <div className="p-5 sm:p-6">
            <div className="h-5 w-28 rounded bg-cyan-400/10 animate-pulse mb-4" />
            <div className="space-y-2">
              <div className="h-4 w-full rounded bg-white/[0.04] animate-pulse" />
              <div className="h-4 w-[90%] rounded bg-white/[0.04] animate-pulse" />
              <div className="h-4 w-[70%] rounded bg-white/[0.04] animate-pulse" />
            </div>
          </div>
        </div>

        {/* Implementation */}
        <div className="rounded-xl border border-white/[0.08] bg-[#0e0e0e] border-l-2 border-l-violet-400/30">
          <div className="p-5 sm:p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-5 w-40 rounded bg-violet-400/10 animate-pulse" />
              <div className="h-5 w-14 rounded-full bg-white/[0.04] animate-pulse" />
            </div>
            <div className="rounded-lg bg-black/40 border border-white/[0.06] p-4 sm:p-5 space-y-2">
              <div className="h-3.5 w-[60%] rounded bg-white/[0.04] animate-pulse" />
              <div className="h-3.5 w-[75%] rounded bg-white/[0.04] animate-pulse" />
              <div className="h-3.5 w-[50%] rounded bg-white/[0.04] animate-pulse" />
              <div className="h-3.5 w-[65%] rounded bg-white/[0.04] animate-pulse" />
              <div className="h-3.5 w-[40%] rounded bg-white/[0.04] animate-pulse" />
            </div>
          </div>
        </div>

        {/* Result */}
        <div className="rounded-xl border border-white/[0.08] bg-[#0e0e0e] border-l-2 border-l-emerald-400/30">
          <div className="p-5 sm:p-6">
            <div className="h-5 w-24 rounded bg-emerald-400/10 animate-pulse mb-4" />
            <div className="space-y-2">
              <div className="h-4 w-full rounded bg-white/[0.04] animate-pulse" />
              <div className="h-4 w-[75%] rounded bg-white/[0.04] animate-pulse" />
            </div>
          </div>
        </div>

        {/* Bottom spacer */}
        <div className="pb-16" />
      </div>
    </div>
  );
}
