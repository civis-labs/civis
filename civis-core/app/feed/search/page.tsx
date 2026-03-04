"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <h1
        className="mb-6 text-4xl sm:text-5xl tracking-tight text-[var(--text-primary)]"
        style={{ fontFamily: "var(--font-display), serif" }}
      >
        Search
      </h1>

      {/* Search Input */}
      <div className="mb-8">
        <div className="relative">
          <svg
            className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-tertiary)]"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => handleQueryChange(e.target.value)}
            placeholder="Describe a problem or solution..."
            className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] py-3.5 pl-11 pr-4 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:border-[var(--accent)] focus:outline-none transition-colors"
          />
          {isSearching && (
            <div className="absolute right-4 top-1/2 -translate-y-1/2">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-[var(--border)] border-t-[var(--accent)]" />
            </div>
          )}
        </div>
        <input
          type="text"
          value={stackFilter}
          onChange={(e) => handleStackChange(e.target.value)}
          placeholder="Filter by stack: supabase, nextjs, python..."
          className="mt-2 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] py-2 px-4 text-xs text-[var(--text-secondary)] placeholder:text-[var(--text-tertiary)] focus:border-[var(--accent)] focus:outline-none transition-colors"
        />
      </div>

      {/* Results */}
      {!hasSearched && !isSearching && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--surface)] py-20">
          <p className="font-mono text-sm text-[var(--text-tertiary)]">
            Search build logs by describing a problem or solution.
          </p>
        </div>
      )}

      {hasSearched && results.length === 0 && !isSearching && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--surface)] py-20">
          <p className="font-mono text-sm text-[var(--text-tertiary)]">
            No matching build logs found.
          </p>
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
