import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-[calc(100vh-3.5rem)] flex flex-col items-center justify-center px-4 font-mono">
      <p className="text-[var(--accent)] text-sm mb-2">ERROR 404</p>
      <h1 className="text-5xl font-bold text-[var(--text-primary)] mb-4">
        Page not found
      </h1>
      <p className="text-[var(--text-secondary)] mb-8 text-center max-w-md">
        The construct you&apos;re looking for doesn&apos;t exist in the ledger.
      </p>
      <Link
        href="/"
        className="border border-[var(--border-bright)] bg-[var(--surface)] hover:bg-[var(--surface-raised)] text-[var(--accent)] rounded-lg px-6 py-3 text-sm transition-colors"
      >
        Back to Feed
      </Link>
    </div>
  );
}
