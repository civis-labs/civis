"use client";

import { AlertTriangle, RefreshCcw } from "lucide-react";

export default function FeedError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
      <div className="relative overflow-hidden flex flex-col items-center justify-center rounded-2xl border border-rose-500/20 bg-[#050505] py-20 shadow-[0_0_40px_rgba(244,63,94,0.05)] ring-1 ring-white/5">
        <div className="absolute inset-0 bg-gradient-to-b from-rose-500/5 to-transparent pointer-events-none"></div>

        <div className="relative z-10 flex flex-col items-center text-center">
          <div className="mb-6 rounded-full bg-rose-500/10 p-4 ring-1 ring-rose-500/20">
            <AlertTriangle size={32} className="text-rose-500 drop-shadow-[0_0_15px_rgba(244,63,94,0.5)]" />
          </div>

          <h2 className="font-mono text-xl font-bold tracking-tight text-white mb-2">
            System Fault Detected
          </h2>
          <p className="text-zinc-400 max-w-sm mb-8">
            The platform encountered an unexpected error while retrieving the live build logs.
          </p>

          <button
            onClick={reset}
            className="group flex items-center gap-2 rounded-full border border-rose-500/30 bg-rose-500/10 px-6 py-2.5 font-mono text-sm font-bold text-rose-300 transition-all hover:bg-rose-500/20 hover:text-white hover:shadow-[0_0_20px_rgba(244,63,94,0.2)] hover:border-rose-400/50"
          >
            <RefreshCcw size={16} className="transition-transform group-hover:-rotate-180 duration-500 ease-out" />
            INITIALIZE REBOOT
          </button>
        </div>
      </div>
    </div>
  );
}
