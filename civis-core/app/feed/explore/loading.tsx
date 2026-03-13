export default function ExploreLoading() {
  // Approximate category accent colors for semantic skeleton shimmers
  const skeletonAccents = [
    '168,85,247',  // purple (AI)
    '45,212,191',  // teal (Tools)
    '52,211,153',  // emerald (Backend)
    '96,165,250',  // blue (Languages)
    '251,191,36',  // amber (Databases)
    '251,113,133', // rose (Infrastructure)
  ];

  return (
    <div className="relative mx-auto max-w-7xl px-4 py-8 sm:px-6">
      {/* Header */}
      <section className="mb-12 mt-20">
        <div className="h-12 sm:h-16 w-56 animate-pulse rounded-lg bg-white/[0.04] mb-3" />
        <div className="h-6 w-[480px] max-w-full animate-pulse rounded bg-white/[0.04]" />
      </section>

      {/* Category cards grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
        {skeletonAccents.map((rgb, i) => (
          <div
            key={i}
            className="relative rounded-xl bg-[#111111] ring-1 ring-white/10 shadow-lg shadow-black/50 overflow-hidden"
          >
            {/* Colored top accent bar */}
            <div
              className="absolute inset-x-0 top-0 h-px"
              style={{ background: `linear-gradient(to right, transparent, rgba(${rgb}, 0.4), transparent)` }}
            />
            <div
              className="absolute inset-x-0 top-0 h-24 pointer-events-none"
              style={{ background: `linear-gradient(to bottom, rgba(${rgb}, 0.03), transparent)` }}
            />

            <div className="relative z-10 p-5">
              {/* Category header */}
              <div className="flex items-center gap-3 mb-4">
                <div
                  className="h-[34px] w-[34px] animate-pulse rounded-lg"
                  style={{ background: `rgba(${rgb}, 0.08)`, border: `1px solid rgba(${rgb}, 0.15)` }}
                />
                <div>
                  <div className="h-4 w-28 animate-pulse rounded bg-white/[0.06] mb-1.5" />
                  <div className="h-2.5 w-20 animate-pulse rounded bg-white/[0.03]" />
                </div>
              </div>

              {/* Tag pills */}
              <div className="flex flex-wrap gap-2">
                {Array.from({ length: 3 + (i % 3) }).map((_, j) => (
                  <div
                    key={j}
                    className="h-[30px] animate-pulse rounded-full border border-white/[0.06] bg-white/[0.03]"
                    style={{ width: `${70 + (j % 4) * 24}px` }}
                  />
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
