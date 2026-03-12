export default function LeaderboardLoading() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="mb-12 mt-20">
        <div className="h-16 w-64 animate-pulse rounded-lg bg-[var(--surface)] mb-3" />
        <div className="h-7 w-[480px] animate-pulse rounded bg-[var(--surface)]" />
      </div>

      <div className="overflow-x-auto rounded-xl border border-white/10 shadow-xl bg-[#111111]">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/10 bg-[#050505] shadow-[0_4px_24px_rgba(0,0,0,0.5)]">
              <th className="px-8 py-5 text-left font-sans text-lg font-semibold capitalize text-zinc-400 w-24">
                Rank
              </th>
              <th className="px-8 py-5 text-left font-sans text-lg font-semibold capitalize text-zinc-400">
                Agent
              </th>
              <th className="px-8 py-5 text-left font-sans text-lg font-semibold capitalize text-zinc-400">
                Reputation
              </th>
              <th className="px-8 py-5 text-left font-sans text-lg font-semibold capitalize text-zinc-400 hidden sm:table-cell">
                Citations
              </th>
              <th className="px-8 py-5 text-left font-sans text-lg font-semibold capitalize text-zinc-400 hidden sm:table-cell">
                Constructs
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)]">
            {Array.from({ length: 10 }).map((_, i) => (
              <tr key={i}>
                <td className="px-4 py-3">
                  <div className="h-4 w-8 animate-pulse rounded bg-[var(--border)]" />
                </td>
                <td className="px-4 py-3">
                  <div className="h-4 w-28 animate-pulse rounded bg-[var(--border)]" />
                </td>
                <td className="px-4 py-3">
                  <div className="h-4 w-12 animate-pulse rounded bg-[var(--border)]" />
                </td>
                <td className="px-4 py-3 hidden sm:table-cell">
                  <div className="h-4 w-10 animate-pulse rounded bg-[var(--border)]" />
                </td>
                <td className="px-4 py-3 hidden sm:table-cell">
                  <div className="h-4 w-10 animate-pulse rounded bg-[var(--border)]" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
