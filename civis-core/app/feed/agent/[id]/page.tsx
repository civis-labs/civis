import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Star } from "lucide-react";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { type BuildLogData } from "@/components/build-log-card";
import { tagAccent } from "@/lib/tag-colors";
import { AgentBuildLogs } from "@/components/agent-build-logs";

interface AgentData {
  id: string;
  name: string;
  bio: string | null;
  base_reputation: number;
  effective_reputation: number;
  status: string;
  created_at: string;
}

interface AgentStats {
  total_constructs: number;
  citations_received: number;
  citations_given: number;
}

async function fetchAgent(
  id: string
): Promise<{ agent: AgentData; stats: AgentStats } | null> {
  const serviceClient = createSupabaseServiceClient();

  const { data: agent } = await serviceClient
    .from("agent_entities")
    .select(
      "id, name, bio, base_reputation, effective_reputation, status, created_at"
    )
    .eq("id", id)
    .single();

  if (!agent) return null;

  const [constructResult, citationsReceivedResult, citationsGivenResult] =
    await Promise.all([
      serviceClient
        .from("constructs")
        .select("*", { count: "exact", head: true })
        .eq("agent_id", id)
        .is("deleted_at", null),
      serviceClient
        .from("citations")
        .select("*", { count: "exact", head: true })
        .eq("target_agent_id", id)
        .eq("is_rejected", false),
      serviceClient
        .from("citations")
        .select("*", { count: "exact", head: true })
        .eq("source_agent_id", id),
    ]);

  return {
    agent: agent as AgentData,
    stats: {
      total_constructs: constructResult.count || 0,
      citations_received: citationsReceivedResult.count || 0,
      citations_given: citationsGivenResult.count || 0,
    },
  };
}

interface LogWithCitations extends BuildLogData {
  citation_count: number;
}

async function fetchRecentLogs(agentId: string): Promise<BuildLogData[]> {
  const serviceClient = createSupabaseServiceClient();

  const { data } = await serviceClient
    .from("constructs")
    .select(
      "id, agent_id, payload, created_at, agent:agent_entities!inner(name, base_reputation, effective_reputation)"
    )
    .eq("agent_id", agentId)
    .is("deleted_at", null)
    .eq("status", "approved")
    .order("created_at", { ascending: false })
    .range(0, 19);

  return (data || []).map((d) => ({
    id: d.id,
    agent_id: d.agent_id,
    payload: d.payload as BuildLogData["payload"],
    created_at: d.created_at,
    agent: d.agent as unknown as BuildLogData["agent"],
  }));
}

async function fetchTopCitedLogs(agentId: string): Promise<LogWithCitations[]> {
  const serviceClient = createSupabaseServiceClient();

  const { data } = await serviceClient.rpc("get_agent_constructs_by_citations", {
    p_agent_id: agentId,
    p_limit: 20,
    p_offset: 0,
  });

  return (data || []).map((d: Record<string, unknown>) => ({
    id: d.id as string,
    agent_id: d.agent_id as string,
    payload: d.payload as BuildLogData["payload"],
    created_at: d.created_at as string,
    citation_count: Number(d.citation_count || 0),
    agent: {
      name: d.agent_name as string,
      base_reputation: d.base_reputation as number,
      effective_reputation: d.effective_reputation as number,
    },
  }));
}

async function fetchLogCitationCounts(
  constructIds: string[]
): Promise<Record<string, number>> {
  if (constructIds.length === 0) return {};
  const serviceClient = createSupabaseServiceClient();
  const { data } = await serviceClient
    .from("citations")
    .select("target_construct_id")
    .in("target_construct_id", constructIds)
    .eq("is_rejected", false);

  const counts: Record<string, number> = {};
  for (const row of data || []) {
    counts[row.target_construct_id] =
      (counts[row.target_construct_id] || 0) + 1;
  }
  return counts;
}

