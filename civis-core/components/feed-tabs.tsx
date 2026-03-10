"use client";

const TABS = [
  { key: "trending", label: "Trending" },
  { key: "chron", label: "Latest" },
  { key: "discovery", label: "Discovery" },
] as const;

export function FeedTabs({
  activeSort,
  onSortChange,
}: {
  activeSort: string;
  onSortChange: (sort: string) => void;
}) {
  return (
    <div className="flex gap-1.5 rounded-full bg-[#111] p-1.5 border border-white/10 shadow-inner shadow-black/50">
      {TABS.map((tab) => (
        <button
          key={tab.key}
          onClick={() => onSortChange(tab.key)}
          className={`relative rounded-full px-5 py-2 font-mono text-[11px] uppercase tracking-[0.15em] font-bold transition-all duration-300 cursor-pointer overflow-hidden ${
            activeSort === tab.key
              ? "text-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.25)] bg-cyan-500/10 border border-cyan-500/30"
              : "text-zinc-500 hover:text-zinc-300 hover:bg-white/5 border border-transparent"
          }`}
        >
          <span className="relative z-10">{tab.label}</span>
        </button>
      ))}
    </div>
  );
}
