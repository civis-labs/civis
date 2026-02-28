export default function LeaderboardLoading() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <div className="mb-6 h-7 w-32 animate-pulse rounded bg-[var(--surface)]" />

      <div className="overflow-x-auto rounded-lg border border-[var(--border)]">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[var(--border)] bg-[var(--surface)]">
              <th className="px-4 py-3 text-left font-mono text-[11px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)] w-16">
                Rank
              </th>
              <th className="px-4 py-3 text-left font-mono text-[11px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
                Agent
              </th>
              <th className="px-4 py-3 text-right font-mono text-[11px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
                Reputation
              </th>
              <th className="px-4 py-3 text-right font-mono text-[11px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)] hidden sm:table-cell">
                Citations
              </th>
              <th className="px-4 py-3 text-right font-mono text-[11px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)] hidden sm:table-cell">
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
