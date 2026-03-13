"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Search as SearchIcon, SearchX, ChevronDown } from "lucide-react";
import { BuildLogCard, type BuildLogData } from "@/components/build-log-card";
import { CATEGORY_DISPLAY, findByName } from "@/lib/stack-taxonomy";

interface SearchResult extends BuildLogData {
  similarity: number;
  composite_score: number;
  citation_count: number;
}

interface TagCount {
  tag: string;
  count: number;
}

interface GroupedTag {
  tag: string;
  count: number;
  category: string;
}

const MAX_PER_CATEGORY = 5;

function groupTagsByCategory(tags: TagCount[]): Record<string, GroupedTag[]> {
  const groups: Record<string, GroupedTag[]> = {};

  for (const t of tags) {
    const entry = findByName(t.tag);
    let catLabel = "Other";
    if (entry) {
      for (const [label, config] of Object.entries(CATEGORY_DISPLAY)) {
        if (config.categories.includes(entry.category)) {
          catLabel = label;
          break;
        }
      }
    }
    if (!groups[catLabel]) groups[catLabel] = [];
    groups[catLabel].push({ tag: t.tag, count: t.count, category: catLabel });
  }

  for (const cat of Object.keys(groups)) {
    groups[cat].sort((a, b) => b.count - a.count);
  }

  return groups;
}

function ResultsSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <div
          key={i}
          className="rounded-xl bg-[#111111] ring-1 ring-white/10 shadow-lg shadow-black/50 p-4"
          style={{ animationDelay: `${i * 80}ms` }}
        >
          <div className="flex items-start gap-3">
            <div className="flex-1">
              <div className="h-5 w-48 max-w-full animate-pulse rounded bg-white/[0.06] mb-3" />
              <div className="h-3.5 w-full max-w-lg animate-pulse rounded bg-white/[0.04] mb-2" />
              <div className="h-3.5 w-3/4 max-w-sm animate-pulse rounded bg-white/[0.04]" />
            </div>
            <div className="h-5 w-12 animate-pulse rounded-full bg-white/[0.04]" />
          </div>
          <div className="flex items-center gap-2 mt-4">
            <div className="h-5 w-16 animate-pulse rounded-full bg-white/[0.04]" />
            <div className="h-5 w-20 animate-pulse rounded-full bg-white/[0.04]" />
            <div className="h-5 w-14 animate-pulse rounded-full bg-white/[0.04]" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [stackFilter, setStackFilter] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [allTags, setAllTags] = useState<TagCount[]>([]);
  const [groupedTags, setGroupedTags] = useState<Record<string, GroupedTag[]>>({});
  const [dropdownSearch, setDropdownSearch] = useState("");

  useEffect(() => {
    inputRef.current?.focus();
    fetch("/api/internal/tag-counts")
      .then((res) => res.json())
      .then((json) => {
        const tags: TagCount[] = json.data || [];
        setAllTags(tags);
        setGroupedTags(groupTagsByCategory(tags));
      })
      .catch(() => {});
  }, []);

  const doSearch = useCallback(async (q: string, stack: string) => {
    if (!q.trim()) {
      setResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    setHasSearched(true);
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
  const dropdownSearchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
        setDropdownSearch("");
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (isDropdownOpen) {
      setTimeout(() => dropdownSearchRef.current?.focus(), 0);
    }
  }, [isDropdownOpen]);

  function selectTag(tag: string) {
    setStackFilter(tag);
    triggerSearch(query, tag);
    setIsDropdownOpen(false);
    setDropdownSearch("");
  }

  const categoryOrder = Object.keys(groupedTags)
    .sort((a, b) => {
      if (a === "Other") return 1;
      if (b === "Other") return -1;
      const sumA = groupedTags[a].reduce((s, t) => s + t.count, 0);
      const sumB = groupedTags[b].reduce((s, t) => s + t.count, 0);
      return sumB - sumA;
    });

  const searchLower = dropdownSearch.toLowerCase().trim();
  const filteredTags = searchLower
    ? allTags
        .filter((t) => t.tag.toLowerCase().includes(searchLower))
        .sort((a, b) => b.count - a.count)
        .slice(0, 20)
    : [];

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <section className="mb-12 mt-20">
        <h1 className="hero-reveal text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent leading-[1.1] pb-2 mb-3">
          Search
        </h1>
        <p className="hero-reveal-delay text-lg sm:text-xl text-zinc-400 max-w-2xl">
          Search the network for solutions, techniques, and patterns.
        </p>
      </section>

      <div className="mb-12">
        <div className="relative group rounded-xl p-[1px] bg-gradient-to-b from-white/10 to-white/5 shadow-[0_8px_32px_rgba(0,0,0,0.5)] transition-all focus-within:shadow-[0_8px_40px_rgba(34,211,238,0.15)]">
          <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 to-transparent opacity-0 group-focus-within:opacity-100 transition-opacity blur-xl rounded-xl"></div>
          <div className="relative flex flex-col md:flex-row items-center gap-2 bg-[var(--surface)]/90 backdrop-blur-xl rounded-xl p-2 z-10">
            <div className="flex-1 flex items-center relative w-full">
              <SearchIcon className="absolute left-4 text-[var(--accent)] drop-shadow-[0_0_8px_rgba(34,211,238,0.5)]" size={20} />
              <input
                ref={inputRef}
                type="text"
                placeholder="Describe a problem, solution, or technique..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && triggerSearch(query, stackFilter)}
                className="w-full bg-transparent border-none py-4 pl-12 pr-4 font-mono text-[15px] text-[var(--text-primary)] placeholder:text-transparent sm:placeholder:text-zinc-600 focus:outline-none"
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
                  <ChevronDown size={14} strokeWidth={2} className={`text-zinc-600 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {isDropdownOpen && (
                  <div className="absolute top-full mt-2 w-[280px] left-0 md:left-auto md:right-0 bg-[#111111] border border-[var(--border)] rounded-lg shadow-xl shadow-black/50 z-50 overflow-hidden">
                    <div className="p-2 border-b border-[var(--border)]">
                      <input
                        ref={dropdownSearchRef}
                        type="text"
                        placeholder="Search technologies..."
                        value={dropdownSearch}
                        onChange={(e) => setDropdownSearch(e.target.value)}
                        className="w-full bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg py-2 px-3 font-mono text-xs text-zinc-300 placeholder:text-zinc-600 focus:outline-none focus:border-[var(--accent)]/30"
                      />
                    </div>

                    <div className="max-h-[380px] overflow-y-auto overscroll-contain py-1">
                      {!searchLower && (
                        <button
                          className={`w-full text-left px-4 py-2.5 font-mono text-xs hover:bg-white/5 transition-colors ${!stackFilter ? 'text-cyan-400 bg-cyan-500/10' : 'text-zinc-300'}`}
                          onClick={() => selectTag("")}
                        >
                          All Technologies
                        </button>
                      )}

                      {searchLower ? (
                        filteredTags.length > 0 ? (
                          filteredTags.map((t) => (
                            <button
                              key={t.tag}
                              className={`w-full text-left px-4 py-2.5 font-mono text-xs hover:bg-white/5 transition-colors flex items-center justify-between ${stackFilter === t.tag ? 'text-cyan-400 bg-cyan-500/10' : 'text-zinc-300'}`}
                              onClick={() => selectTag(t.tag)}
                            >
                              <span>{t.tag}</span>
                              <span className="text-zinc-600 tabular-nums">{t.count}</span>
                            </button>
                          ))
                        ) : (
                          <div className="px-4 py-3 font-mono text-xs text-zinc-600">
                            No technologies match &ldquo;{dropdownSearch}&rdquo;
                          </div>
                        )
                      ) : (
                        categoryOrder.map((catName) => {
                          const config = CATEGORY_DISPLAY[catName] || { color: 'text-zinc-500' };
                          const tags = groupedTags[catName].slice(0, MAX_PER_CATEGORY);

                          return (
                            <div key={catName} className="px-3 py-1 mt-1">
                              <div className={`text-[10px] font-mono font-bold uppercase tracking-widest ${config.color} mb-1 mt-1`}>
                                {catName}
                              </div>
                              {tags.map((t) => (
                                <button
                                  key={t.tag}
                                  className={`w-full text-left px-2 py-2 font-mono text-xs hover:text-white hover:bg-white/5 rounded-lg transition-colors flex items-center justify-between ${stackFilter === t.tag ? 'text-cyan-400 bg-cyan-500/10' : 'text-zinc-300'}`}
                                  onClick={() => selectTag(t.tag)}
                                >
                                  <span>{t.tag}</span>
                                  <span className="text-zinc-600 tabular-nums text-[10px]">{t.count}</span>
                                </button>
                              ))}
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}
              </div>
              <button
                onClick={() => triggerSearch(query, stackFilter)}
                disabled={isSearching}
                className="shrink-0 bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 hover:bg-cyan-500/20 hover:shadow-[0_0_15px_rgba(34,211,238,0.3)] font-bold font-mono text-xs px-6 py-3 rounded-lg transition-all h-11"
              >
                {isSearching ? "..." : "SEARCH"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {isSearching && <ResultsSkeleton />}

      {!isSearching && results.length === 0 && hasSearched && (
        <div className="flex flex-col items-center justify-center py-20">
          <SearchX size={32} strokeWidth={1.5} className="text-zinc-600 mb-4" />
          <p className="font-mono text-sm text-zinc-500 mb-1">No build logs found.</p>
          <p className="font-sans text-sm text-zinc-600">Try broadening your query or removing the technology filter.</p>
        </div>
      )}

      {!isSearching && results.length > 0 && (
        <div className="space-y-3">
          {results.map((result, i) => (
            <div key={result.id} className="feed-item" style={{ animationDelay: `${i * 60}ms` }}>
              <BuildLogCard log={result} citationCount={result.citation_count} compact />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
