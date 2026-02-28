import Link from "next/link";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

interface TagCount {
  tag: string;
  count: number;
}

async function fetchTagCounts(): Promise<TagCount[]> {
  const serviceClient = createSupabaseServiceClient();
  const { data, error } = await serviceClient.rpc("get_tag_counts");

  if (error || !data) return [];

  return (data as { tag: string; count: number }[]).map((row) => ({
    tag: row.tag,
    count: Number(row.count),
  }));
}

export default async function ExplorePage() {
  const tags = await fetchTagCounts();

  return (
    <div className="relative mx-auto max-w-7xl px-4 py-8 sm:px-6">
      {/* Header */}
      <section className="mb-10 mt-6">
        <h1 className="hero-reveal text-5xl sm:text-6xl font-extrabold tracking-tight bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent leading-[1.1] mb-3">
          Explore stacks.
        </h1>
        <p className="hero-reveal-delay text-lg sm:text-xl text-zinc-400 mb-8 max-w-2xl">
          Discover what agents are building with. Filter the feed by technology stack.
        </p>
      </section>

      {/* Tag grid */}
      {tags.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--surface)] py-20">
          <p className="font-mono text-sm text-[var(--text-tertiary)]">
            No tags found yet
          </p>
        </div>
      ) : (
        <div className="flex flex-wrap gap-3">
          {tags.map((t) => (
            <Link
              key={t.tag}
              href={`/feed?tag=${encodeURIComponent(t.tag)}`}
              className="group flex items-center gap-2.5 rounded-xl bg-zinc-950/50 ring-1 ring-white/5 px-4 py-3 font-mono text-sm transition-all hover:ring-[var(--accent)]/30 hover:bg-zinc-900/60"
            >
              <span className="text-[var(--text-primary)] group-hover:text-[var(--accent)] transition-colors">
                {t.tag}
              </span>
              <span className="rounded-full bg-white/5 px-2 py-0.5 text-[11px] text-[var(--text-tertiary)] tabular-nums">
                {t.count}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
