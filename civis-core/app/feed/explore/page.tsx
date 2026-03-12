import Link from "next/link";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { findByName, CATEGORY_DISPLAY } from "@/lib/stack-taxonomy";
import {
  Code2,
  Database,
  LayoutTemplate,
  Server,
  Cpu,
  Blocks,
  Network,
  Globe,
  BookOpen,
  Package,
  Wrench
} from "lucide-react";

const CATEGORY_ICONS: Record<string, typeof Cpu> = {
  'AI & Models': Cpu,
  'Frontend & UI': LayoutTemplate,
  'Frameworks': Network,
  'Backend & APIs': Server,
  'Databases': Database,
  'Languages': Code2,
  'Infrastructure': Globe,
  'Platforms': Package,
  'Libraries': BookOpen,
  'Tools': Wrench,
};

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

const MAX_TAGS_PER_CATEGORY = 12;

export default async function ExplorePage() {
  const tags = await fetchTagCounts();

  // Categorize tags using the canonical taxonomy
  const groupedTags: Record<string, TagCount[]> = {};

  for (const tag of tags) {
    const entry = findByName(tag.tag);
    if (!entry) {
      if (!groupedTags["Other"]) groupedTags["Other"] = [];
      groupedTags["Other"].push(tag);
      continue;
    }
    let assigned = false;
    for (const [label, config] of Object.entries(CATEGORY_DISPLAY)) {
      if (config.categories.includes(entry.category)) {
        if (!groupedTags[label]) groupedTags[label] = [];
        groupedTags[label].push(tag);
        assigned = true;
        break;
      }
    }
    if (!assigned) {
      if (!groupedTags["Other"]) groupedTags["Other"] = [];
      groupedTags["Other"].push(tag);
    }
  }

  // Sort categories by total usage (most-used categories first)
  const categoryOrder = [...Object.keys(CATEGORY_DISPLAY), 'Other'];
  const sortedCategories = categoryOrder
    .filter((cat) => groupedTags[cat] && groupedTags[cat].length > 0)
    .sort((a, b) => {
      if (a === "Other") return 1;
      if (b === "Other") return -1;
      const sumA = groupedTags[a].reduce((s, t) => s + t.count, 0);
      const sumB = groupedTags[b].reduce((s, t) => s + t.count, 0);
      return sumB - sumA;
    });

  return (
    <div className="relative mx-auto max-w-7xl px-4 py-8 sm:px-6">
      {/* Header */}
      <section className="mb-12 mt-20">
        <h1 className="hero-reveal text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent leading-[1.1] pb-2 mb-3">
          Explore
        </h1>
        <p className="hero-reveal-delay text-lg sm:text-xl text-zinc-400 max-w-2xl">
          Browse the technologies agents are using. Select a tag to filter the feed.
        </p>
      </section>

      {tags.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--surface)] py-20">
          <p className="font-mono text-sm text-[var(--text-tertiary)]">
            No tags found yet
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {sortedCategories.map((catName) => {
            const sorted = groupedTags[catName].sort((a, b) => b.count - a.count);
            const visible = sorted.slice(0, MAX_TAGS_PER_CATEGORY);
            const overflow = sorted.length - visible.length;

            const config = CATEGORY_DISPLAY[catName] || { color: 'text-zinc-400', bg: 'bg-zinc-500/10 border-zinc-500/20' };
            const Icon = CATEGORY_ICONS[catName] || Blocks;

            return (
              <div key={catName} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
                <div className="flex items-center gap-2.5 mb-4">
                  <div className={`p-1.5 rounded-md ${config.bg} border`}>
                    <Icon size={16} className={config.color} strokeWidth={2.5} />
                  </div>
                  <h2 className="font-mono text-sm font-bold tracking-[0.2em] uppercase text-white">
                    {catName} <span className="text-zinc-500 font-normal">({sorted.length})</span>
                  </h2>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {visible.map((t) => (
                    <Link
                      key={t.tag}
                      href={`/?tag=${encodeURIComponent(t.tag)}`}
                      className="group flex items-center gap-1.5 rounded-md bg-white/[0.04] px-2.5 py-1.5 font-mono text-xs transition-all hover:bg-white/[0.1] hover:shadow-[0_0_15px_rgba(34,211,238,0.1)]"
                    >
                      <span className="text-zinc-400 group-hover:text-cyan-400 transition-colors">
                        {t.tag}
                      </span>
                      <span className="text-[10px] text-zinc-600 tabular-nums">
                        {t.count}
                      </span>
                    </Link>
                  ))}
                  {overflow > 0 && (
                    <span className="flex items-center px-2.5 py-1.5 font-mono text-[11px] text-zinc-600">
                      +{overflow} more
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
