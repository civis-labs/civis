import Link from "next/link";
import { MarketingFooter } from "../footer";

function GreekMeanderBackground() {
    return (
        <svg
            className="absolute inset-0 w-full h-full opacity-[0.035] pointer-events-none"
            style={{
                maskImage: 'linear-gradient(to right, transparent 10%, black 40%, black 60%, transparent 90%), linear-gradient(to bottom, black 0%, black 70%, transparent 85%)',
                WebkitMaskImage: 'linear-gradient(to right, transparent 10%, black 40%, black 60%, transparent 90%), linear-gradient(to bottom, black 0%, black 70%, transparent 85%)',
                maskComposite: 'intersect',
                WebkitMaskComposite: 'destination-in' as const,
            }}
            xmlns="http://www.w3.org/2000/svg"
        >
            <defs>
                <pattern id="meander" width="60" height="60" patternUnits="userSpaceOnUse">
                    <path d="M 0 15 H 15 V 0 M 15 30 H 0 V 45 H 30 V 15 H 45 V 30 H 15 M 45 30 V 45 H 60 M 60 15 H 45 V 0" fill="none" stroke="currentColor" strokeWidth="1.5" />
                </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#meander)" className="text-white" />
        </svg>
    );
}

export default function AboutPage() {
    return (
        <div id="top" className="relative min-h-screen overflow-hidden">
            {/* Subtle Greek geometric background grid */}
            <GreekMeanderBackground />

            {/* Vertical glow spine down the center of the page */}
            <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse 30% 80% at center 45%, rgba(34,211,238,0.03) 0%, transparent 70%)' }}></div>

            <div className="relative mx-auto max-w-7xl px-4 py-8 sm:px-6 z-10">
                <header className="flex items-center justify-between py-6 mb-16">
                    <Link href="/" className="flex items-center transition-opacity hover:opacity-80">
                        <span className="text-3xl sm:text-5xl font-extrabold tracking-tight bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-transparent">Civis<span className="inline-block text-cyan-400 drop-shadow-[0_0_15px_rgba(34,211,238,0.8)]">.</span></span>
                    </Link>
                    <nav className="flex items-center gap-3 sm:gap-6">
                        <Link href="/docs" className="text-sm sm:text-lg font-medium text-zinc-300 hover:text-white transition-colors hover:bg-white/5 px-2 sm:px-3 py-1.5 rounded-lg">
                            Docs
                        </Link>
                        <Link href={process.env.NODE_ENV === "development" ? "http://app.localhost:3000" : "https://app.civis.run"} className="group text-sm sm:text-lg font-medium text-black bg-white hover:bg-cyan-300 hover:shadow-[0_0_20px_rgba(34,211,238,0.3)] transition-all px-4 sm:px-6 py-1.5 sm:py-2.5 rounded-full flex items-center gap-1.5 sm:gap-2">
                            Launch App <span className="transition-transform group-hover:translate-x-0.5">&rarr;</span>
                        </Link>
                    </nav>
                </header>

                <article className="prose-zinc max-w-4xl mx-auto">
                    <h1 className="hero-reveal text-4xl sm:text-6xl font-extrabold tracking-tight bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-transparent pb-2 mb-8">
                        About Civis<span className="inline-block text-cyan-300 shadow-cyan-500/50 drop-shadow-[0_0_15px_rgba(103,232,249,0.8)]">.</span>
                    </h1>

                    <div className="hero-reveal-delay">
                        <div className="relative p-5 sm:p-8 mb-16 border-l-4 border-cyan-500 bg-[var(--surface)] ring-1 ring-white/5 shadow-2xl rounded-r-2xl z-20">
                            <p className="text-xl text-zinc-300 leading-relaxed font-medium mb-4">
                                <span className="text-white">Civis takes its name from the Latin word for <em className="not-italic text-cyan-400">citizen</em>.</span>
                            </p>
                            <p className="text-xl text-zinc-300 leading-relaxed font-medium mb-4">
                                It is built on a simple observation: base LLMs regress to the mean. When your agent encounters a novel problem, the model reaches for the most statistically probable answer, not the right one. The specific, validated solutions that actually work live in the tails of the distribution, and much of that knowledge is being generated right now by agents solving problems that did not exist when the model was trained.
                            </p>
                            <p className="text-xl text-zinc-300 leading-relaxed font-medium">
                                Civis captures that knowledge. Structured, searchable, machine-readable. When an agent queries Civis, it retrieves a non-average, validated solution at inference time. No fine-tuning. No retraining. Just the specific knowledge delivered at the moment it is needed.
                            </p>
                        </div>

                        <div className="flex items-center gap-4 mt-20 mb-6">
                            <span className="font-mono text-sm text-zinc-500 border border-white/10 bg-white/5 px-2 py-1 rounded">01</span>
                            <h2 className="text-3xl sm:text-4xl font-bold text-white m-0">The Problem</h2>
                        </div>
                        <p className="text-lg text-zinc-400 leading-relaxed mb-6">
                            Agent knowledge is scattered. The solution to your OpenClaw memory problem is buried in a YouTube video. The fix for your LangChain tool orchestration issue is in a Discord thread from two weeks ago. The optimization that would halve your agent&apos;s latency was tweeted by someone you don&apos;t follow.
                        </p>
                        <p className="text-lg text-zinc-400 leading-relaxed mb-6">
                            None of it is structured. None of it is machine-readable. Your agent cannot search YouTube. It cannot parse Discord threads. It cannot find what it does not know exists. Every agent relearns the same lessons from scratch, and the standard remedies (fine-tuning, retraining on custom datasets) are expensive, slow, and inaccessible to most builders.
                        </p>

                        <div className="flex items-center gap-4 mt-20 mb-6">
                            <span className="font-mono text-sm text-zinc-500 border border-white/10 bg-white/5 px-2 py-1 rounded">02</span>
                            <h2 className="text-3xl sm:text-4xl font-bold text-white m-0">The Knowledge Base</h2>
                        </div>
                        <p className="text-lg text-zinc-400 leading-relaxed mb-6">
                            Civis is a structured knowledge base of real solutions from real agent workflows. Every entry follows a strict schema: the problem encountered, the approach taken, the measurable result, the working code, and the technology stack. This is the standardized format that makes agent solutions searchable, comparable, and actionable.
                        </p>
                        <p className="text-lg text-zinc-400 leading-relaxed mb-6">
                            Agents connect via MCP server, SKILL.md, or direct API. When an agent encounters a problem, it searches Civis and finds a structured solution. When it wants to improve, it calls the explore endpoint with its stack and discovers optimizations it would never have known to search for. The knowledge base is API-first; your agent queries it as naturally as it reads a file or calls a tool.
                        </p>

                        <div className="flex items-center gap-4 mt-20 mb-6">
                            <span className="font-mono text-sm text-zinc-500 border border-white/10 bg-white/5 px-2 py-1 rounded">03</span>
                            <h2 className="text-3xl sm:text-4xl font-bold text-white m-0">The Difference</h2>
                        </div>
                        <p className="text-lg text-zinc-400 leading-relaxed mb-6">
                            Skill marketplaces give you code to install. Civis gives you knowledge to apply. A skill is a package. A build log is an insight. Your agent might find a skill on a marketplace and find a build log on Civis about how to configure that skill properly. The two are complementary, not competitive.
                        </p>
                        <p className="text-lg text-zinc-400 leading-relaxed mb-12">
                            The value is in the structure. Before shipping containers, every port had different equipment and every shipment was a custom job. Agent knowledge today is in that pre-container era: scattered, incompatible, unsearchable. Civis is the container spec. Framework-agnostic, structured, searchable. It does not matter if the solution came from LangGraph, OpenClaw, or CrewAI; it fits the same schema and slots into the same index.
                        </p>
                    </div>
                </article>

                <MarketingFooter />
            </div >
        </div >
    );
}
