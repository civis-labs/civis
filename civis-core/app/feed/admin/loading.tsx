export default function AdminLoading() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-10 pb-16">

      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <div className="h-9 w-44 bg-white/[0.06] rounded-lg animate-pulse" />
          <div className="h-3.5 w-36 bg-white/[0.04] rounded mt-2 animate-pulse" />
        </div>
        <div className="h-4 w-10 bg-white/[0.04] rounded mt-2 animate-pulse" />
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="rounded-xl border border-white/10 bg-[var(--surface-raised)] p-4">
            <div className="h-4 w-4 bg-white/[0.06] rounded mb-3 animate-pulse" />
            <div className="h-7 w-16 bg-white/[0.06] rounded animate-pulse" />
            <div className="h-3 w-24 bg-white/[0.04] rounded mt-2 animate-pulse" />
          </div>
        ))}
      </div>

      {/* Hourly chart */}
      <div className="rounded-xl border border-white/10 bg-[var(--surface-raised)] p-4 mb-5">
        <div className="h-3 w-48 bg-white/[0.04] rounded mb-4 animate-pulse" />
        <div className="flex items-end gap-[3px]" style={{ height: '72px' }}>
          {[25, 45, 15, 55, 35, 20, 50, 30, 60, 40, 10, 45, 55, 25, 35, 70, 50, 20, 40, 30, 60, 15, 45, 35].map((h, i) => (
            <div
              key={i}
              className="flex-1 bg-white/[0.04] rounded-sm animate-pulse"
              style={{ height: `${h}%` }}
            />
          ))}
        </div>
        <div className="flex justify-between mt-2">
          <div className="h-2.5 w-12 bg-white/[0.04] rounded animate-pulse" />
          <div className="h-2.5 w-8 bg-white/[0.04] rounded animate-pulse" />
        </div>
      </div>

      {/* Two columns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-5">
        {[...Array(2)].map((_, i) => (
          <div key={i} className="rounded-xl border border-white/10 bg-[var(--surface-raised)] p-4">
            <div className="h-3 w-36 bg-white/[0.04] rounded mb-4 animate-pulse" />
            <div className="space-y-3">
              {[...Array(5)].map((_, j) => (
                <div key={j} className="flex items-center gap-3">
                  <div className="h-3 flex-1 bg-white/[0.04] rounded animate-pulse" style={{ maxWidth: `${60 + j * 8}%` }} />
                  <div className="h-1 w-16 bg-white/[0.04] rounded-full animate-pulse" />
                  <div className="h-3 w-5 bg-white/[0.04] rounded animate-pulse" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Recent requests table */}
      <div className="rounded-xl border border-white/10 bg-[var(--surface-raised)] overflow-hidden">
        <div className="px-4 py-3 border-b border-white/[0.06]">
          <div className="h-3 w-32 bg-white/[0.04] rounded animate-pulse" />
        </div>
        <table className="w-full text-xs font-mono">
          <thead>
            <tr className="border-b border-white/[0.06]">
              {['Time (UTC)', 'Endpoint', 'Params', 'IP', 'User-Agent', 'Status'].map(h => (
                <th key={h} className="px-4 py-2.5 text-left text-[11px] font-normal text-zinc-600 uppercase tracking-wider whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[...Array(8)].map((_, i) => (
              <tr key={i} className="border-b border-white/[0.03]">
                <td className="px-4 py-2"><div className="h-3 w-24 bg-white/[0.04] rounded animate-pulse" /></td>
                <td className="px-4 py-2"><div className="h-3 w-36 bg-white/[0.04] rounded animate-pulse" /></td>
                <td className="px-4 py-2"><div className="h-3 w-28 bg-white/[0.04] rounded animate-pulse" /></td>
                <td className="px-4 py-2"><div className="h-3 w-20 bg-white/[0.04] rounded animate-pulse" /></td>
                <td className="px-4 py-2"><div className="h-3 w-24 bg-white/[0.04] rounded animate-pulse" /></td>
                <td className="px-4 py-2"><div className="h-3 w-6 bg-white/[0.04] rounded animate-pulse" /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

    </div>
  );
}
