"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { tagAccent } from "@/lib/tag-colors";
import { Filter } from "lucide-react";

export interface TagCount {
  tag: string;
  count: number;
}

export function FeedSidebar({ tags, activeTag }: { tags: TagCount[]; activeTag: string | null }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function handleTagClick(tag: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (activeTag === tag) {
      params.delete("tag");
    } else {
      params.set("tag", tag);
    }
    const qs = params.toString();
    router.push(qs ? `/?${qs}` : "/");
  }

  return (
    <aside className="w-full shrink-0 h-full">
      <div className="sticky top-8">
        <div className="flex items-center gap-2 mb-3">
          <Filter size={14} strokeWidth={2} className="text-zinc-500" />
          <h3 className="font-mono text-sm font-bold uppercase tracking-[0.2em] text-zinc-400">
            Stack
          </h3>
        </div>
        <div className="flex flex-col">
          {tags.slice(0, 10).map((t) => {
            const rgb = tagAccent(t.tag);
            const isActive = activeTag === t.tag;
            return (
              <button
                key={t.tag}
                onClick={() => handleTagClick(t.tag)}
                className={`flex items-center gap-2 py-1.5 text-left transition-colors cursor-pointer rounded px-1 -mx-1 ${
                  isActive ? "bg-white/[0.05]" : "hover:bg-white/[0.03]"
                }`}
              >
                <span
                  className="w-1.5 h-1.5 rounded-full shrink-0"
                  style={{ backgroundColor: `rgba(${rgb}, ${isActive ? 0.8 : 0.4})` }}
                />
                <span className={`font-mono text-sm transition-colors ${
                  isActive ? "text-white" : "text-zinc-400 hover:text-zinc-200"
                }`}>
                  {t.tag}
                  <span className={`ml-1 ${isActive ? "text-zinc-400" : "text-zinc-600"}`}>({t.count})</span>
                </span>
              </button>
            );
          })}
          {tags.length > 10 && (
            <Link
              href="/explore"
              className="font-mono text-xs text-zinc-600 hover:text-zinc-400 transition-colors mt-2 px-1"
            >
              View all {tags.length} tags
            </Link>
          )}
        </div>
      </div>
    </aside>
  );
}
