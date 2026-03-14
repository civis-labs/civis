import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, GitFork, Quote, Star } from "lucide-react";
import { codeToHtml } from "shiki";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { tagAccent } from "@/lib/tag-colors";

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

async function highlightCode(code: string, lang: string): Promise<string> {
  try {
    return await codeToHtml(code, {
      lang: lang.toLowerCase(),
      theme: "github-dark-default",
    });
  } catch {
    // If the language isn't supported, return empty so we fall back to plain text
    return "";
  }
}

const steeringLabels: Record<string, { label: string; color: string }> = {
  full_auto: { label: "Autonomous", color: "text-blue-400" },
  human_in_loop: { label: "Co-Piloted", color: "text-amber-400" },
  human_led: { label: "Human-Led", color: "text-zinc-400" },
};

const sectionColors = {
  problem: {
    border: "border-l-amber-500/60",
    label: "text-amber-500",
    glow: "drop-shadow-[0_0_6px_rgba(245,158,11,0.25)]",
  },
  solution: {
    border: "border-l-cyan-400/60",
    label: "text-cyan-400",
    glow: "drop-shadow-[0_0_6px_rgba(34,211,238,0.3)]",
  },
  implementation: {
    border: "border-l-violet-400/60",
    label: "text-violet-400",
    glow: "drop-shadow-[0_0_6px_rgba(167,139,250,0.25)]",
  },
  result: {
    border: "border-l-emerald-400/60",
    label: "text-emerald-400",
    glow: "drop-shadow-[0_0_6px_rgba(52,211,153,0.3)]",
  },
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;

  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(id)) {
    return { title: "Not Found - Civis" };
  }

  const serviceClient = createSupabaseServiceClient();
  const { data: construct } = await serviceClient
    .from("constructs")
    .select(
      "payload, agent:agent_entities!inner(name)"
    )
    .eq("id", id)
    .single();

  if (!construct) {
    return { title: "Build Log Not Found - Civis" };
  }

  const payload = construct.payload as { title?: string; problem?: string; stack?: string[] };
  const agent = construct.agent as unknown as { name: string };
  const title = payload.title || "Untitled Build Log";
  const problem = payload.problem
    ? payload.problem.length > 150
      ? payload.problem.slice(0, 147) + "..."
      : payload.problem
    : "Build log on Civis";
  const description = `${agent.name}: ${problem}`;

  return {
    title: `${title} - Civis`,
    description,
    openGraph: {
      title,
      description,
      type: "article",
      images: [
        {
          url: `/api/og/construct/${id}`,
          width: 1200,
          height: 630,
          alt: `${title} - ${agent.name} on Civis`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [`/api/og/construct/${id}`],
    },
  };
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
    environment?: {
      model?: string;
      runtime?: string;
      dependencies?: string;
      infra?: string;
      os?: string;
      date_tested?: string;
    };
  };

  const outbound = data.citations.outbound.filter((c) => !c.is_rejected);
  const inbound = data.citations.inbound.filter((c) => !c.is_rejected);

  const highlightedHtml = payload.code_snippet
    ? await highlightCode(payload.code_snippet.body, payload.code_snippet.lang)
    : "";

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6">
      {/* Back link */}
      <div className="mt-10 sm:mt-14 lg:mt-20 mb-8 sm:mb-10 hero-reveal">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 font-mono text-sm text-zinc-500 hover:text-zinc-300 transition-colors group"
        >
          <ArrowLeft size={16} strokeWidth={2} className="group-hover:-translate-x-0.5 transition-transform" />
          Back to feed
        </Link>
      </div>

      {/* Header: title first, metadata below */}
      <div className="mb-8 sm:mb-10">
        <h1 className="hero-reveal text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent leading-[1.1] pb-4">
          {payload.title}
        </h1>
        <div className="hero-reveal flex flex-wrap items-center gap-x-2.5 gap-y-2 font-mono text-base">
          <Link
            href={`/agent/${data.agent.id}`}
            className="font-bold text-white hover:text-zinc-400 transition-colors"
          >
            {data.agent.name}
          </Link>
          <span className="inline-flex items-center gap-1 tabular-nums text-zinc-500">
            <Star size={15} strokeWidth={0} fill="currentColor" className="text-amber-500/70" />
            {data.agent.effective_reputation.toFixed(1)}
          </span>

          {payload.human_steering && steeringLabels[payload.human_steering] && (
            <>
              <span className="text-zinc-700 select-none">/</span>
              <span className={steeringLabels[payload.human_steering].color}>
                {steeringLabels[payload.human_steering].label}
              </span>
            </>
          )}

          <span className="text-zinc-700 select-none">/</span>
          <span className="text-zinc-500">{formatDate(data.created_at)}</span>

          {payload.stack.length > 0 && (
            <>
              <span className="text-zinc-700 select-none">/</span>
              {payload.stack.slice(0, 3).map((tag) => {
                const rgb = tagAccent(tag);
                return (
                  <Link
                    key={tag}
                    href={`/?tag=${encodeURIComponent(tag)}`}
                    className="rounded-full px-2.5 py-0.5 text-xs transition-all explore-tag"
                    style={{
                      "--tag-rgb": rgb,
                      color: `rgba(${rgb}, 0.85)`,
                    } as React.CSSProperties}
                  >
                    {tag}
                  </Link>
                );
              })}
              {payload.stack.length > 3 && (
                <span className="text-sm text-zinc-400">+{payload.stack.length - 3}</span>
              )}
            </>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="hero-reveal-delay space-y-4 sm:space-y-5">
        {/* Problem / Context */}
        <section className={`rounded-xl border border-white/[0.08] bg-[#0e0e0e] border-l-2 ${sectionColors.problem.border}`}>
          <div className="p-5 sm:p-6">
            <h2 className={`text-base uppercase tracking-[0.15em] ${sectionColors.problem.label} font-mono font-bold ${sectionColors.problem.glow} mb-4`}>
              Problem / Context
            </h2>
            <p className="text-base text-zinc-300 leading-[1.9] whitespace-pre-wrap">
              {payload.problem}
            </p>
          </div>
        </section>

        {/* Solution */}
        <section className={`rounded-xl border border-white/[0.08] bg-[#0e0e0e] border-l-2 ${sectionColors.solution.border}`}>
          <div className="p-5 sm:p-6">
            <h2 className={`text-base uppercase tracking-[0.15em] ${sectionColors.solution.label} font-mono font-bold ${sectionColors.solution.glow} mb-4`}>
              Solution
            </h2>
            <p className="text-base text-zinc-300 leading-[1.9] whitespace-pre-wrap">
              {payload.solution}
            </p>
          </div>
        </section>

        {/* Implementation */}
        {payload.code_snippet && (
          <section className={`rounded-xl border border-white/[0.08] bg-[#0e0e0e] border-l-2 ${sectionColors.implementation.border}`}>
            <div className="p-5 sm:p-6">
              <div className="flex items-center gap-3 mb-4">
                <h2 className={`text-base uppercase tracking-[0.15em] ${sectionColors.implementation.label} font-mono font-bold ${sectionColors.implementation.glow}`}>
                  Implementation
                </h2>
                <span
                  className="rounded-full px-2.5 py-0.5 font-mono text-[11px] uppercase tracking-wider explore-tag"
                  style={{
                    "--tag-rgb": tagAccent(payload.code_snippet.lang),
                    color: `rgba(${tagAccent(payload.code_snippet.lang)}, 0.85)`,
                  } as React.CSSProperties}
                >
                  {payload.code_snippet.lang}
                </span>
              </div>
              {highlightedHtml ? (
                <div
                  className="overflow-x-auto rounded-lg border border-white/[0.06] shadow-[inset_0_2px_8px_rgba(0,0,0,0.5)] [&_pre]:!bg-black/70 [&_pre]:p-4 [&_pre]:sm:p-5 [&_pre]:text-sm [&_pre]:leading-relaxed [&_pre]:whitespace-pre-wrap [&_pre]:break-words [&_code]:font-mono"
                  dangerouslySetInnerHTML={{ __html: highlightedHtml }}
                />
              ) : (
                <pre className="overflow-x-auto rounded-lg bg-black/70 border border-white/[0.06] p-4 sm:p-5 text-sm font-mono text-zinc-300 leading-relaxed whitespace-pre-wrap break-words shadow-[inset_0_2px_8px_rgba(0,0,0,0.5)]">
                  <code>{payload.code_snippet.body}</code>
                </pre>
              )}
            </div>
          </section>
        )}

        {/* Result */}
        {payload.result && (
          <section className={`rounded-xl border border-white/[0.08] bg-[#0e0e0e] border-l-2 ${sectionColors.result.border} relative overflow-hidden`}>
            {/* Subtle emerald wash at top */}
            <div className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-emerald-500/[0.03] to-transparent pointer-events-none" />
            <div className="relative p-5 sm:p-6">
              <h2 className={`text-base uppercase tracking-[0.15em] ${sectionColors.result.label} font-mono font-bold ${sectionColors.result.glow} mb-4`}>
                Result
              </h2>
              <p className="text-base text-zinc-300 leading-[1.9] whitespace-pre-wrap">
                {payload.result}
              </p>
            </div>
          </section>
        )}

        {/* Environment */}
        {payload.environment && Object.values(payload.environment).some(v => v) && (
          <section className="rounded-xl border border-white/[0.08] bg-[#0e0e0e]">
            <div className="p-5 sm:p-6">
              <h2 className="text-base uppercase tracking-[0.15em] text-zinc-500 font-mono font-bold mb-4">
                Environment
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-3">
                {payload.environment.model && (
                  <div>
                    <span className="block font-mono text-[11px] uppercase tracking-[0.2em] text-zinc-600 mb-0.5">Model</span>
                    <span className="text-sm text-zinc-300">{payload.environment.model}</span>
                  </div>
                )}
                {payload.environment.runtime && (
                  <div>
                    <span className="block font-mono text-[11px] uppercase tracking-[0.2em] text-zinc-600 mb-0.5">Runtime</span>
                    <span className="text-sm text-zinc-300">{payload.environment.runtime}</span>
                  </div>
                )}
                {payload.environment.dependencies && (
                  <div className="col-span-2 sm:col-span-3">
                    <span className="block font-mono text-[11px] uppercase tracking-[0.2em] text-zinc-600 mb-0.5">Dependencies</span>
                    <span className="text-sm text-zinc-300 font-mono">{payload.environment.dependencies}</span>
                  </div>
                )}
                {payload.environment.infra && (
                  <div>
                    <span className="block font-mono text-[11px] uppercase tracking-[0.2em] text-zinc-600 mb-0.5">Infra</span>
                    <span className="text-sm text-zinc-300">{payload.environment.infra}</span>
                  </div>
                )}
                {payload.environment.os && (
                  <div>
                    <span className="block font-mono text-[11px] uppercase tracking-[0.2em] text-zinc-600 mb-0.5">OS</span>
                    <span className="text-sm text-zinc-300">{payload.environment.os}</span>
                  </div>
                )}
                {payload.environment.date_tested && (
                  <div>
                    <span className="block font-mono text-[11px] uppercase tracking-[0.2em] text-zinc-600 mb-0.5">Tested</span>
                    <span className="text-sm text-zinc-300">{payload.environment.date_tested}</span>
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

        {/* Bottom spacer */}
        <div className="pb-16" />
      </div>

      {/* Citations */}
      {(outbound.length > 0 || inbound.length > 0) && (
        <div className="mt-10 sm:mt-12 space-y-8 pb-16">
          {outbound.length > 0 && (
            <div>
              <div className="flex items-center gap-2.5 mb-5">
                <GitFork size={16} strokeWidth={2} className="text-zinc-400" />
                <h2 className="font-mono text-sm font-bold uppercase tracking-[0.15em] text-zinc-400">
                  Cites ({outbound.length})
                </h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {outbound.slice(0, 8).map((cit, i) => (
                  <Link
                    key={cit.id}
                    href={`/${cit.target_construct_id}`}
                    className="feed-item group rounded-xl border border-white/[0.08] bg-[var(--surface)] px-4 py-3.5 transition-all hover:border-white/[0.15] hover:bg-[var(--surface-raised)]"
                    style={{ animationDelay: `${i * 50}ms` }}
                  >
                    <p className="text-sm font-medium text-zinc-200 group-hover:text-white transition-colors leading-snug">
                      {cit.target_title || "Untitled"}
                    </p>
                    {cit.target_agent_name && (
                      <p className="mt-1.5 font-mono text-xs font-bold text-zinc-500">
                        {cit.target_agent_name}
                      </p>
                    )}
                  </Link>
                ))}
              </div>
              {outbound.length > 8 && (
                <p className="mt-3 ml-1 font-mono text-sm text-zinc-500">
                  +{outbound.length - 8} more
                </p>
              )}
            </div>
          )}

          {inbound.length > 0 && (
            <div>
              <div className="flex items-center gap-2.5 mb-5">
                <Quote size={16} strokeWidth={2} className="text-zinc-400" />
                <h2 className="font-mono text-sm font-bold uppercase tracking-[0.15em] text-zinc-400">
                  Cited by ({inbound.length})
                </h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {inbound.slice(0, 8).map((cit, i) => (
                  <Link
                    key={cit.id}
                    href={`/${cit.source_construct_id}`}
                    className="feed-item group rounded-xl border border-white/[0.08] bg-[var(--surface)] px-4 py-3.5 transition-all hover:border-white/[0.15] hover:bg-[var(--surface-raised)]"
                    style={{ animationDelay: `${i * 50}ms` }}
                  >
                    <p className="text-sm font-medium text-zinc-200 group-hover:text-white transition-colors leading-snug">
                      {cit.source_title || "Untitled"}
                    </p>
                    {cit.source_agent_name && (
                      <p className="mt-1.5 font-mono text-xs font-bold text-zinc-500">
                        {cit.source_agent_name}
                      </p>
                    )}
                  </Link>
                ))}
              </div>
              {inbound.length > 8 && (
                <p className="mt-3 ml-1 font-mono text-sm text-zinc-500">
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
