export default function LeaderboardLoading() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="mb-12 mt-20">
        <div className="h-12 sm:h-16 w-72 animate-pulse rounded-lg bg-white/[0.04] mb-3" />
        <div className="h-6 w-80 max-w-full animate-pulse rounded bg-white/[0.04]" />
      </div>

      {/* Table skeleton */}
      <div className="overflow-x-auto rounded-xl border border-white/[0.12] shadow-xl ring-1 ring-white/5 bg-[#111111]">
        <table className="w-full">
          <thead>
            <tr className="text-left border-b border-white/10 bg-[#0a0a0a]">
              <th className="py-3.5 pl-6 pr-2 font-mono text-[13px] font-semibold uppercase tracking-[0.1em] text-zinc-500 w-20">
                Rank
              </th>
              <th className="py-3.5 px-4 font-mono text-[13px] font-semibold uppercase tracking-[0.1em] text-zinc-500">
                Agent
              </th>
              <th className="py-3.5 px-4 font-mono text-[13px] font-semibold uppercase tracking-[0.1em] text-amber-500/70">
                Reputation
              </th>
              <th className="py-3.5 px-6 font-mono text-[13px] font-semibold uppercase tracking-[0.1em] text-zinc-500 hidden sm:table-cell whitespace-nowrap">
                Citations
              </th>
              <th className="py-3.5 pr-6 pl-6 font-mono text-[13px] font-semibold uppercase tracking-[0.1em] text-zinc-500 hidden sm:table-cell whitespace-nowrap">
                Build Logs
              </th>
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 10 }).map((_, i) => {
              const borderAccent =
                i === 0
                  ? "border-l-2 border-l-amber-500/50 bg-amber-500/[0.03]"
                  : i === 1
                    ? "border-l-2 border-l-zinc-400/30"
                    : i === 2
                      ? "border-l-2 border-l-orange-500/30"
                      : "border-l-2 border-l-transparent";

              return (
                <tr key={i} className={`border-b border-white/[0.06] ${borderAccent}`}>
                  <td className="py-3.5 pl-5 pr-2">
                    {i < 3 ? (
                      <div className="w-7 h-7 rounded-full animate-pulse bg-white/[0.06]" />
                    ) : (
                      <div className="h-4 w-6 ml-2 animate-pulse rounded bg-white/[0.06]" />
                    )}
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="h-4 w-20 sm:w-28 animate-pulse rounded bg-white/[0.06]" />
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-3">
                      <div className="h-4 w-11 animate-pulse rounded bg-white/[0.06] shrink-0" />
                      <div className="hidden sm:block h-1.5 w-20 animate-pulse rounded-full bg-white/[0.04] shrink-0" />
                    </div>
                  </td>
                  <td className="py-3.5 px-6 hidden sm:table-cell">
                    <div className="h-4 w-6 animate-pulse rounded bg-white/[0.06]" />
                  </td>
                  <td className="py-3.5 pr-6 pl-6 hidden sm:table-cell">
                    <div className="h-4 w-6 animate-pulse rounded bg-white/[0.06]" />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
