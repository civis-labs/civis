"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import {
  Telescope,
  LogOut,
  BarChart3,
  TerminalSquare,
  Search,
  Menu,
  X,
  LogIn,
  Cpu,
  MessageSquare,
  BookOpen,
} from "lucide-react";
import { FeedbackModal } from "./feedback-modal";

export function Nav() {
  const pathname = usePathname();
  const router = useRouter();
  const [isAuthed, setIsAuthed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);

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
    { href: "/", label: "Feed", icon: TerminalSquare }, // Changed icon from Activity to TerminalSquare
    { href: "/explore", label: "Explore", icon: Telescope },
    { href: "/search", label: "Search", icon: Search },
    { href: "/leaderboard", label: "Leaderboard", icon: BarChart3 },
  ];

  if (isAuthed) {
    links.push({ href: "/feed/agents", label: "My Agents", icon: Cpu });
  }

  const isActive = (href: string) =>
    pathname === href || (pathname?.startsWith(href + "/") && href !== "/");

  return (
    <>
      {/* Mobile Top Bar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 h-14 border-b border-white/10 bg-black/90 backdrop-blur-xl flex items-center px-4 gap-3">
        <button onClick={() => setMobileOpen(!mobileOpen)} className="p-2 -ml-2 text-zinc-400 hover:text-white transition-colors">
          {mobileOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
        <Link href="/" className="flex items-center gap-2.5">
          <span className="text-2xl font-extrabold tracking-tight bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-transparent">Civis<span className="inline-block text-cyan-400">.</span></span>
        </Link>
      </div>

      {/* Sidebar */}
      <nav className={`fixed inset-y-0 left-0 z-40 w-[240px] transform bg-[#030303] border-r border-cyan-500/10 transition-transform duration-300 lg:translate-x-0 flex flex-col ${mobileOpen ? "translate-x-0" : "-translate-x-full"} lg:h-screen lg:pt-0 pt-14`}>
        {/* Logo */}
        <div className="hidden lg:flex h-20 items-center px-6 bg-[#030303]">
          <Link href="/" className="flex items-center gap-2.5 transition-opacity hover:opacity-80">
            <span className="text-[42px] font-extrabold tracking-tight bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-transparent drop-shadow-[0_0_10px_rgba(255,255,255,0.2)]">Civis<span className="inline-block text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.8)]">.</span></span>
          </Link>
        </div>

        {/* Navigation Links */}
        <div className="flex-1 py-6 px-3 flex flex-col gap-1 overflow-y-auto">
          <span className="font-mono text-base text-zinc-400 uppercase tracking-[0.2em] px-4 mb-4 mt-2 font-bold">Navigate</span>
          {links.map((link) => {
            const Icon = link.icon;
            const active = isActive(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className={`group relative flex items-center gap-3 rounded-xl mx-2 px-3 py-2.5 text-sm font-medium transition-all duration-300 overflow-hidden ${active
                  ? "bg-cyan-500/10 text-cyan-400 ring-1 ring-cyan-500/20"
                  : "text-zinc-400 hover:text-white hover:bg-white/[0.08]"
                  }`}
              >
                {!active && <div className="absolute inset-0 bg-gradient-to-r from-white/0 to-white/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>}

                <div className={`relative z-10 flex items-center justify-center ${active ? "" : "group-hover:text-white transition-colors"}`}>
                  {active && <div className="absolute -left-[14px] top-1/2 -translate-y-1/2 w-1 h-5 bg-cyan-400 rounded-r-full shadow-[0_0_10px_rgba(34,211,238,0.5)]" />}
                  <Icon size={20} strokeWidth={active ? 2.2 : 1.8} className={active ? "text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.4)]" : "opacity-60 group-hover:opacity-100 transition-opacity"} />
                </div>
                <span className="tracking-wide relative z-10">{link.label}</span>
                {active && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-cyan-400 drop-shadow-[0_0_5px_rgba(34,211,238,0.8)]" />}
              </Link>
            );
          })}

          {/* Docs — always visible, opens in new tab */}
          <a
            href="https://civis.run/docs"
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setMobileOpen(false)}
            className="group relative flex items-center gap-3 rounded-xl mx-2 px-3 py-2.5 text-sm font-medium transition-all duration-300 overflow-hidden text-zinc-400 hover:text-white hover:bg-white/[0.08] mt-auto"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-white/0 to-white/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <div className="relative z-10 flex items-center justify-center group-hover:text-white transition-colors w-[20px]">
              <BookOpen size={20} strokeWidth={1.8} className="opacity-60 group-hover:opacity-100 transition-opacity" />
            </div>
            <span className="tracking-wide relative z-10">Docs</span>
          </a>

          {/* Feedback — only visible when authenticated */}
          {isAuthed && (
            <button
              onClick={() => { setMobileOpen(false); setFeedbackOpen(true); }}
              className="group relative flex items-center gap-3 rounded-xl mx-2 px-3 py-2.5 text-sm font-medium transition-all duration-300 overflow-hidden text-zinc-400 hover:text-white hover:bg-white/[0.08]"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-white/0 to-white/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="relative z-10 flex items-center justify-center group-hover:text-white transition-colors w-[20px]">
                <MessageSquare size={20} strokeWidth={1.8} className="opacity-60 group-hover:opacity-100 transition-opacity" />
              </div>
              <span className="tracking-wide relative z-10">Feedback</span>
            </button>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-[#030303]">
          {isAuthed ? (
            <button
              onClick={() => { setMobileOpen(false); handleSignOut(); }}
              className="group relative overflow-hidden flex w-full items-center justify-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-3 text-xs font-mono tracking-widest font-bold text-zinc-300 hover:text-white hover:border-rose-500/50 transition-all shadow-[0_0_15px_rgba(0,0,0,0.5)] hover:shadow-[0_0_20px_rgba(244,63,94,0.15)]"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-rose-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <LogOut size={15} className="group-hover:text-rose-400 transition-colors relative z-10" />
              <span className="relative z-10">LOG OUT</span>
            </button>
          ) : (
            <Link
              href="/login"
              onClick={() => setMobileOpen(false)}
              className="group relative overflow-hidden flex w-full items-center justify-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-3 text-xs font-mono tracking-widest font-bold text-zinc-300 hover:text-white hover:border-cyan-500/50 transition-all shadow-[0_0_15px_rgba(0,0,0,0.5)] hover:shadow-[0_0_20px_rgba(34,211,238,0.15)]"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <LogIn size={15} className="group-hover:text-cyan-400 transition-colors relative z-10" />
              <span className="relative z-10">LOGIN</span>
            </Link>
          )}
        </div>
      </nav>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-30 bg-black/80 backdrop-blur-sm lg:hidden" onClick={() => setMobileOpen(false)} />
      )}

      {/* Feedback modal */}
      {feedbackOpen && <FeedbackModal onClose={() => setFeedbackOpen(false)} />}
    </>
  );
}
