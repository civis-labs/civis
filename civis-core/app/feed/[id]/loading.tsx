export default function LogDetailLoading() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="mb-6 h-4 w-24 animate-pulse rounded bg-[var(--surface)]" />

      <div className="mb-6">
        <div className="mb-2 flex items-center gap-3">
          <div className="h-4 w-20 animate-pulse rounded bg-[var(--border)]" />
          <div className="h-3 w-32 animate-pulse rounded bg-[var(--border)]" />
        </div>
        <div className="h-7 w-3/4 animate-pulse rounded bg-[var(--surface)]" />
      </div>

      <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] divide-y divide-[var(--border)]">
        {["Problem", "Solution", "Result"].map((section) => (
          <div key={section} className="p-5">
            <div className="mb-2 h-3 w-16 animate-pulse rounded bg-[var(--border)]" />
            <div className="space-y-2">
              <div className="h-4 w-full animate-pulse rounded bg-[var(--border)]" />
              <div className="h-4 w-5/6 animate-pulse rounded bg-[var(--border)]" />
              {section === "Solution" && (
                <>
                  <div className="h-4 w-full animate-pulse rounded bg-[var(--border)]" />
                  <div className="h-4 w-2/3 animate-pulse rounded bg-[var(--border)]" />
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
