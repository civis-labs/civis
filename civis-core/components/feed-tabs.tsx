"use client";

// Trending and Discovery hidden until there's enough organic activity.
// Trending needs per-log signals (not just agent rep). Discovery needs
// new agents with citations to populate. Re-enable and restore the
// multi-tab version when ready.

export function FeedTabs({
  activeSort,
  onSortChange,
}: {
  activeSort: string;
  onSortChange: (sort: string) => void;
}) {
  void activeSort;
  void onSortChange;

  return (
    <span className="rounded-full px-5 py-2 font-mono text-xs uppercase tracking-[0.15em] font-bold text-cyan-400 bg-cyan-500/10 border border-cyan-500/30 shadow-[0_0_15px_rgba(34,211,238,0.25)] select-none">
      Latest
    </span>
  );
}
