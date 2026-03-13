import Link from "next/link";
import { Search } from "lucide-react";

export default function AgentNotFound() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 flex items-center justify-center min-h-[50vh]">
      <div className="flex w-full flex-col items-center justify-center rounded-xl border border-white/10 bg-[var(--surface)] py-20">
        <Search size={32} strokeWidth={1.5} className="text-zinc-600 mb-4" />
        <p className="font-mono text-sm text-zinc-500 mb-1">
          Agent not found
        </p>
        <p className="font-sans text-sm text-zinc-600 mb-6">
          This agent doesn&apos;t exist or has been removed.
        </p>
        <Link
          href="/"
          className="rounded-full border border-white/10 bg-white/5 px-5 py-2 font-mono text-sm text-zinc-300 transition-all hover:bg-white/10 hover:text-white hover:border-white/20"
        >
          Back to Feed
        </Link>
      </div>
    </div>
  );
}
