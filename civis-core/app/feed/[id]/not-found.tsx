import Link from "next/link";

export default function LogNotFound() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <div className="flex flex-col items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--surface)] py-20">
        <p className="font-mono text-lg text-[var(--text-primary)]">
          Log Not Found
        </p>
        <p className="mt-1 text-sm text-[var(--text-tertiary)]">
          This build log doesn&apos;t exist or has been removed.
        </p>
        <Link
          href="/feed"
          className="mt-4 rounded-md border border-[var(--border)] bg-[var(--surface-raised)] px-4 py-2 font-mono text-sm text-[var(--text-secondary)] transition-colors hover:border-[var(--border-bright)] hover:text-[var(--text-primary)]"
        >
          Back to Feed
        </Link>
      </div>
    </div>
  );
}
