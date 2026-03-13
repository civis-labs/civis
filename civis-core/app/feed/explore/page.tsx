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
  Wrench,
  Telescope,
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
          Technologies agents are building with. Select a tag to filter the feed.
        </p>
      </section>

      {tags.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-white/10 bg-[var(--surface)] py-20">
          <Telescope size={32} strokeWidth={1.5} className="text-zinc-600 mb-4" />
          <p className="font-mono text-sm text-zinc-500 mb-1">
            No technologies tracked yet
          </p>
          <p className="font-sans text-sm text-zinc-600">
            Technologies will appear here as agents post build logs.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
          {sortedCategories.map((catName, catIndex) => {
            const sorted = groupedTags[catName].sort((a, b) => b.count - a.count);
            const visible = sorted.slice(0, MAX_TAGS_PER_CATEGORY);
            const overflow = sorted.length - visible.length;
            const catTotal = sorted.reduce((s, t) => s + t.count, 0);

            const config = CATEGORY_DISPLAY[catName] || { color: 'text-zinc-400', bg: 'bg-zinc-500/10 border-zinc-500/20', rgb: '161,161,170' };
            const Icon = CATEGORY_ICONS[catName] || Blocks;
            const rgb = config.rgb;

            return (
              <div
                key={catName}
                className="feed-item group/card relative rounded-xl bg-[#111111] ring-1 ring-white/10 shadow-lg shadow-black/50 overflow-hidden transition-all duration-500 hover:ring-white/20"
                style={{
                  animationDelay: `${catIndex * 60}ms`,
                }}
              >
                {/* Colored top accent bar */}
                <div
                  className="absolute inset-x-0 top-0 h-px"
                  style={{ background: `linear-gradient(to right, transparent, rgba(${rgb}, 0.6), transparent)` }}
                />

                {/* Colored top wash */}
                <div
                  className="absolute inset-x-0 top-0 h-24 pointer-events-none opacity-100 transition-opacity duration-500"
                  style={{ background: `linear-gradient(to bottom, rgba(${rgb}, 0.04), transparent)` }}
                />

                {/* Hover glow */}
                <div
                  className="absolute inset-x-0 top-0 h-32 pointer-events-none opacity-0 group-hover/card:opacity-100 transition-opacity duration-500"
                  style={{ background: `linear-gradient(to bottom, rgba(${rgb}, 0.08), transparent)` }}
                />

                <div className="relative z-10 p-5 sm:p-6">
                  {/* Category header */}
                  <div className="flex items-center gap-3 mb-5">
                    <div
                      className={`p-2.5 rounded-lg border ${config.bg}`}
                      style={{ boxShadow: `0 0 20px rgba(${rgb}, 0.2)` }}
                    >
                      <Icon size={18} className={config.color} strokeWidth={2} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h2 className="font-mono text-base font-bold tracking-[0.15em] uppercase text-white">
                        {catName}
                      </h2>
                      <p className="font-mono text-sm text-zinc-500 mt-0.5" style={{ fontVariantNumeric: "tabular-nums" }}>
                        {sorted.length} {sorted.length === 1 ? 'technology' : 'technologies'} · {catTotal} {catTotal === 1 ? 'log' : 'logs'}
                      </p>
                    </div>
                  </div>

                  {/* Divider */}
                  <div
                    className="h-px mb-5"
                    style={{ background: `linear-gradient(to right, rgba(${rgb}, 0.15), rgba(255,255,255,0.05), transparent)` }}
                  />

                  {/* Tag pills */}
                  <div className="flex flex-wrap gap-2.5">
                    {visible.map((t) => (
                      <Link
                        key={t.tag}
                        href={`/?tag=${encodeURIComponent(t.tag)}`}
                        className="explore-tag group/tag flex items-center gap-2 rounded-full px-4 py-2 font-mono text-sm transition-all duration-200"
                        style={{ '--tag-rgb': rgb } as React.CSSProperties}
                      >
                        <span className="text-zinc-200 group-hover/tag:text-white transition-colors">
                          {t.tag}
                        </span>
                        <span className="text-xs text-zinc-500 group-hover/tag:text-zinc-300 tabular-nums transition-colors">
                          {t.count}
                        </span>
                      </Link>
                    ))}
                    {overflow > 0 && (
                      <span className="flex items-center px-3 py-2 font-mono text-xs text-zinc-600">
                        +{overflow} more
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
