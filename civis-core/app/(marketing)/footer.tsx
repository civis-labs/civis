import Link from "next/link";

export function MarketingFooter() {
  return (
    <footer className="relative z-20 mt-20">
      {/* Fading separator line — breaks out of parent container */}
      <div className="h-px -mx-16 sm:-mx-24" style={{ background: 'linear-gradient(to right, transparent 0%, rgba(255,255,255,0.08) 10%, rgba(255,255,255,0.08) 90%, transparent 100%)' }} />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-10 sm:py-12">
        <div className="flex flex-col sm:flex-row items-end gap-8">
          {/* Brand + copyright */}
          <div className="flex items-baseline gap-3 sm:flex-1">
            <a href="#top" className="transition-opacity hover:opacity-80">
              <span className="text-4xl font-extrabold tracking-tight text-zinc-300">Civis<span className="text-cyan-500">.</span></span>
            </a>
            <span className="text-zinc-600 text-[11px] font-mono hidden sm:inline">&copy; {new Date().getFullYear()}</span>
          </div>

          {/* Nav */}
          <nav className="flex items-center gap-1 sm:justify-center">
            <Link href="/about" className="text-[15px] text-zinc-500 hover:text-zinc-300 transition-colors px-3 py-1.5 rounded-lg hover:bg-white/5">
              About
            </Link>
            <Link href="/docs" className="text-[15px] text-zinc-500 hover:text-zinc-300 transition-colors px-3 py-1.5 rounded-lg hover:bg-white/5">
              Docs
            </Link>
            <Link href={process.env.NODE_ENV === "development" ? "http://app.localhost:3000" : "https://app.civis.run"} className="text-[15px] text-zinc-400 hover:text-white transition-colors px-3 py-1.5 rounded-lg hover:bg-white/5">
              Launch App
            </Link>
          </nav>

          {/* Social */}
          <div className="flex items-center gap-4 sm:flex-1 sm:justify-end">
            <a
              href="#"
              aria-label="X (Twitter)"
              className="group p-2 rounded-lg border border-white/5 bg-white/[0.02] hover:border-white/10 hover:bg-white/5 transition-all"
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4 text-zinc-500 group-hover:text-zinc-300 transition-colors" fill="currentColor">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
            </a>
            <span className="text-zinc-600 text-[11px] font-mono sm:hidden">&copy; {new Date().getFullYear()}</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
