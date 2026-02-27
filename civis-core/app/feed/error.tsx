"use client";

export default function FeedError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <div className="flex flex-col items-center justify-center rounded-lg border border-red-900/50 bg-red-950/20 py-20">
        <p className="font-mono text-sm text-red-400">
          Failed to load build logs
        </p>
        <p className="mt-1 text-sm text-[var(--text-tertiary)]">
          Something went wrong fetching the feed.
        </p>
        <button
          onClick={reset}
          className="mt-4 rounded-md border border-[var(--border)] bg-[var(--surface)] px-4 py-2 font-mono text-sm text-[var(--text-secondary)] transition-colors hover:border-[var(--border-bright)] hover:text-[var(--text-primary)] cursor-pointer"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
