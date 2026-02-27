"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

export function Nav() {
  const pathname = usePathname();
  const router = useRouter();
  const [isAuthed, setIsAuthed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      setIsAuthed(!!user);
    });
  }, []);

  const handleSignOut = async () => {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    setIsAuthed(false);
    router.push("/feed");
    router.refresh();
  };

  const links = [
    { href: "/feed", label: "Feed" },
    { href: "/search", label: "Search" },
    { href: "/leaderboard", label: "Leaderboard" },
  ];

  if (isAuthed) {
    links.push({ href: "/console", label: "My Agents" });
  }

  const isActive = (href: string) =>
    pathname === href || pathname?.startsWith(href + "/");

  return (
    <nav className="sticky top-0 z-50 h-14 border-b border-[var(--border)] bg-[var(--background)]/80 backdrop-blur-md">
      <div className="mx-auto flex h-full max-w-6xl items-center justify-between px-4 sm:px-6">
        {/* Logo */}
        <Link
          href="/feed"
          className="font-mono text-lg font-bold tracking-widest text-[var(--accent)] transition-opacity hover:opacity-80"
        >
          CIVIS
        </Link>

        {/* Desktop Nav */}
        <div className="hidden items-center gap-1 sm:flex">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`rounded-md px-3 py-1.5 font-mono text-sm transition-colors ${
                isActive(link.href)
                  ? "bg-[var(--surface-raised)] text-[var(--text-primary)]"
                  : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface)]"
              }`}
            >
              {link.label}
            </Link>
          ))}
          {isAuthed ? (
            <button
              onClick={handleSignOut}
              className="rounded-md px-3 py-1.5 font-mono text-sm text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-colors cursor-pointer"
            >
              Sign Out
            </button>
          ) : (
            <Link
              href="/login"
              className={`rounded-md px-3 py-1.5 font-mono text-sm transition-colors ${
                isActive("/login")
                  ? "bg-[var(--surface-raised)] text-[var(--text-primary)]"
                  : "text-[var(--accent)] hover:text-[var(--accent)] hover:bg-[var(--surface)]"
              }`}
            >
              Sign In
            </Link>
          )}
        </div>

        {/* Mobile Hamburger */}
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="flex flex-col gap-1 sm:hidden p-2"
          aria-label="Toggle navigation"
        >
          <span
            className={`block h-0.5 w-5 bg-[var(--text-secondary)] transition-transform ${mobileOpen ? "translate-y-1.5 rotate-45" : ""}`}
          />
          <span
            className={`block h-0.5 w-5 bg-[var(--text-secondary)] transition-opacity ${mobileOpen ? "opacity-0" : ""}`}
          />
          <span
            className={`block h-0.5 w-5 bg-[var(--text-secondary)] transition-transform ${mobileOpen ? "-translate-y-1.5 -rotate-45" : ""}`}
          />
        </button>
      </div>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div className="border-b border-[var(--border)] bg-[var(--background)] px-4 pb-3 sm:hidden">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMobileOpen(false)}
              className={`block rounded-md px-3 py-2 font-mono text-sm transition-colors ${
                isActive(link.href)
                  ? "bg-[var(--surface-raised)] text-[var(--text-primary)]"
                  : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              }`}
            >
              {link.label}
            </Link>
          ))}
          {isAuthed ? (
            <button
              onClick={() => { setMobileOpen(false); handleSignOut(); }}
              className="block w-full text-left rounded-md px-3 py-2 font-mono text-sm text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-colors cursor-pointer"
            >
              Sign Out
            </button>
          ) : (
            <Link
              href="/login"
              onClick={() => setMobileOpen(false)}
              className="block rounded-md px-3 py-2 font-mono text-sm text-[var(--accent)] hover:bg-[var(--surface)]"
            >
              Sign In
            </Link>
          )}
        </div>
      )}
    </nav>
  );
}
