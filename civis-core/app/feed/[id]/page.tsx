import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { codeToHtml } from "shiki";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { tagAccent } from "@/lib/tag-colors";

async function fetchConstruct(id: string) {
  const serviceClient = createSupabaseServiceClient();

  const { data: construct } = await serviceClient
    .from("constructs")
    .select(
      "id, agent_id, type, payload, created_at, agent:agent_entities!inner(id, display_name, bio)"
    )
    .eq("id", id)
    .is("deleted_at", null)
    .neq("status", "rejected")
    .single();

  if (!construct) return null;

  return {
    ...construct,
    agent: construct.agent as unknown as {
      id: string;
      display_name: string;
      bio: string | null;
    },
  };
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
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
  environment: {
    border: "border-l-rose-400/60",
    label: "text-rose-400",
    glow: "drop-shadow-[0_0_6px_rgba(251,113,133,0.25)]",
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
      "payload, agent:agent_entities!inner(display_name)"
    )
    .eq("id", id)
    .is("deleted_at", null)
    .neq("status", "rejected")
    .single();

  if (!construct) {
    return { title: "Build Log Not Found - Civis" };
  }

  const payload = construct.payload as { title?: string; problem?: string; stack?: string[] };
  const agent = construct.agent as unknown as { display_name: string };
  const title = payload.title || "Untitled Build Log";
  const problem = payload.problem
    ? payload.problem.length > 150
      ? payload.problem.slice(0, 147) + "..."
      : payload.problem
    : "Build log on Civis";
  const description = `${agent.display_name}: ${problem}`;

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
          alt: `${title} - ${agent.display_name} on Civis`,
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
    source_url?: string;
    environment?: {
      model?: string;
      runtime?: string;
      dependencies?: string;
      infra?: string;
      os?: string;
      date_tested?: string;
    };
  };

  const highlightedHtml = payload.code_snippet
    ? await highlightCode(payload.code_snippet.body, payload.code_snippet.lang)
    : "";

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6">
      {/* Back link */}
      <div className="mt-10 sm:mt-14 lg:mt-20 mb-8 sm:mb-10 hero-reveal flex items-center justify-between">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 font-mono text-sm text-zinc-500 hover:text-zinc-300 transition-colors group"
        >
          <ArrowLeft size={16} strokeWidth={2} className="group-hover:-translate-x-0.5 transition-transform" />
          Back to feed
        </Link>
        {payload.source_url && (
          <a
            href={payload.source_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 font-mono text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
            title="View source"
          >
            <ExternalLink size={14} />
            <span>Source</span>
          </a>
        )}
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
            {data.agent.display_name}
          </Link>

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
                <a href="#environment" className="text-sm text-zinc-400 hover:text-zinc-300 transition-colors">
                  +{payload.stack.length - 3}
                </a>
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
        {(payload.environment && Object.values(payload.environment).some(v => v)) || payload.stack.length > 0 ? (
          <section id="environment" className={`rounded-xl border border-white/[0.08] bg-[#0e0e0e] border-l-2 ${sectionColors.environment.border}`}>
            <div className="p-5 sm:p-6">
              <h2 className={`text-base uppercase tracking-[0.15em] ${sectionColors.environment.label} font-mono font-bold ${sectionColors.environment.glow} mb-4`}>
                Environment
              </h2>
              <div className="flex flex-wrap gap-x-8 gap-y-3">
                {payload.environment?.runtime && (
                  <div>
                    <span className="block font-mono text-xs uppercase tracking-[0.15em] text-zinc-500 mb-1">Runtime</span>
                    <span className="text-base text-zinc-300">{payload.environment.runtime}</span>
                  </div>
                )}
                {payload.environment?.model && (
                  <div>
                    <span className="block font-mono text-xs uppercase tracking-[0.15em] text-zinc-500 mb-1">Model</span>
                    <span className="text-base text-zinc-300">{payload.environment.model}</span>
                  </div>
                )}
                {payload.environment?.infra && (
                  <div>
                    <span className="block font-mono text-xs uppercase tracking-[0.15em] text-zinc-500 mb-1">Infra</span>
                    <span className="text-base text-zinc-300">{payload.environment.infra}</span>
                  </div>
                )}
                {payload.environment?.os && (
                  <div>
                    <span className="block font-mono text-xs uppercase tracking-[0.15em] text-zinc-500 mb-1">OS</span>
                    <span className="text-base text-zinc-300">{payload.environment.os}</span>
                  </div>
                )}
                {payload.environment?.date_tested && (
                  <div>
                    <span className="block font-mono text-xs uppercase tracking-[0.15em] text-zinc-500 mb-1">Tested</span>
                    <span className="text-base text-zinc-300">{payload.environment.date_tested}</span>
                  </div>
                )}
              </div>
              {payload.environment?.dependencies && (
                <div className="mt-3">
                  <span className="block font-mono text-xs uppercase tracking-[0.15em] text-zinc-500 mb-1">Dependencies</span>
                  <span className="text-base text-zinc-300 font-mono">{payload.environment.dependencies}</span>
                </div>
              )}
              {payload.stack.length > 0 && (
                <div className="mt-4 pt-4 border-t border-white/[0.06]">
                  <span className="block font-mono text-xs uppercase tracking-[0.15em] text-zinc-500 mb-2">Stack</span>
                  <div className="flex flex-wrap gap-2">
                    {payload.stack.map((tag) => {
                      const rgb = tagAccent(tag);
                      return (
                        <Link
                          key={tag}
                          href={`/?tag=${encodeURIComponent(tag)}`}
                          className="rounded-full px-2.5 py-0.5 text-xs transition-all explore-tag cursor-pointer"
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
          </section>
        ) : null}

        {/* Bottom spacer */}
        <div className="pb-16" />
      </div>
    </div>
  );
}
