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
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 h-14 border-b border-white/10 bg-black/90 backdrop-blur-xl flex items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="font-mono text-sm font-bold tracking-[0.2em] text-white">CIVIS<span className="text-cyan-400">.</span></span>
        </Link>
        <button onClick={() => setMobileOpen(!mobileOpen)} className="p-2 text-zinc-400">
          {mobileOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Sidebar */}
      <nav className={`fixed inset-y-0 left-0 z-40 w-[240px] transform border-r border-white/10 bg-[#0a0a0a] transition-transform duration-300 lg:translate-x-0 flex flex-col ${mobileOpen ? "translate-x-0" : "-translate-x-full"} lg:h-screen lg:pt-0 pt-14`}>
        {/* Logo */}
        <div className="hidden lg:flex h-16 items-center px-5 border-b border-white/10 bg-black">
          <Link href="/" className="flex items-center gap-2.5 transition-opacity hover:opacity-80">
            <span className="font-mono text-sm font-bold tracking-[0.2em] text-white">CIVIS<span className="text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.5)]">.</span></span>
          </Link>
        </div>

        {/* Navigation Links */}
        <div className="flex-1 py-5 px-3 flex flex-col gap-0.5 overflow-y-auto">
          <span className="font-mono text-[10px] text-zinc-500 uppercase tracking-[0.15em] px-3 mb-3">Navigate</span>
          {links.map((link) => {
            const Icon = link.icon;
            const active = isActive(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium transition-all ${active
                  ? "bg-cyan-500/10 text-cyan-400 shadow-sm ring-1 ring-cyan-500/20"
                  : "text-zinc-400 hover:text-white hover:bg-white/5"
                  }`}
              >
                <Icon size={16} strokeWidth={active ? 2.2 : 1.8} className={active ? "text-cyan-400" : "opacity-50"} />
                {link.label}
              </Link>
            );
          })}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-white/10 bg-[#0a0a0a]">
          {isAuthed ? (
            <button
              onClick={() => { setMobileOpen(false); handleSignOut(); }}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium text-zinc-500 hover:text-white hover:bg-rose-500/10 hover:text-rose-400 transition-all border border-transparent hover:border-rose-500/20"
            >
              <LogOut size={16} strokeWidth={1.8} className="opacity-50" />
              Disconnect
            </button>
          ) : (
            <Link
              href="/login"
              onClick={() => setMobileOpen(false)}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-white/10 bg-[#111111] px-3 py-2.5 text-[13px] font-mono tracking-widest font-bold text-zinc-300 hover:text-white hover:border-cyan-500/30 hover:bg-[#1a1a1a] transition-all shadow-sm ring-1 ring-white/5"
            >
              <LogIn size={14} />
              IDENTIFY
            </Link>
          )}
        </div>
      </nav>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-30 bg-black/80 backdrop-blur-sm lg:hidden" onClick={() => setMobileOpen(false)} />
      )}
    </>
  );
}
