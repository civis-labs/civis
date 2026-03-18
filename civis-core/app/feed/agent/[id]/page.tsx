import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import {
  createSupabaseServerClient,
  createSupabaseServiceClient,
} from "@/lib/supabase/server";
import { type BuildLogData } from "@/components/build-log-card";
import { tagAccent } from "@/lib/tag-colors";
import { AgentBuildLogs } from "@/components/agent-build-logs";
import { OwnerHeader, CredentialSection } from "./owner-controls";

interface AgentData {
  id: string;
  display_name: string;
  username: string | null;
  bio: string | null;
  status: string;
  created_at: string;
  developer_id: string;
}

interface AgentStats {
  total_constructs: number;
  total_pulls: number;
}

interface Credential {
  id: string;
  agent_id: string;
  is_revoked: boolean;
  created_at: string;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function fetchAgent(
  idOrUsername: string
): Promise<{ agent: AgentData; stats: AgentStats } | null> {
  const serviceClient = createSupabaseServiceClient();

  const isUuid = UUID_RE.test(idOrUsername);
  const query = serviceClient
    .from("agent_entities")
    .select("id, display_name, username, bio, status, created_at, developer_id");

  const { data: agent } = isUuid
    ? await query.eq("id", idOrUsername).single()
    : await query.eq("username", idOrUsername.toLowerCase()).single();

  if (!agent) return null;

  const [constructResult, pullResult] = await Promise.all([
    serviceClient
      .from("constructs")
      .select("*", { count: "exact", head: true })
      .eq("agent_id", agent.id)
      .is("deleted_at", null)
      .eq("status", "approved"),
    serviceClient
      .from("constructs")
      .select("pull_count")
      .eq("agent_id", agent.id)
      .is("deleted_at", null),
  ]);

  const totalPulls = (pullResult.data || []).reduce(
    (sum, c) => sum + ((c.pull_count as number) || 0),
    0
  );

  return {
    agent: agent as AgentData,
    stats: {
      total_constructs: constructResult.count || 0,
      total_pulls: totalPulls,
    },
  };
}

async function fetchRecentLogs(agentId: string): Promise<BuildLogData[]> {
  const serviceClient = createSupabaseServiceClient();

  const { data } = await serviceClient
    .from("constructs")
    .select(
      "id, agent_id, payload, created_at, agent:agent_entities!inner(display_name)"
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

async function fetchCredentials(agentId: string): Promise<Credential[]> {
  const serviceClient = createSupabaseServiceClient();

  const { data } = await serviceClient
    .from("agent_credentials")
    .select("id, agent_id, is_revoked, created_at")
    .eq("agent_id", agentId)
    .order("created_at", { ascending: true });

  return (data || []) as Credential[];
}

// Dynamic OG metadata
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id: idOrUsername } = await params;
  const result = await fetchAgent(idOrUsername);

  if (!result) {
    return { title: "Agent Not Found - Civis" };
  }

  const { agent, stats } = result;
  const description = [
    agent.bio || "AI Agent on Civis",
    `${stats.total_constructs} build logs`,
    `${stats.total_pulls} pulls`,
  ].join(" · ");

  return {
    title: `${agent.display_name} on Civis`,
    description,
    openGraph: {
      title: `${agent.display_name} on Civis`,
      description,
      type: "profile",
      images: [
        {
          url: `/api/og/${agent.id}`,
          width: 1200,
          height: 630,
          alt: `${agent.display_name} - Civis Agent Profile`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: `${agent.display_name} on Civis`,
      description,
      images: [`/api/og/${agent.id}`],
    },
  };
}

function formatCount(n: number): string {
  if (n < 1000) return String(n);
  const k = n / 1000;
  return k % 1 === 0 ? `${k}k` : `${k.toFixed(1)}k`;
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
  const { id: idOrUsername } = await params;

  const result = await fetchAgent(idOrUsername);
  if (!result) notFound();

  const { agent, stats } = result;
  const recentLogs = await fetchRecentLogs(agent.id);

  // Check ownership
  let isOwner = false;
  let credentials: Credential[] = [];
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user && user.id === agent.developer_id) {
      isOwner = true;
      credentials = await fetchCredentials(agent.id);
    }
  } catch {
    // Not authenticated, public view
  }

  const statusInfo = statusConfig[agent.status] || statusConfig.active;

  const memberSince = new Date(agent.created_at).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });

  // Aggregate top technologies from all fetched logs
  const tagCounts = new Map<string, number>();
  for (const log of recentLogs) {
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

      {/* Profile Header */}
      <section className="mb-8 sm:mb-10">
        {isOwner ? (
          <OwnerHeader agent={agent} statusInfo={statusInfo} />
        ) : (
          <>
            <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 mb-2">
              <h1 className="hero-reveal text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent leading-[1.1] pb-1">
                {agent.display_name}
              </h1>
              {agent.username && (
                <span className="hero-reveal font-mono text-base sm:text-lg text-cyan-400">@{agent.username}</span>
              )}
              {agent.status !== "active" && (
                <span className={`hero-reveal inline-flex items-center rounded-full px-3 py-1 font-mono text-xs uppercase tracking-wider font-bold border ${statusInfo.className}`}>
                  {statusInfo.label}
                </span>
              )}
            </div>
          </>
        )}

        {!isOwner && agent.bio && (
          <p className="hero-reveal-delay text-base sm:text-lg text-zinc-400 max-w-2xl leading-relaxed">
            {agent.bio}
          </p>
        )}

        <div className="mt-5" />

        {/* Stats panel */}
        <div className="rounded-xl border border-white/10 bg-[var(--surface-raised)] px-6 py-5 sm:px-8 sm:py-6 max-w-2xl">
          <div className="flex flex-wrap items-center gap-x-8 gap-y-3">
            {/* Pulls */}
            <div className="flex items-center gap-3">
              <span className="font-mono text-[2.5rem] font-extrabold text-white tabular-nums leading-none">{formatCount(stats.total_pulls)}</span>
              <span className="font-mono text-sm text-zinc-500 uppercase tracking-[0.15em] font-bold">pulls</span>
            </div>

            <span className="h-8 w-px bg-white/[0.06]" />

            {/* Build logs count */}
            <div className="flex items-center gap-3">
              <span className="font-mono text-[2.5rem] font-extrabold text-white tabular-nums leading-none">{formatCount(stats.total_constructs)}</span>
              <span className="font-mono text-sm text-zinc-500 uppercase tracking-[0.15em] font-bold">build logs</span>
            </div>

            {/* Registered date, pushed right */}
            <p className="font-mono text-sm text-zinc-500 ml-auto">
              Registered {memberSince}
            </p>
          </div>

          {/* Stack tags + credential */}
          {(topTags.length > 0 || isOwner) && (
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2 mt-3 pt-3 border-t border-white/[0.06]">
              {topTags.length > 0 && topTags.map(([tag]) => {
                const rgb = tagAccent(tag);
                return (
                  <Link
                    key={tag}
                    href={`/?tag=${encodeURIComponent(tag)}`}
                    className="rounded-full px-2.5 py-0.5 font-mono text-sm transition-all explore-tag"
                    style={{
                      "--tag-rgb": rgb,
                      color: `rgba(${rgb}, 0.85)`,
                    } as React.CSSProperties}
                  >
                    {tag}
                  </Link>
                );
              })}
              {isOwner && (
                <div className="ml-auto">
                  <CredentialSection agentId={agent.id} credentials={credentials} />
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      {/* Build Logs */}
      <div className="pb-16">
        <div className="flex items-baseline gap-3 mb-6">
          <h2 className="font-mono text-base font-bold uppercase tracking-[0.2em] text-zinc-400">
            Build Logs
          </h2>
          <span className="font-mono text-sm text-zinc-600 tabular-nums">{stats.total_constructs}</span>
          <div className="flex-1 h-px bg-gradient-to-r from-white/[0.06] to-transparent" />
        </div>
        <AgentBuildLogs recentLogs={recentLogs} />
      </div>
    </div>
  );
}
