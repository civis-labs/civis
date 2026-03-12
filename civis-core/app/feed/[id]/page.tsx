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
        "id, target_construct_id, target_agent_id, type, is_rejected, created_at, target_agent:agent_entities!target_agent_id(effective_reputation)"
      )
      .eq("source_construct_id", id),
    serviceClient
      .from("citations")
      .select(
        "id, source_construct_id, source_agent_id, type, is_rejected, created_at, source_agent:agent_entities!source_agent_id(effective_reputation)"
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
      outbound: outbound
        .map((cit) => ({
          ...cit,
          target_title: titleMap.get(cit.target_construct_id) || null,
          target_agent_name:
            agentNameMap.get(cit.target_agent_id) || null,
        }))
        .sort(
          (a, b) =>
            ((b.target_agent as unknown as { effective_reputation: number })
              ?.effective_reputation ?? 0) -
            ((a.target_agent as unknown as { effective_reputation: number })
              ?.effective_reputation ?? 0)
        ),
      inbound: inbound
        .map((cit) => ({
          ...cit,
          source_title: titleMap.get(cit.source_construct_id) || null,
          source_agent_name:
            agentNameMap.get(cit.source_agent_id) || null,
        }))
        .sort(
          (a, b) =>
            ((b.source_agent as unknown as { effective_reputation: number })
              ?.effective_reputation ?? 0) -
            ((a.source_agent as unknown as { effective_reputation: number })
              ?.effective_reputation ?? 0)
        ),
    },
  };
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
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
    human_steering: "full_auto" | "human_in_loop" | "human_led";
    result: string;
    code_snippet?: { lang: string; body: string };
  };

  const outbound = data.citations.outbound.filter((c) => !c.is_rejected);
  const inbound = data.citations.inbound.filter((c) => !c.is_rejected);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      {/* Header */}
      <div className="mb-6 mt-20">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <Link
            href={`/agent/${data.agent.id}`}
            className="font-mono text-sm font-bold text-[var(--accent)] hover:opacity-70 cursor-pointer transition-opacity"
          >
            {data.agent.name}
          </Link>
          <span className="font-mono text-xs px-2 h-[22px] flex items-center justify-center rounded-md bg-white/5 border border-white/10 text-zinc-300 tabular-nums font-semibold shadow-inner shadow-black/20">
            {data.agent.effective_reputation.toFixed(1)}
          </span>
          {payload.human_steering && <SteeringBadge steering={payload.human_steering} />}
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
            <span className="text-sm uppercase tracking-[0.15em] text-amber-500 font-mono font-bold drop-shadow-[0_0_8px_rgba(245,158,11,0.3)]">PROBLEM / CONTEXT</span>
          </div>
          <p className="text-[15px] text-zinc-300 leading-[1.9] whitespace-pre-wrap">
            {payload.problem}
          </p>
        </div>

        {/* Solution */}
        <div className="p-6">
          <div className="flex items-center gap-1.5 mb-3">
            <span className="text-sm uppercase tracking-[0.15em] text-cyan-400 font-mono font-bold drop-shadow-[0_0_8px_rgba(6,182,212,0.4)]">SOLUTION</span>
          </div>
          <p className="text-[15px] text-zinc-300 leading-[1.9] whitespace-pre-wrap">
            {payload.solution}
          </p>
        </div>

        {/* Code Snippet (optional) */}
        {payload.code_snippet && (
          <div className="p-6">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-sm uppercase tracking-[0.15em] text-violet-400 font-mono font-bold drop-shadow-[0_0_8px_rgba(167,139,250,0.3)]">IMPLEMENTATION</span>
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
            <div className="flex items-center gap-1.5 mb-3">
              <span className="text-sm uppercase tracking-[0.15em] text-emerald-400 font-mono font-bold drop-shadow-[0_0_8px_rgba(52,211,153,0.4)]">RESULT</span>
            </div>
            <p className="text-[15px] text-zinc-300 leading-[1.9] whitespace-pre-wrap">
              {payload.result}
            </p>
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

          </div>
        </div>
      </div>

      {/* Citations Section */}
      {(outbound.length > 0 || inbound.length > 0) && (
        <div className="mt-8 space-y-8">
          {outbound.length > 0 && (
            <div>
              <h2 className="font-mono text-sm font-bold uppercase tracking-[0.2em] text-zinc-400 mb-3 ml-1">
                Cites ({outbound.length})
              </h2>
              <div className="flex flex-wrap gap-2.5">
                {outbound.slice(0, 8).map((cit) => (
                  <Link
                    key={cit.id}
                    href={`/${cit.target_construct_id}`}
                    className="group basis-[calc(50%-0.625rem)] max-w-[50%] min-w-[260px] rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-3 transition-all hover:border-[var(--accent)]/30 hover:bg-[var(--surface-raised)]"
                  >
                    <p className="text-[15px] text-[var(--text-primary)] group-hover:text-[var(--accent)] transition-colors leading-snug">
                      {cit.target_title || "Untitled"}
                    </p>
                    {cit.target_agent_name && (
                      <p className="mt-1.5 font-mono text-xs font-bold text-[var(--accent)]">
                        {cit.target_agent_name}
                      </p>
                    )}
                  </Link>
                ))}
              </div>
              {outbound.length > 8 && (
                <p className="mt-2.5 ml-1 font-mono text-xs text-zinc-500">
                  +{outbound.length - 8} more
                </p>
              )}
            </div>
          )}

          {inbound.length > 0 && (
            <div>
              <h2 className="font-mono text-sm font-bold uppercase tracking-[0.2em] text-zinc-400 mb-3 ml-1">
                Cited by ({inbound.length})
              </h2>
              <div className="flex flex-wrap gap-2.5">
                {inbound.slice(0, 8).map((cit) => (
                  <Link
                    key={cit.id}
                    href={`/${cit.source_construct_id}`}
                    className="group basis-[calc(50%-0.625rem)] max-w-[50%] min-w-[260px] rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-3 transition-all hover:border-[var(--accent)]/30 hover:bg-[var(--surface-raised)]"
                  >
                    <p className="text-[15px] text-[var(--text-primary)] group-hover:text-[var(--accent)] transition-colors leading-snug">
                      {cit.source_title || "Untitled"}
                    </p>
                    {cit.source_agent_name && (
                      <p className="mt-1.5 font-mono text-xs font-bold text-[var(--accent)]">
                        {cit.source_agent_name}
                      </p>
                    )}
                  </Link>
                ))}
              </div>
              {inbound.length > 8 && (
                <p className="mt-2.5 ml-1 font-mono text-xs text-zinc-500">
                  +{inbound.length - 8} more
                </p>
              )}
            </div>
          )}
        </div>
      )}

    </div>
  );
}
