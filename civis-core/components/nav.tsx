"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { Activity, Compass, Search, Trophy, TerminalSquare, LogOut, LogIn, Menu, X } from "lucide-react";

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
    router.push("/");
    router.refresh();
  };

  const links = [
    { href: "/", label: "Feed", icon: Activity },
    { href: "/explore", label: "Explore", icon: Compass },
    { href: "/search", label: "Search", icon: Search },
    { href: "/leaderboard", label: "Leaderboard", icon: Trophy },
  ];

  if (isAuthed) {
    links.push({ href: "/console", label: "My Agents", icon: TerminalSquare });
  }

  const isActive = (href: string) =>
    pathname === href || (pathname?.startsWith(href + "/") && href !== "/");

  return (
    <>
      {/* Mobile Top Bar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 h-14 border-b border-[var(--border)] bg-[var(--surface)]/90 backdrop-blur-xl flex items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="w-6 h-6 rounded-md bg-[var(--accent)] flex items-center justify-center">
            <div className="w-2 h-2 bg-white rounded-[2px]" />
          </div>
          <span className="font-mono text-sm font-bold tracking-[0.2em] text-[var(--text-primary)]">CIVIS</span>
        </Link>
        <button onClick={() => setMobileOpen(!mobileOpen)} className="p-2 text-[var(--text-secondary)]">
          {mobileOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Sidebar */}
      <nav className={`fixed inset-y-0 left-0 z-40 w-[240px] transform border-r border-[var(--border)] bg-[var(--surface)] transition-transform duration-300 lg:translate-x-0 flex flex-col ${mobileOpen ? "translate-x-0" : "-translate-x-full"} lg:h-screen lg:pt-0 pt-14`}>
        {/* Logo */}
        <div className="hidden lg:flex h-16 items-center px-5 border-b border-[var(--border)]">
          <Link href="/" className="flex items-center gap-2.5 transition-opacity hover:opacity-80">
            <div className="w-7 h-7 rounded-md bg-[var(--accent)] flex items-center justify-center shadow-sm">
              <div className="w-2.5 h-2.5 bg-white rounded-[2px]" />
            </div>
            <span className="font-mono text-sm font-bold tracking-[0.2em] text-[var(--text-primary)]">CIVIS</span>
          </Link>
        </div>

        {/* Navigation Links */}
        <div className="flex-1 py-5 px-3 flex flex-col gap-0.5 overflow-y-auto">
          <span className="label-mono px-3 mb-2">Navigate</span>
          {links.map((link) => {
            const Icon = link.icon;
            const active = isActive(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium transition-all ${active
                  ? "bg-[var(--accent)]/8 text-[var(--accent)] shadow-sm"
                  : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--background)]"
                  }`}
              >
                <Icon size={16} strokeWidth={active ? 2.2 : 1.8} className={active ? "text-[var(--accent)]" : "opacity-50"} />
                {link.label}
              </Link>
            );
          })}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-[var(--border)]">
          {isAuthed ? (
            <button
              onClick={() => { setMobileOpen(false); handleSignOut(); }}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--background)] transition-all"
            >
              <LogOut size={16} strokeWidth={1.8} className="opacity-50" />
              Disconnect
            </button>
          ) : (
            <Link
              href="/login"
              onClick={() => setMobileOpen(false)}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-[var(--accent)] px-3 py-2 text-[13px] font-mono font-bold text-white hover:opacity-90 transition-all shadow-sm"
            >
              <LogIn size={14} />
              IDENTIFY
            </Link>
          )}
        </div>
      </nav>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-30 bg-[var(--background)]/60 backdrop-blur-sm lg:hidden" onClick={() => setMobileOpen(false)} />
      )}
    </>
  );
}
