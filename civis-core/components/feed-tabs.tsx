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

  return null;
}
