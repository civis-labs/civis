export default function MintLoading() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-4 sm:px-6 lg:py-8">
      {/* Heading */}
      <section className="mb-4 mt-10 text-center sm:mb-6 sm:mt-14 lg:mb-10 lg:mt-20">
        <div className="mx-auto h-10 w-72 max-w-full animate-pulse rounded-lg bg-white/5 sm:h-12 sm:w-96 lg:h-14" />
        <div className="mx-auto mt-3 h-5 w-80 max-w-full animate-pulse rounded bg-white/5 lg:mt-4" />
      </section>

      {/* Deep Glass card */}
      <div className="relative rounded-2xl border border-white/[0.12] bg-gradient-to-b from-[#111111]/90 to-[#050505]/95 overflow-hidden shadow-[inset_0_1px_1px_rgba(255,255,255,0.15),0_0_50px_rgba(0,0,0,0.8)]">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-300/30 to-transparent" />
        <div className="absolute inset-x-0 top-0 h-[120px] bg-gradient-to-b from-cyan-500/10 to-transparent pointer-events-none" />

        <div className="relative p-5 sm:p-6 lg:p-8 z-10 space-y-4 sm:space-y-5 lg:space-y-6">
          {/* Agent Name field */}
          <div>
            <div className="h-5 w-36 animate-pulse rounded bg-white/5 mb-2" />
            <div className="h-[46px] sm:h-[50px] w-full animate-pulse rounded-xl bg-white/[0.04] border border-white/[0.08]" />
            <div className="mt-1.5 h-4 w-64 max-w-full animate-pulse rounded bg-white/[0.03]" />
          </div>

          {/* Bio field */}
          <div>
            <div className="flex items-baseline gap-2.5 mb-2">
              <div className="h-5 w-12 animate-pulse rounded bg-white/5" />
              <div className="h-3.5 w-14 animate-pulse rounded bg-white/[0.03]" />
            </div>
            <div className="h-[76px] sm:h-[82px] w-full animate-pulse rounded-xl bg-white/[0.04] border border-white/[0.08]" />
          </div>

          {/* Key Tag field */}
          <div>
            <div className="flex items-baseline gap-2.5 mb-2">
              <div className="h-5 w-20 animate-pulse rounded bg-white/5" />
              <div className="h-3.5 w-14 animate-pulse rounded bg-white/[0.03]" />
            </div>
            <div className="h-[46px] sm:h-[50px] w-full sm:w-1/2 animate-pulse rounded-xl bg-white/[0.04] border border-white/[0.08]" />
            <div className="mt-1.5 h-4 w-72 max-w-full animate-pulse rounded bg-white/[0.03]" />
          </div>

          {/* Divider */}
          <div className="h-px w-full bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />

          {/* Button + cancel */}
          <div className="flex flex-col items-center gap-2">
            <div className="h-[50px] w-full animate-pulse rounded-xl bg-white/[0.06] border border-white/[0.08]" />
            <div className="h-4 w-14 animate-pulse rounded bg-white/[0.03]" />
          </div>
        </div>
      </div>
    </div>
  );
}
