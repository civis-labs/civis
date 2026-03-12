import Link from "next/link";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import {
  Code2,
  Database,
  LayoutTemplate,
  Server,
  Cpu,
  Blocks,
  Network
} from "lucide-react";

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

  // Categorize tags
  const categories = {
    "AI & Models": {
      icon: Cpu,
      keywords: ["gpt", "claude", "llama", "mistral", "openai", "anthropic", "langchain", "llm", "ai", "gemini", "tensor", "pytorch"],
      color: "text-purple-400",
      bg: "bg-purple-500/10 border-purple-500/20"
    },
    "Frontend & UI": {
      icon: LayoutTemplate,
      keywords: ["react", "next.js", "vue", "svelte", "tailwind", "css", "html", "framer", "radix", "shadcn", "ui"],
      color: "text-sky-400",
      bg: "bg-sky-500/10 border-sky-500/20"
    },
    "Backend & APIs": {
      icon: Server,
      keywords: ["node.js", "express", "fastapi", "django", "flask", "spring", "trpc", "graphql", "rest", "api"],
      color: "text-emerald-400",
      bg: "bg-emerald-500/10 border-emerald-500/20"
    },
    "Database & Data": {
      icon: Database,
      keywords: ["postgres", "mysql", "mongodb", "redis", "supabase", "prisma", "drizzle", "sql", "pinecone", "milvus", "qdrant"],
      color: "text-amber-400",
      bg: "bg-amber-500/10 border-amber-500/20"
    },
    "Languages": {
      icon: Code2,
      keywords: ["typescript", "javascript", "python", "rust", "go", "java", "c++", "ruby", "php"],
      color: "text-blue-400",
      bg: "bg-blue-500/10 border-blue-500/20"
    },
    "Infrastructure & Tools": {
      icon: Network,
      keywords: ["docker", "kubernetes", "aws", "gcp", "azure", "vercel", "cloudflare", "linux", "git", "ci/cd", "github"],
      color: "text-rose-400",
      bg: "bg-rose-500/10 border-rose-500/20"
    },
    "Other": {
      icon: Blocks,
      keywords: [],
      color: "text-zinc-400",
      bg: "bg-zinc-500/10 border-zinc-500/20"
    }
  };

  const groupedTags = tags.reduce((acc, tag) => {
    const t = tag.tag.toLowerCase();
    let assigned = false;
    for (const [catName, catData] of Object.entries(categories)) {
      if (catName === "Other") continue;
      if (catData.keywords.some(k => t.includes(k) || t === k)) {
        if (!acc[catName]) acc[catName] = [];
        acc[catName].push(tag);
        assigned = true;
        break;
      }
    }
    if (!assigned) {
      if (!acc["Other"]) acc["Other"] = [];
      acc["Other"].push(tag);
    }
    return acc;
  }, {} as Record<string, TagCount[]>);

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
          {Object.entries(categories).map(([catName, config]) => {
            const groupTags = groupedTags[catName];
            if (!groupTags || groupTags.length === 0) return null;

            const Icon = config.icon;

            return (
              <div key={catName} className="flex flex-col gap-4">
                <div className="flex items-center gap-2 mb-2 border-b border-white/5 pb-2">
                  <div className={`p-1.5 rounded-md ${config.bg} border`}>
                    <Icon size={16} className={config.color} strokeWidth={2.5} />
                  </div>
                  <h2 className="font-mono text-sm font-bold tracking-widest uppercase text-white">
                    {catName}
                  </h2>
                </div>
                <div className="flex flex-wrap gap-2.5">
                  {groupTags.sort((a, b) => b.count - a.count).map((t) => (
                    <Link
                      key={t.tag}
                      href={`/feed?tag=${encodeURIComponent(t.tag)}`}
                      className="group flex items-center gap-2 rounded-lg bg-[#111111] ring-1 ring-white/10 px-3 py-2 font-mono text-xs transition-all hover:ring-cyan-500/50 hover:bg-white/5 hover:shadow-[0_0_15px_rgba(34,211,238,0.15)]"
                    >
                      <span className="text-zinc-300 font-bold group-hover:text-cyan-400 transition-colors">
                        {t.tag}
                      </span>
                      <span className="rounded-md bg-black/50 px-1.5 py-0.5 text-[10px] text-zinc-500 tabular-nums">
                        {t.count}
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
