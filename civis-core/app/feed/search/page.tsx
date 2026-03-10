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
  const [hasSearched, setHasSearched] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const doSearch = useCallback(async (q: string, stack: string) => {
    if (!q.trim()) {
      setResults([]);
      setHasSearched(false);
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
        setHasSearched(true);
        return;
      }
      const json = await res.json();
      setResults(json.data || []);
      setHasSearched(true);
    } catch {
      setResults([]);
      setHasSearched(true);
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

  const handleQueryChange = (value: string) => {
    setQuery(value);
    triggerSearch(value, stackFilter);
  };

  const handleStackChange = (value: string) => {
    setStackFilter(value);
    triggerSearch(query, value);
  };

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
        <div className="relative group rounded-2xl p-[1px] bg-gradient-to-b from-white/10 to-white/5 shadow-[0_8px_32px_rgba(0,0,0,0.5)] transition-all overflow-hidden focus-within:shadow-[0_8px_40px_rgba(34,211,238,0.15)]">
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

            <div className="w-full md:w-auto flex items-center gap-2 px-2 pb-2 md:pb-0">
              <select
                value={stackFilter}
                onChange={(e) => setStackFilter(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && triggerSearch(query, stackFilter)}
                className="w-full md:w-[220px] bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg py-3 px-4 font-mono text-xs text-zinc-300 placeholder-[var(--text-tertiary)] focus:outline-none focus:border-[var(--accent)]/30 transition-colors shadow-inner shadow-black/50 appearance-none bg-no-repeat cursor-pointer"
                style={{
                  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke-width='1.5' stroke='%233f3f46' class='w-6 h-6'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' d='M8.25 15L12 18.75 15.75 15m-7.5-6L12 5.25 15.75 9' /%3E%3C/svg%3E")`,
                  backgroundPosition: 'right 0.75rem center',
                  backgroundSize: '1.25rem 1.25rem'
                }}
              >
                <option value="">All Stacks</option>
                <optgroup label="Frontend" className="text-zinc-500 font-sans">
                  <option value="React" className="text-zinc-300 font-mono">React</option>
                  <option value="Next.js" className="text-zinc-300 font-mono">Next.js</option>
                  <option value="Vue" className="text-zinc-300 font-mono">Vue</option>
                </optgroup>
                <optgroup label="Backend" className="text-zinc-500 font-sans">
                  <option value="Node.js" className="text-zinc-300 font-mono">Node.js</option>
                  <option value="Python" className="text-zinc-300 font-mono">Python</option>
                  <option value="FastAPI" className="text-zinc-300 font-mono">FastAPI</option>
                </optgroup>
                <optgroup label="Database" className="text-zinc-500 font-sans">
                  <option value="PostgreSQL" className="text-zinc-300 font-mono">PostgreSQL</option>
                  <option value="Supabase" className="text-zinc-300 font-mono">Supabase</option>
                  <option value="MongoDB" className="text-zinc-300 font-mono">MongoDB</option>
                </optgroup>
                <optgroup label="AI / LLM" className="text-zinc-500 font-sans">
                  <option value="GPT-4" className="text-zinc-300 font-mono">GPT-4</option>
                  <option value="Claude" className="text-zinc-300 font-mono">Claude</option>
                  <option value="LangChain" className="text-zinc-300 font-mono">LangChain</option>
                </optgroup>
              </select>
              <button
                onClick={() => triggerSearch(query, stackFilter)}
                disabled={isSearching}
                className="shrink-0 bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 hover:bg-cyan-500/20 hover:shadow-[0_0_15px_rgba(34,211,238,0.3)] font-bold font-mono text-xs px-6 py-3 rounded-lg transition-all"
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
