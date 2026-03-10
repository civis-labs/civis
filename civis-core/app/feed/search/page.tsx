"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Search as SearchIcon } from "lucide-react";
import { BuildLogCard, type BuildLogData } from "@/components/build-log-card";

interface SearchResult extends BuildLogData {
  similarity: number;
  composite_score: number;
  citation_count: number;
}

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [stackFilter, setStackFilter] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const doSearch = useCallback(async (q: string, stack: string) => {
    if (!q.trim()) {
      setResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    try {
      const params = new URLSearchParams({ q: q.trim() });
      const trimmedStack = stack.trim();
      if (trimmedStack) {
        params.set("stack", trimmedStack);
      }
      const res = await fetch(`/api/internal/search?${params.toString()}`);
      if (!res.ok) {
        setResults([]);
        return;
      }
      const json = await res.json();
      setResults(json.data || []);
    } catch {
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  const triggerSearch = useCallback(
    (q: string, stack: string) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => doSearch(q, stack), 300);
    },
    [doSearch]
  );

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <section className="mb-12 mt-6">
        <h1 className="hero-reveal text-5xl sm:text-6xl font-extrabold tracking-tight bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent leading-[1.1] pb-2 mb-3">
          Search
        </h1>
        <p className="hero-reveal-delay text-lg sm:text-xl text-zinc-400 max-w-2xl">
          Search the network for solutions, techniques, or roadblocks.
        </p>
      </section>

      <div className="mb-12">
        <div className="relative group rounded-2xl p-[1px] bg-gradient-to-b from-white/10 to-white/5 shadow-[0_8px_32px_rgba(0,0,0,0.5)] transition-all focus-within:shadow-[0_8px_40px_rgba(34,211,238,0.15)]">
          <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 to-transparent opacity-0 group-focus-within:opacity-100 transition-opacity blur-xl"></div>
          <div className="relative flex flex-col md:flex-row items-center gap-2 bg-[var(--surface)]/90 backdrop-blur-xl rounded-2xl p-2 z-10">
            <div className="flex-1 flex items-center relative w-full">
              <SearchIcon className="absolute left-4 text-[var(--accent)] drop-shadow-[0_0_8px_rgba(34,211,238,0.5)]" size={20} />
              <input
                type="text"
                placeholder="Search by problem, solution, or concept..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && triggerSearch(query, stackFilter)}
                className="w-full bg-transparent border-none py-4 pl-12 pr-4 font-mono text-sm text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:outline-none"
              />
            </div>

            <div className="w-full md:w-px h-px md:h-12 bg-[var(--border)]" />

            <div className="w-full md:w-auto flex items-center gap-2 px-2 pb-2 md:pb-0 relative" ref={dropdownRef}>
              <div className="relative w-full md:w-[220px]">
                <button
                  type="button"
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="w-full flex items-center justify-between bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg py-3 px-4 font-mono text-xs text-zinc-300 focus:outline-none focus:border-[var(--accent)]/30 transition-colors shadow-inner shadow-black/50"
                >
                  <span className="truncate">{stackFilter || "All Technologies"}</span>
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="#3f3f46" className={`w-4 h-4 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                  </svg>
                </button>

                {isDropdownOpen && (
                  <div className="absolute top-full mt-2 w-[240px] right-0 md:left-0 md:w-full bg-[#111111] border border-[var(--border)] rounded-lg shadow-xl shadow-black/50 z-50 overflow-hidden py-1">
                    <button
                      className={`w-full text-left px-4 py-2 font-mono text-xs hover:bg-white/5 transition-colors ${!stackFilter ? 'text-cyan-400 bg-cyan-500/10' : 'text-zinc-300'}`}
                      onClick={() => { setStackFilter(""); triggerSearch(query, ""); setIsDropdownOpen(false); }}
                    >
                      All Technologies
                    </button>

                    <div className="px-3 py-1 mt-2 mb-1">
                      <div className="text-[10px] font-sans font-bold uppercase tracking-widest text-[var(--accent)] mb-1">Frontend</div>
                      <button className="w-full text-left px-2 py-1.5 font-mono text-xs text-zinc-300 hover:text-white hover:bg-white/5 rounded-md" onClick={() => { setStackFilter("React"); triggerSearch(query, "React"); setIsDropdownOpen(false); }}>React</button>
                      <button className="w-full text-left px-2 py-1.5 font-mono text-xs text-zinc-300 hover:text-white hover:bg-white/5 rounded-md" onClick={() => { setStackFilter("Next.js"); triggerSearch(query, "Next.js"); setIsDropdownOpen(false); }}>Next.js</button>
                      <button className="w-full text-left px-2 py-1.5 font-mono text-xs text-zinc-300 hover:text-white hover:bg-white/5 rounded-md" onClick={() => { setStackFilter("Vue"); triggerSearch(query, "Vue"); setIsDropdownOpen(false); }}>Vue</button>
                    </div>

                    <div className="px-3 py-1 bg-black/20 border-t border-[var(--border)] mt-1">
                      <div className="text-[10px] font-sans font-bold uppercase tracking-widest text-[var(--accent)] mb-1 mt-2">Backend</div>
                      <button className="w-full text-left px-2 py-1.5 font-mono text-xs text-zinc-300 hover:text-white hover:bg-white/5 rounded-md" onClick={() => { setStackFilter("Node.js"); triggerSearch(query, "Node.js"); setIsDropdownOpen(false); }}>Node.js</button>
                      <button className="w-full text-left px-2 py-1.5 font-mono text-xs text-zinc-300 hover:text-white hover:bg-white/5 rounded-md" onClick={() => { setStackFilter("Python"); triggerSearch(query, "Python"); setIsDropdownOpen(false); }}>Python</button>
                      <button className="w-full text-left px-2 py-1.5 font-mono text-xs text-zinc-300 hover:text-white hover:bg-white/5 rounded-md" onClick={() => { setStackFilter("FastAPI"); triggerSearch(query, "FastAPI"); setIsDropdownOpen(false); }}>FastAPI</button>
                    </div>

                    <div className="px-3 py-1 bg-black/20 border-t border-[var(--border)] mt-1">
                      <div className="text-[10px] font-sans font-bold uppercase tracking-widest text-[var(--accent)] mb-1 mt-2">Database</div>
                      <button className="w-full text-left px-2 py-1.5 font-mono text-xs text-zinc-300 hover:text-white hover:bg-white/5 rounded-md" onClick={() => { setStackFilter("PostgreSQL"); triggerSearch(query, "PostgreSQL"); setIsDropdownOpen(false); }}>PostgreSQL</button>
                      <button className="w-full text-left px-2 py-1.5 font-mono text-xs text-zinc-300 hover:text-white hover:bg-white/5 rounded-md" onClick={() => { setStackFilter("Supabase"); triggerSearch(query, "Supabase"); setIsDropdownOpen(false); }}>Supabase</button>
                      <button className="w-full text-left px-2 py-1.5 font-mono text-xs text-zinc-300 hover:text-white hover:bg-white/5 rounded-md" onClick={() => { setStackFilter("MongoDB"); triggerSearch(query, "MongoDB"); setIsDropdownOpen(false); }}>MongoDB</button>
                    </div>

                    <div className="px-3 py-1 bg-black/20 border-t border-[var(--border)] mt-1">
                      <div className="text-[10px] font-sans font-bold uppercase tracking-widest text-[var(--accent)] mb-1 mt-2">AI / LLM</div>
                      <button className="w-full text-left px-2 py-1.5 font-mono text-xs text-zinc-300 hover:text-white hover:bg-white/5 rounded-md" onClick={() => { setStackFilter("GPT-4"); triggerSearch(query, "GPT-4"); setIsDropdownOpen(false); }}>GPT-4</button>
                      <button className="w-full text-left px-2 py-1.5 font-mono text-xs text-zinc-300 hover:text-white hover:bg-white/5 rounded-md" onClick={() => { setStackFilter("Claude"); triggerSearch(query, "Claude"); setIsDropdownOpen(false); }}>Claude</button>
                      <button className="w-full text-left px-2 py-1.5 font-mono text-xs text-zinc-300 hover:text-white hover:bg-white/5 rounded-md" onClick={() => { setStackFilter("LangChain"); triggerSearch(query, "LangChain"); setIsDropdownOpen(false); }}>LangChain</button>
                    </div>
                  </div>
                )}
              </div>
              <button
                onClick={() => triggerSearch(query, stackFilter)}
                disabled={isSearching}
                className="shrink-0 bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 hover:bg-cyan-500/20 hover:shadow-[0_0_15px_rgba(34,211,238,0.3)] font-bold font-mono text-xs px-6 py-3 rounded-lg transition-all h-[42px]"
              >
                {isSearching ? "..." : "SEARCH"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Removed redundant empty state box */}
      {!isSearching && results.length === 0 && (query || stackFilter) && (
        <div className="text-center py-20 font-mono text-sm text-zinc-500">
          No build logs found matching your query.
        </div>
      )}

      {results.length > 0 && (
        <div className="space-y-3">
          {results.map((result) => (
            <div key={result.id} className="relative">
              <BuildLogCard log={result} citationCount={result.citation_count} />
              <span className="absolute right-3 top-3 rounded-full bg-[var(--surface-raised)] px-2 py-0.5 font-mono text-[10px] text-[var(--accent)] border border-[var(--border)]">
                {Math.round((result.composite_score ?? result.similarity ?? 0) * 100)}%
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
