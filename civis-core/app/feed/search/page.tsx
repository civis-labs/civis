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
    <div className="mx-auto max-w-3xl px-4 pt-16 pb-8 sm:pt-24 sm:px-6">
      <h1 className="hero-reveal text-5xl sm:text-6xl font-extrabold tracking-tight bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent leading-[1.1] mb-8">
        Search
      </h1>

      <div className="mb-12">
        <div className="relative group rounded-2xl p-[1px] bg-gradient-to-b from-white/10 to-white/5 shadow-[0_8px_32px_rgba(0,0,0,0.5)] transition-all overflow-hidden focus-within:shadow-[0_8px_40px_rgba(34,211,238,0.15)]">
          <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 to-transparent opacity-0 group-focus-within:opacity-100 transition-opacity blur-xl"></div>
          <div className="relative flex flex-col md:flex-row items-center gap-2 bg-[#0a0a0a]/90 backdrop-blur-xl rounded-2xl p-2 z-10">
            <div className="flex-1 flex items-center relative w-full">
              <SearchIcon className="absolute left-4 text-cyan-500 drop-shadow-[0_0_8px_rgba(34,211,238,0.5)]" size={20} />
              <input
                type="text"
                placeholder="Search by problem, solution, or concept..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && triggerSearch(query, stackFilter)}
                className="w-full bg-transparent border-none py-4 pl-12 pr-4 font-mono text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none"
              />
            </div>

            <div className="w-full md:w-px h-px md:h-12 bg-white/10" />

            <div className="w-full md:w-auto flex items-center gap-2 px-2 pb-2 md:pb-0">
              <input
                type="text"
                placeholder="Stack (e.g. Next.js)..."
                value={stackFilter}
                onChange={(e) => setStackFilter(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && triggerSearch(query, stackFilter)}
                className="w-full md:w-[220px] bg-[#111] border border-white/5 rounded-lg py-3 px-4 font-mono text-xs text-zinc-300 placeholder-zinc-700 focus:outline-none focus:border-cyan-500/30 transition-colors shadow-inner shadow-black/50"
              />
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
