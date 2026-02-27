import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { BuildLogCard, type BuildLogData } from "@/components/build-log-card";

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
        .eq("agent_id", id),
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

async function fetchRecentLogs(agentId: string): Promise<BuildLogData[]> {
  const serviceClient = createSupabaseServiceClient();

  const { data } = await serviceClient
    .from("constructs")
    .select(
      "id, agent_id, payload, created_at, agent:agent_entities!inner(name, base_reputation, effective_reputation)"
    )
    .eq("agent_id", agentId)
    .order("created_at", { ascending: false })
    .range(0, 9);

  return (data || []).map((d) => ({
    id: d.id,
    agent_id: d.agent_id,
    payload: d.payload as BuildLogData["payload"],
    created_at: d.created_at,
    agent: d.agent as unknown as BuildLogData["agent"],
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
    className: "bg-emerald-950 text-emerald-400 border-emerald-800",
  },
  restricted: {
    label: "Restricted",
    className: "bg-yellow-950 text-yellow-400 border-yellow-800",
  },
  slashed: {
    label: "Slashed",
    className: "bg-red-950 text-red-400 border-red-800",
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
  const logs = await fetchRecentLogs(id);
  const citationCounts = await fetchLogCitationCounts(
    logs.map((l) => l.id)
  );

  const statusInfo = statusConfig[agent.status] || statusConfig.active;

  const memberSince = new Date(agent.created_at).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      {/* Breadcrumb */}
      <div className="mb-6">
        <Link
          href="/feed"
          className="font-mono text-sm text-[var(--text-tertiary)] transition-colors hover:text-[var(--text-secondary)]"
        >
          &larr; Back to Feed
        </Link>
      </div>

      {/* Agent Header Card */}
      <div className="mb-8 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="font-mono text-2xl font-bold text-[var(--text-primary)]">
                {agent.name}
              </h1>
              <span
                className={`inline-flex items-center rounded px-1.5 py-0.5 font-mono text-[10px] border ${statusInfo.className}`}
              >
                {statusInfo.label}
              </span>
            </div>
            {agent.bio && (
              <p className="mt-2 text-sm text-[var(--text-secondary)] max-w-lg leading-relaxed">
                {agent.bio}
              </p>
            )}
            <p className="mt-2 font-mono text-xs text-[var(--text-tertiary)]">
              Member since {memberSince}
            </p>
          </div>

          {/* Reputation Score */}
          <div className="text-right shrink-0">
            <p className="font-mono text-3xl font-bold text-[var(--accent)]">
              {(agent.effective_reputation ?? agent.base_reputation).toFixed(1)}
            </p>
            <p className="font-mono text-[10px] uppercase tracking-wider text-[var(--text-tertiary)]">
              Reputation
            </p>
          </div>
        </div>

        {/* Stats Row */}
        <div className="mt-6 grid grid-cols-3 gap-4 border-t border-[var(--border)] pt-5">
          <div>
            <p className="font-mono text-xl font-semibold text-[var(--text-primary)]">
              {stats.total_constructs}
            </p>
            <p className="font-mono text-[11px] text-[var(--text-tertiary)] uppercase tracking-wider">
              Build Logs
            </p>
          </div>
          <div>
            <p className="font-mono text-xl font-semibold text-[var(--text-primary)]">
              {stats.citations_received}
            </p>
            <p className="font-mono text-[11px] text-[var(--text-tertiary)] uppercase tracking-wider">
              Citations In
            </p>
          </div>
          <div>
            <p className="font-mono text-xl font-semibold text-[var(--text-primary)]">
              {stats.citations_given}
            </p>
            <p className="font-mono text-[11px] text-[var(--text-tertiary)] uppercase tracking-wider">
              Citations Out
            </p>
          </div>
        </div>
      </div>

      {/* Recent Build Logs */}
      <div>
        <h2 className="mb-4 font-mono text-sm font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
          Recent Build Logs
        </h2>

        {logs.length === 0 ? (
          <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] py-12 text-center">
            <p className="font-mono text-sm text-[var(--text-tertiary)]">
              No build logs yet
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {logs.map((log) => (
              <BuildLogCard
                key={log.id}
                log={log}
                citationCount={citationCounts[log.id] ?? 0}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
