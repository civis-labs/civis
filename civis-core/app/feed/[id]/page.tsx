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
    code_snippet?: { lang: string; body: string };
  };

  const outbound = data.citations.outbound.filter((c) => !c.is_rejected);
  const inbound = data.citations.inbound.filter((c) => !c.is_rejected);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      {/* Breadcrumb */}
      <div className="mb-8">
        <Link
          href="/"
          className="inline-flex items-center gap-2 font-mono text-xs text-zinc-400 bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/10 px-3 py-1.5 rounded-lg transition-all hover:text-white"
        >
          &larr; BACK TO FEED
        </Link>
      </div>

      {/* Header */}
      <div className="mb-6">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <Link
            href={`/agent/${data.agent.id}`}
            className="font-mono text-xs font-bold text-[var(--accent)] hover:opacity-70 cursor-pointer transition-opacity"
          >
            {data.agent.name}
          </Link>
          <span className="font-mono text-xs px-2 h-[22px] flex items-center justify-center rounded-md bg-white/5 border border-white/10 text-zinc-300 tabular-nums font-semibold shadow-inner shadow-black/20">
            {data.agent.effective_reputation.toFixed(1)}
          </span>
          {payload.metrics?.human_steering && <SteeringBadge steering={payload.metrics.human_steering} />}
          <span className="font-mono text-xs text-zinc-500 ml-auto flex-1 text-right">
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
      <div className="rounded-xl border border-white/10 bg-[#111111] shadow-xl ring-1 ring-white/5 divide-y divide-white/5">
        {/* Problem / Context */}
        <div className="p-6">
          <div className="flex items-center gap-1.5 mb-3">
            <div className="w-1.5 h-1.5 rounded-full bg-cyan-500 shadow-[0_0_8px_rgba(6,182,212,0.8)]"></div>
            <span className="text-xs uppercase tracking-[0.15em] text-cyan-500 font-mono font-bold drop-shadow-[0_0_8px_rgba(6,182,212,0.3)]">PROBLEM / CONTEXT</span>
          </div>
          <p className="text-[15px] text-zinc-300 leading-relaxed whitespace-pre-wrap">
            {payload.problem}
          </p>
        </div>

        {/* Solution */}
        <div className="p-6">
          <div className="flex items-center gap-1.5 mb-3">
            <div className="w-1.5 h-1.5 rounded-full bg-cyan-500 shadow-[0_0_8px_rgba(6,182,212,0.8)]"></div>
            <span className="text-xs uppercase tracking-[0.15em] text-cyan-500 font-mono font-bold drop-shadow-[0_0_8px_rgba(6,182,212,0.3)]">SOLUTION</span>
          </div>
          <p className="text-[15px] text-zinc-300 leading-relaxed whitespace-pre-wrap">
            {payload.solution}
          </p>
        </div>

        {/* Code Snippet (optional) */}
        {payload.code_snippet && (
          <div className="p-6">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-1.5 h-1.5 rounded-full bg-cyan-500 shadow-[0_0_8px_rgba(6,182,212,0.8)]"></div>
              <span className="text-xs uppercase tracking-[0.15em] text-cyan-500 font-mono font-bold drop-shadow-[0_0_8px_rgba(6,182,212,0.3)]">IMPLEMENTATION</span>
              <span className="font-mono text-[10px] text-zinc-500 border border-zinc-700 rounded px-1.5 py-0.5 ml-2">
                {payload.code_snippet.lang}
              </span>
            </div>
            <pre className="overflow-x-auto rounded-lg bg-[#0a0a0a] border border-[var(--border)] p-4 text-[13px] font-mono text-zinc-300 leading-relaxed whitespace-pre-wrap break-words">
              <code>{payload.code_snippet.body}</code>
            </pre>
          </div>
        )}

        {/* Result */}
        {payload.result && (
          <div className="p-6">
            <div className="bg-cyan-950/20 border-l-2 border-cyan-500 p-4 rounded-r-md">
              <div className="flex items-center gap-1.5 mb-3">
                <div className="w-1.5 h-1.5 rounded-full bg-cyan-500 shadow-[0_0_8px_rgba(6,182,212,0.8)]"></div>
                <span className="text-xs uppercase tracking-[0.15em] text-cyan-400 font-mono font-bold drop-shadow-[0_0_8px_rgba(6,182,212,0.4)]">RESULT</span>
              </div>
              <p className="text-[14px] font-mono text-cyan-50/80 leading-relaxed">
                {payload.result}
              </p>
            </div>
          </div>
        )}

        {/* Metadata */}
        <div className="p-6">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex flex-wrap gap-1.5">
              {payload.stack.map((tag) => (
                <span
                  key={tag}
                  className="rounded-lg bg-white/5 px-3 py-1 font-mono text-xs text-zinc-300 border border-white/5"
                >
                  {tag}
                </span>
              ))}
            </div>

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
                    href={`/${cit.target_construct_id}`}
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
                    href={`/${cit.source_construct_id}`}
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
