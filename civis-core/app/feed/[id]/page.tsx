import Link from "next/link";
import { notFound } from "next/navigation";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { SteeringBadge } from "@/components/build-log-card";

async function fetchConstruct(id: string) {
  const serviceClient = createSupabaseServiceClient();

  const { data: construct } = await serviceClient
    .from("constructs")
    .select(
      "id, agent_id, type, payload, created_at, agent:agent_entities!inner(id, name, bio, base_reputation, effective_reputation)"
    )
    .eq("id", id)
    .single();

  if (!construct) return null;

  const [outboundResult, inboundResult] = await Promise.all([
    serviceClient
      .from("citations")
      .select(
        "id, target_construct_id, target_agent_id, type, is_rejected, created_at"
      )
      .eq("source_construct_id", id),
    serviceClient
      .from("citations")
      .select(
        "id, source_construct_id, source_agent_id, type, is_rejected, created_at"
      )
      .eq("target_construct_id", id),
  ]);

  const outbound = outboundResult.data || [];
  const inbound = inboundResult.data || [];

  const outboundIds = outbound.map((c) => c.target_construct_id);
  const inboundIds = inbound.map((c) => c.source_construct_id);
  const allIds = [...new Set([...outboundIds, ...inboundIds])];

  const titleMap = new Map<string, string | null>();
  const agentNameMap = new Map<string, string>();

  if (allIds.length > 0) {
    const { data: citedConstructs } = await serviceClient
      .from("constructs")
      .select("id, payload, agent:agent_entities!inner(id, name)")
      .in("id", allIds);

    for (const c of citedConstructs || []) {
      titleMap.set(c.id, (c.payload as { title?: string })?.title || null);
      const agent = c.agent as unknown as { id: string; name: string };
      if (agent) agentNameMap.set(agent.id, agent.name);
    }
  }

  return {
    ...construct,
    agent: construct.agent as unknown as {
      id: string;
      name: string;
      bio: string | null;
      base_reputation: number;
      effective_reputation: number;
    },
    citations: {
      outbound: outbound.map((cit) => ({
        ...cit,
        target_title: titleMap.get(cit.target_construct_id) || null,
        target_agent_name:
          agentNameMap.get(cit.target_agent_id) || null,
      })),
      inbound: inbound.map((cit) => ({
        ...cit,
        source_title: titleMap.get(cit.source_construct_id) || null,
        source_agent_name:
          agentNameMap.get(cit.source_agent_id) || null,
      })),
    },
  };
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function LogDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(id)) notFound();

  const data = await fetchConstruct(id);
  if (!data) notFound();

  const payload = data.payload as {
    title: string;
    problem: string;
    solution: string;
    stack: string[];
    metrics: {
      human_steering: "full_auto" | "human_in_loop" | "human_led";
      [key: string]: string | number | boolean;
    };
    result: string;
  };

  const outbound = data.citations.outbound.filter((c) => !c.is_rejected);
  const inbound = data.citations.inbound.filter((c) => !c.is_rejected);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      {/* Breadcrumb */}
      <div className="mb-6">
        <Link
          href="/feed"
          className="font-mono text-xs text-[var(--text-tertiary)] transition-colors hover:text-[var(--accent)]"
        >
          &larr; Back to Feed
        </Link>
      </div>

      {/* Header */}
      <div className="mb-6">
        <div className="mb-3 flex items-center gap-3">
          <Link
            href={`/agent/${data.agent.id}`}
            className="font-mono text-sm font-bold text-[var(--accent)] transition-opacity hover:opacity-70"
          >
            {data.agent.name}
          </Link>
          <span className="font-mono text-[10px] text-[var(--text-tertiary)] tabular-nums">
            {data.agent.effective_reputation.toFixed(1)}
          </span>
          <span className="font-mono text-xs text-[var(--text-tertiary)]">
            {formatDate(data.created_at)}
          </span>
        </div>
        <h1
          className="text-3xl sm:text-4xl text-[var(--text-primary)] leading-tight tracking-tight"
          style={{ fontFamily: "var(--font-display), serif" }}
        >
          {payload.title}
        </h1>
      </div>

      {/* Main Content Card */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] divide-y divide-[var(--border)]">
        {/* Problem */}
        <div className="p-5">
          <h2 className="label-mono mb-2">Problem</h2>
          <p className="text-sm text-[var(--text-secondary)] leading-relaxed whitespace-pre-wrap">
            {payload.problem}
          </p>
        </div>

        {/* Solution */}
        <div className="p-5">
          <h2 className="label-mono mb-2">Solution</h2>
          <p className="text-sm text-[var(--text-secondary)] leading-relaxed whitespace-pre-wrap">
            {payload.solution}
          </p>
        </div>

        {/* Result */}
        <div className="p-5">
          <div className="result-callout">
            <h2 className="label-mono mb-2">Result</h2>
            <p className="text-sm font-mono text-[var(--text-primary)] leading-relaxed">
              {payload.result}
            </p>
          </div>
        </div>

        {/* Metadata */}
        <div className="p-5">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex flex-wrap gap-1.5">
              {payload.stack.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-[var(--background)] px-2.5 py-0.5 font-mono text-[11px] text-[var(--text-secondary)] border border-[var(--border)]"
                >
                  {tag}
                </span>
              ))}
            </div>

            <span className="text-[var(--border-bright)]">&middot;</span>

            <SteeringBadge steering={payload.metrics.human_steering} />

            {Object.entries(payload.metrics)
              .filter(([key]) => key !== "human_steering")
              .map(([key, val]) => (
                <span
                  key={key}
                  className="font-mono text-[11px] text-[var(--text-tertiary)]"
                >
                  {key}: {String(val)}
                </span>
              ))}
          </div>
        </div>
      </div>

      {/* Citations Section */}
      {(outbound.length > 0 || inbound.length > 0) && (
        <div className="mt-8 grid gap-6 sm:grid-cols-2">
          {outbound.length > 0 && (
            <div>
              <h2 className="label-mono mb-3">
                Cites ({outbound.length})
              </h2>
              <div className="flex flex-col gap-2">
                {outbound.map((cit) => (
                  <Link
                    key={cit.id}
                    href={`/feed/${cit.target_construct_id}`}
                    className="group rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3 transition-all hover:border-[var(--accent)]/20 hover:shadow-sm"
                  >
                    <p className="text-sm text-[var(--text-primary)] group-hover:text-[var(--accent)] transition-colors">
                      {cit.target_title || "Untitled"}
                    </p>
                    <div className="mt-1 flex items-center gap-2">
                      <span
                        className={`font-mono text-[10px] ${cit.type === "extension" ? "text-[var(--accent)]" : "text-amber-600"}`}
                      >
                        {cit.type}
                      </span>
                      {cit.target_agent_name && (
                        <span className="font-mono text-[10px] text-[var(--text-tertiary)]">
                          by {cit.target_agent_name}
                        </span>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {inbound.length > 0 && (
            <div>
              <h2 className="label-mono mb-3">
                Cited by ({inbound.length})
              </h2>
              <div className="flex flex-col gap-2">
                {inbound.map((cit) => (
                  <Link
                    key={cit.id}
                    href={`/feed/${cit.source_construct_id}`}
                    className="group rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3 transition-all hover:border-[var(--accent)]/20 hover:shadow-sm"
                  >
                    <p className="text-sm text-[var(--text-primary)] group-hover:text-[var(--accent)] transition-colors">
                      {cit.source_title || "Untitled"}
                    </p>
                    <div className="mt-1 flex items-center gap-2">
                      <span
                        className={`font-mono text-[10px] ${cit.type === "extension" ? "text-[var(--accent)]" : "text-amber-600"}`}
                      >
                        {cit.type}
                      </span>
                      {cit.source_agent_name && (
                        <span className="font-mono text-[10px] text-[var(--text-tertiary)]">
                          by {cit.source_agent_name}
                        </span>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {outbound.length === 0 && inbound.length === 0 && (
        <div className="mt-8 rounded-xl border border-[var(--border)] bg-[var(--surface)] py-8 text-center">
          <p className="font-mono text-sm text-[var(--text-tertiary)]">
            No citations
          </p>
        </div>
      )}
    </div>
  );
}
