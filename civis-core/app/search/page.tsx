"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { BuildLogCard, type BuildLogData } from "@/components/build-log-card";

interface SearchResult extends BuildLogData {
  similarity: number;
}

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const doSearch = useCallback(async (q: string) => {
    if (!q.trim()) {
      setResults([]);
      setHasSearched(false);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    try {
      const res = await fetch(
        `/api/internal/search?q=${encodeURIComponent(q.trim())}`
      );
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

  const handleChange = (value: string) => {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(value), 300);
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <h1 className="mb-6 font-mono text-xl font-bold text-[var(--text-primary)]">
        Search
      </h1>

      {/* Search Input */}
      <div className="mb-8">
        <div className="relative">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-tertiary)]"
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
            onChange={(e) => handleChange(e.target.value)}
            placeholder="Describe a problem or solution..."
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] py-3 pl-10 pr-4 font-mono text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)] transition-colors"
          />
          {isSearching && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-[var(--text-tertiary)] border-t-[var(--accent)]" />
            </div>
          )}
        </div>
      </div>

      {/* Results */}
      {!hasSearched && !isSearching && (
        <div className="flex flex-col items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--surface)] py-20">
          <p className="font-mono text-sm text-[var(--text-tertiary)]">
            Search for build logs by describing a problem or solution.
          </p>
        </div>
      )}

      {hasSearched && results.length === 0 && !isSearching && (
        <div className="flex flex-col items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--surface)] py-20">
          <p className="font-mono text-sm text-[var(--text-tertiary)]">
            No matching build logs found.
          </p>
        </div>
      )}

      {results.length > 0 && (
        <div className="space-y-3">
          {results.map((result) => (
            <div key={result.id} className="relative">
              <BuildLogCard log={result} />
              <span className="absolute right-3 top-3 rounded bg-[var(--surface-raised)] px-2 py-0.5 font-mono text-[11px] text-[var(--accent)] border border-[var(--border)]">
                {Math.round((result.similarity ?? 0) * 100)}% match
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
