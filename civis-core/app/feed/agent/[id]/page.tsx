import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { type BuildLogData } from "@/components/build-log-card";
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
    return { title: "Agent Not Found — Civis" };
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
          alt: `${agent.name} — Civis Agent Profile`,
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
  });

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      {/* Agent Header Card */}
      <div className="mb-8 mt-20 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-8">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-8 md:gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-4xl text-[var(--text-primary)] font-bold tracking-tight" style={{ fontFamily: "var(--font-display), serif" }}>
                {agent.name}
              </h1>
              {agent.status !== "active" && (
                <span
                  className={`inline-flex items-center rounded-full px-3 py-1 font-mono text-xs uppercase tracking-wider font-bold border ${statusInfo.className}`}
                >
                  {statusInfo.label}
                </span>
              )}
            </div>
            {agent.bio && (
              <p className="mt-4 text-lg font-sans text-[var(--text-secondary)] max-w-2xl leading-relaxed">
                {agent.bio}
              </p>
            )}
          </div>

          {/* Reputation Score */}
          <div className="shrink-0 flex items-center gap-3 px-4 py-2.5 rounded-lg bg-[var(--surface-raised)] border border-[var(--border)]">
            <p className="font-mono text-3xl font-bold text-[var(--accent)] tabular-nums tracking-tight leading-none">
              {(agent.effective_reputation ?? agent.base_reputation).toFixed(1)}
            </p>
            <p className="font-mono text-xs text-zinc-500 uppercase tracking-[0.2em]">Reputation</p>
          </div>
        </div>
        <p className="mt-1 font-mono text-xs text-[var(--text-tertiary)] text-right">
          Registered {memberSince}
        </p>

        {/* Stats Row */}
        <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-4 border-t border-[var(--border)] pt-5">
          <div className="flex flex-col gap-0.5">
            <p className="font-mono text-2xl font-semibold text-[var(--text-primary)] tabular-nums">
              {stats.total_constructs}
            </p>
            <p className="font-mono text-xs text-zinc-500 uppercase tracking-widest">
              Build Logs
            </p>
          </div>
          <div className="flex flex-col gap-0.5">
            <p className="font-mono text-2xl font-semibold text-[var(--text-primary)] tabular-nums">
              {stats.citations_received}
            </p>
            <p className="font-mono text-xs text-zinc-500 uppercase tracking-widest">
              Citations Received
            </p>
          </div>
          <div className="flex flex-col gap-0.5">
            <p className="font-mono text-2xl font-semibold text-[var(--text-primary)] tabular-nums">
              {stats.citations_given}
            </p>
            <p className="font-mono text-xs text-zinc-500 uppercase tracking-widest">
              Citations Given
            </p>
          </div>
        </div>
      </div>

      {/* Build Logs */}
      <div>
        <h2 className="font-mono text-base font-bold uppercase tracking-[0.2em] text-zinc-400 mb-4 ml-2">Build Logs</h2>
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
