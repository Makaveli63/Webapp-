"use client";

import { useMemo, useState } from "react";
import { PLATFORMS, type Article, type Platform } from "@/types";
import { NewsCard } from "./NewsCard";

interface Props {
  articles: Article[];
  initialPlatform?: Platform;
}

export function NewsList({ articles, initialPlatform }: Props) {
  const [platform, setPlatform] = useState<Platform | "Toutes">(initialPlatform ?? "Toutes");
  const [tag, setTag] = useState<string | null>(null);

  const tags = useMemo(
    () => Array.from(new Set(articles.flatMap((a) => a.tags))).sort((a, b) => a.localeCompare(b, "fr")),
    [articles],
  );

  const filtered = articles.filter(
    (a) => (platform === "Toutes" || a.platforms.includes(platform)) && (!tag || a.tags.includes(tag)),
  );

  const chip = (active: boolean) =>
    `rounded-full px-3 py-1 text-sm ring-1 ring-inset transition-colors ${
      active ? "bg-accent text-white ring-accent" : "bg-surface text-muted ring-border hover:text-fg"
    }`;

  return (
    <div>
      <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrer par plateforme">
        {(["Toutes", ...PLATFORMS] as const).map((p) => (
          <button key={p} type="button" onClick={() => setPlatform(p)} className={chip(platform === p)} aria-pressed={platform === p}>
            {p}
          </button>
        ))}
      </div>
      {tags.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5" role="group" aria-label="Filtrer par tag">
          {tags.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTag(tag === t ? null : t)}
              aria-pressed={tag === t}
              className={`rounded-md px-2 py-0.5 text-xs ring-1 ring-inset ${
                tag === t ? "bg-accent-2/20 text-accent-2 ring-accent-2/50" : "text-muted ring-border hover:text-fg"
              }`}
            >
              #{t}
            </button>
          ))}
        </div>
      )}

      {filtered.length ? (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((a) => (
            <NewsCard key={a.slug} article={a} />
          ))}
        </div>
      ) : (
        <p className="mt-10 text-center text-muted">Aucun article ne correspond à ces filtres.</p>
      )}
    </div>
  );
}
