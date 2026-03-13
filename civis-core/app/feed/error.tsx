"use client";

import { AlertTriangle, RefreshCcw, Terminal } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function FeedError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();
  const [glitchActive, setGlitchActive] = useState(false);

  function handleRetry() {
    router.refresh();
    reset();
  }

  useEffect(() => {
    // Periodic glitch flicker
    const interval = setInterval(() => {
      setGlitchActive(true);
      setTimeout(() => setGlitchActive(false), 150);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
      <div className="relative overflow-hidden flex flex-col items-center justify-center rounded-2xl border border-white/[0.12] bg-gradient-to-b from-[#111111]/90 to-[#050505]/95 py-24 sm:py-28 backdrop-blur-3xl">
        {/* Scan lines overlay */}
        <div
          className="pointer-events-none absolute inset-0 z-0"
          style={{
            backgroundImage:
              "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.015) 2px, rgba(255,255,255,0.015) 4px)",
          }}
        />

        {/* Ambient rose glow at top */}
        <div className="pointer-events-none absolute -top-32 left-1/2 -translate-x-1/2 w-[500px] h-[300px] bg-[radial-gradient(ellipse_at_center,rgba(244,63,94,0.08)_0%,rgba(244,63,94,0.02)_50%,transparent_70%)]" />

        {/* Glitch bar (intermittent) */}
        {glitchActive && (
          <div className="pointer-events-none absolute inset-x-0 top-[45%] h-[2px] bg-rose-500/40 z-20" />
        )}

        {/* Content */}
        <div className="relative z-10 flex flex-col items-center text-center px-6">
          {/* Warning icon with pulse ring */}
          <div className="relative mb-8">
            <div className="absolute inset-0 rounded-full bg-rose-500/10 animate-ping" style={{ animationDuration: "3s" }} />
            <div className="relative rounded-full bg-rose-500/10 p-5 ring-1 ring-rose-500/20 backdrop-blur-sm">
              <AlertTriangle
                size={28}
                strokeWidth={1.8}
                className="text-rose-400 drop-shadow-[0_0_20px_rgba(244,63,94,0.6)]"
              />
            </div>
          </div>

          {/* Fault code label */}
          <div className="mb-4 flex items-center gap-2 rounded-full bg-rose-500/[0.06] border border-rose-500/10 px-3 py-1">
            <Terminal size={12} strokeWidth={2} className="text-rose-400/70" />
            <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-rose-400/70">
              Runtime Exception
            </span>
          </div>

          {/* Heading */}
          <h2 className="font-sans text-2xl sm:text-3xl font-extrabold tracking-tight text-white mb-3">
            System Fault Detected
          </h2>

          {/* Description */}
          <p className="text-zinc-400 text-sm sm:text-base max-w-md mb-10 leading-relaxed">
            The platform encountered an unexpected error while retrieving the
            live build logs. This is likely transient.
          </p>

          {/* Retry button */}
          <button
            onClick={handleRetry}
            className="group flex items-center gap-2.5 rounded-full border border-white/10 bg-white/5 px-7 py-3 font-mono text-sm font-bold text-zinc-300 transition-all duration-300 hover:bg-white/10 hover:text-white hover:border-white/20 hover:shadow-[0_0_30px_rgba(244,63,94,0.1)] active:scale-95"
          >
            <RefreshCcw
              size={15}
              strokeWidth={2}
              className="transition-transform duration-500 ease-out group-hover:-rotate-180"
            />
            RETRY
          </button>
        </div>

        {/* Bottom decorative line */}
        <div className="absolute bottom-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-rose-500/20 to-transparent" />
      </div>
    </div>
  );
}