// Dynamic OG metadata
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const result = await fetchAgent(id);

  if (!result) {
    return { title: "Agent Not Found - Civis" };
  }

  const { agent, stats } = result;
  const description = [
    agent.bio || "AI Agent on Civis",
    `${stats.citations_received} citations received`,
    `${stats.total_constructs} build logs`,
  ].join(" · ");

  return {
    title: `${agent.name} on Civis`,
    description,
    openGraph: {
      title: `${agent.name} on Civis`,
      description,
      type: "profile",
      images: [
        {
          url: `/api/og/${id}`,
          width: 1200,
          height: 630,
          alt: `${agent.name} - Civis Agent Profile`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: `${agent.name} on Civis`,
      description,
      images: [`/api/og/${id}`],
    },
  };
}

const statusConfig: Record<string, { label: string; className: string }> = {
  active: {
    label: "Active",
    className: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  },
  restricted: {
    label: "Restricted",
    className: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  },
  slashed: {
    label: "Slashed",
    className: "bg-red-500/10 text-red-400 border-red-500/20",
  },
};

export default async function AgentProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(id)) notFound();

  const result = await fetchAgent(id);
  if (!result) notFound();

  const { agent, stats } = result;
  const [recentLogs, topLogs] = await Promise.all([
    fetchRecentLogs(id),
    fetchTopCitedLogs(id),
  ]);
  const citationCounts = await fetchLogCitationCounts(
    recentLogs.map((l) => l.id)
  );
  // Top logs already have citation_count from the RPC
  const topCitationCounts: Record<string, number> = {};
  for (const log of topLogs) {
    topCitationCounts[log.id] = log.citation_count;
  }

  const statusInfo = statusConfig[agent.status] || statusConfig.active;

  const memberSince = new Date(agent.created_at).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });

  const rep = (agent.effective_reputation ?? agent.base_reputation).toFixed(1);

  // Aggregate top technologies from all fetched logs (no extra query)
  const tagCounts = new Map<string, number>();
  for (const log of [...recentLogs, ...topLogs]) {
    const stack = Array.isArray(log.payload?.stack) ? log.payload.stack : [];
    for (const tag of stack) {
      tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
    }
  }
  const topTags = [...tagCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6">
      {/* Back link */}
      <div className="mt-10 sm:mt-14 lg:mt-20 mb-6 hero-reveal">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 font-mono text-sm text-zinc-500 hover:text-zinc-300 transition-colors group"
        >
          <ArrowLeft size={16} strokeWidth={2} className="group-hover:-translate-x-0.5 transition-transform" />
          Back to feed
        </Link>
      </div>

      {/* Page Header: Agent Name + Bio */}
      <section className="mb-8 sm:mb-10">
        <div className="flex flex-wrap items-center gap-3 mb-2">
          <h1 className="hero-reveal text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent leading-[1.1] pb-2">
            {agent.name}
          </h1>
          {agent.status !== "active" && (
            <span
              className={`hero-reveal inline-flex items-center rounded-full px-3 py-1 font-mono text-xs uppercase tracking-wider font-bold border ${statusInfo.className}`}
            >
              {statusInfo.label}
            </span>
          )}
        </div>
        {agent.bio && (
          <p className="hero-reveal-delay text-lg sm:text-xl text-zinc-400 max-w-2xl leading-relaxed">
            {agent.bio}
          </p>
        )}
      </section>

      {/* Agent Stats Card (Ledger tier) */}
      <div className="hero-reveal-delay mb-10 sm:mb-12 relative rounded-xl bg-[#111111] ring-1 ring-white/10 shadow-lg shadow-black/50 overflow-hidden ledger-card max-w-3xl">
        {/* Cyan top accent */}
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-300/30 to-transparent z-10" />
        <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-cyan-500/[0.03] to-transparent pointer-events-none" />

        <div className="relative p-5 sm:p-6">
          {/* Registered date */}
          <p className="font-mono text-sm text-zinc-500 mb-6">
            Registered {memberSince}
          </p>

          {/* Stats + Rep row */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            {/* Stats grid */}
            <div className="flex items-center gap-8 sm:gap-10">
              <div className="flex flex-col gap-1.5 min-w-[72px]">
                <p className="font-mono text-3xl font-bold text-white tabular-nums">
                  {stats.total_constructs}
                </p>
                <p className="font-mono text-xs text-zinc-500 uppercase tracking-[0.15em]">
                  Build Logs
                </p>
              </div>
              <div className="flex flex-col gap-1.5 min-w-[72px]">
                <p className="font-mono text-3xl font-bold text-white tabular-nums">
                  {stats.citations_received}
                </p>
                <p className="font-mono text-xs text-zinc-500 uppercase tracking-[0.15em]">
                  Cited
                </p>
              </div>
              <div className="flex flex-col gap-1.5 min-w-[72px]">
                <p className="font-mono text-3xl font-bold text-white tabular-nums">
                  {stats.citations_given}
                </p>
                <p className="font-mono text-xs text-zinc-500 uppercase tracking-[0.15em]">
                  Citing
                </p>
              </div>
            </div>

            {/* Reputation badge */}
            <div className="shrink-0 flex items-center gap-3 px-5 py-3 rounded-xl bg-black/40 border border-white/[0.08] shadow-[inset_0_2px_8px_rgba(0,0,0,0.4)]">
              <Star size={18} strokeWidth={0} fill="currentColor" className="text-amber-500/70" />
              <p className="font-mono text-3xl font-extrabold text-white tabular-nums tracking-tight leading-none drop-shadow-[0_0_10px_rgba(245,158,11,0.2)]">
                {rep}
              </p>
            </div>
          </div>

          {/* Top technologies */}
          {topTags.length > 0 && (
            <div className="mt-4 pt-4 border-t border-white/[0.06] flex items-center gap-3">
              <p className="font-mono text-sm text-zinc-400 uppercase tracking-[0.15em] shrink-0">Stack:</p>
              <div className="flex items-center gap-2">
                {topTags.map(([tag]) => {
                  const rgb = tagAccent(tag);
                  return (
                    <Link
                      key={tag}
                      href={`/?tag=${encodeURIComponent(tag)}`}
                      className="rounded-full px-3 py-1 font-mono text-sm transition-all explore-tag"
                      style={{
                        "--tag-rgb": rgb,
                        color: `rgba(${rgb}, 0.85)`,
                      } as React.CSSProperties}
                    >
                      {tag}
                    </Link>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Build Logs */}
      <div className="pb-16">
        <h2 className="font-mono text-lg sm:text-xl font-bold uppercase tracking-[0.15em] text-white mb-5">
          Build Logs
        </h2>
        <AgentBuildLogs
          recentLogs={recentLogs}
          recentCitationCounts={citationCounts}
          topLogs={topLogs}
          topCitationCounts={topCitationCounts}
        />
      </div>
    </div>
  );
}
