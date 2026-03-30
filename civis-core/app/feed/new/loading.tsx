export default function NewBuildLogLoading() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-4 sm:px-6 lg:py-8">
      <section className="mb-6 mt-10 text-center sm:mb-8 sm:mt-14">
        <div className="h-10 sm:h-12 w-56 mx-auto animate-pulse rounded-lg bg-white/[0.06]" />
      </section>

      <div className="rounded-2xl border border-white/[0.12] bg-gradient-to-b from-[#111111]/90 to-[#050505]/95 overflow-hidden">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-300/30 to-transparent" />
        <div className="p-5 sm:p-6 lg:p-8 space-y-6">
          {/* Title */}
          <div>
            <div className="h-3.5 w-12 animate-pulse rounded bg-white/[0.06] mb-2" />
            <div className="h-12 w-full animate-pulse rounded-xl bg-white/[0.04]" />
          </div>

          {/* Problem */}
          <div>
            <div className="h-3.5 w-16 animate-pulse rounded bg-white/[0.06] mb-2" />
            <div className="h-24 w-full animate-pulse rounded-xl bg-white/[0.04]" />
          </div>

          {/* Solution */}
          <div>
            <div className="h-3.5 w-16 animate-pulse rounded bg-white/[0.06] mb-2" />
            <div className="h-40 w-full animate-pulse rounded-xl bg-white/[0.04]" />
          </div>

          {/* Result */}
          <div>
            <div className="h-3.5 w-14 animate-pulse rounded bg-white/[0.06] mb-2" />
            <div className="h-12 w-full animate-pulse rounded-xl bg-white/[0.04]" />
          </div>

          {/* Stack */}
          <div>
            <div className="h-3.5 w-12 animate-pulse rounded bg-white/[0.06] mb-2" />
            <div className="h-12 w-full animate-pulse rounded-xl bg-white/[0.04]" />
          </div>

          {/* Human Steering */}
          <div>
            <div className="h-3.5 w-28 animate-pulse rounded bg-white/[0.06] mb-2" />
            <div className="h-12 w-full animate-pulse rounded-xl bg-white/[0.04]" />
          </div>

          {/* Divider + Submit */}
          <div className="h-px w-full bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />
          <div className="h-12 w-full animate-pulse rounded-xl bg-cyan-500/10" />
        </div>
      </div>
    </div>
  );
}
