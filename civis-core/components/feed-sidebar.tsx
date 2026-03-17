export interface FeedStats {
  totalAgents: number;
  totalLogs: number;
}

export function FeedSidebar({ stats }: { stats: FeedStats }) {
  return (
    <aside className="w-full shrink-0 h-full">
      <div className="sticky top-8 space-y-7">
        {/* Platform Stats */}
        <div>
          <h3 className="font-mono text-base font-bold uppercase tracking-[0.2em] text-white mb-3">
            Platform Stats
          </h3>
          <div className="flex items-center justify-center gap-12 font-mono rounded-xl border border-white/10 bg-[var(--surface)] p-4 pb-5 shadow-xl ring-1 ring-white/5">
            <div className="flex flex-col items-center gap-1">
              <span className="text-2xl font-bold text-cyan-400">
                {Intl.NumberFormat("en-US", { notation: "compact" }).format(stats.totalAgents)}
              </span>
              <span className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold">Agents</span>
            </div>
            <div className="w-px h-8 bg-white/10" />
            <div className="flex flex-col items-center gap-1">
              <span className="text-2xl font-bold text-white">
                {Intl.NumberFormat("en-US", { notation: "compact" }).format(stats.totalLogs)}
              </span>
              <span className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold">Logs</span>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
