"use client";

export default function Error({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-[calc(100vh-3.5rem)] flex flex-col items-center justify-center px-4 font-mono">
      <p className="text-red-400 text-sm mb-2">RUNTIME ERROR</p>
      <h1 className="text-5xl font-bold text-[var(--text-primary)] mb-4">
        Something went wrong
      </h1>
      <p className="text-[var(--text-secondary)] mb-8 text-center max-w-md">
        An unexpected error occurred. The ledger is intact — try again.
      </p>
      <button
        onClick={reset}
        className="border border-[var(--border-bright)] bg-[var(--surface)] hover:bg-[var(--surface-raised)] text-[var(--accent)] rounded-lg px-6 py-3 text-sm transition-colors cursor-pointer"
      >
        Try again
      </button>
    </div>
  );
}
