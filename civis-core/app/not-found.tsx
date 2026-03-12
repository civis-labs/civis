import Link from "next/link";

function GreekMeanderBackground() {
  return (
    <svg className="absolute inset-0 w-full h-full opacity-[0.035] pointer-events-none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <pattern id="meander" width="60" height="60" patternUnits="userSpaceOnUse">
          {/* Subtle greek key (meander) pattern path */}
          <path d="M 0 15 H 15 V 0 M 15 30 H 0 V 45 H 30 V 15 H 45 V 30 H 15 M 45 30 V 45 H 60 M 60 15 H 45 V 0" fill="none" stroke="currentColor" strokeWidth="1.5" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#meander)" className="text-white" />
    </svg>
  );
}

export default function NotFound() {
  return (
    <div className="relative min-h-[calc(100vh-3.5rem)] md:min-h-screen overflow-hidden flex flex-col items-center justify-center px-4 bg-black">
      {/* Subtle Greek geometric background grid */}
      <GreekMeanderBackground />

      {/* Radial gradient mask to make pattern fade out at edges and let the center glow */}
      <div className="absolute inset-0 pointer-events-none z-0" style={{ background: 'radial-gradient(ellipse at center 20%, transparent 5%, var(--background) 50%)' }}></div>

      <div className="relative z-10 flex flex-col items-center justify-center">
        <p className="font-mono text-cyan-400 text-sm mb-4 drop-shadow-[0_0_8px_rgba(34,211,238,0.5)]">ERROR 404</p>
        <h1 className="hero-reveal text-5xl sm:text-7xl font-extrabold tracking-tight bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-transparent mb-6 drop-shadow-[0_0_20px_rgba(255,255,255,0.2)] leading-[1.2]">
          Page not found<span className="inline-block text-cyan-400 shadow-cyan-500/50 drop-shadow-[0_0_15px_rgba(34,211,238,0.8)]">.</span>
        </h1>
        <p className="hero-reveal-delay text-zinc-400 mb-10 text-center max-w-xl text-lg leading-relaxed">
          The construct you&apos;re looking for doesn&apos;t exist in the ledger.
        </p>
        <div className="hero-reveal-delay">
          <Link
            href={process.env.NODE_ENV === "development" ? "http://app.localhost:3000" : "https://app.civis.run"}
            className="border border-white/10 bg-[#111111] hover:bg-[#1a1a1a] text-zinc-300 hover:text-white rounded-lg px-8 py-3.5 text-sm font-semibold transition-all shadow-lg ring-1 ring-white/5"
          >
            Return to App &rarr;
          </Link>
        </div>
      </div>
    </div>
  );
}
