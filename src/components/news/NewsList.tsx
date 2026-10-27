"use client";

import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { PLATFORMS, type Article, type Platform } from "@/types";
import { NewsCard } from "./NewsCard";

const PAGE_SIZE = 24;
const MAX_TAGS = 16;

/** Lit le filtre de plateforme dans l'URL (?plateforme=PS5) et réinitialise la liste quand il change. */
export function NewsList({ articles }: { articles: Article[] }) {
  const param = useSearchParams().get("plateforme");
  const initial = PLATFORMS.includes(param as Platform) ? (param as Platform) : undefined;
  return <FilterableNewsList key={initial ?? "all"} articles={articles} initialPlatform={initial} />;
}

function FilterableNewsList({ articles, initialPlatform }: { articles: Article[]; initialPlatform?: Platform }) {
  const [platform, setPlatform] = useState<Platform | "Toutes">(initialPlatform ?? "Toutes");
  const [tag, setTag] = useState<string | null>(null);
  const [shown, setShown] = useState(PAGE_SIZE);

  // Les tags les plus fréquents uniquement : les flux RSS en produisent beaucoup.
  const tags = useMemo(() => {
    const counts = new Map<string, number>();
    articles.flatMap((a) => a.tags).forEach((t) => counts.set(t, (counts.get(t) ?? 0) + 1));
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, MAX_TAGS)
      .map(([t]) => t)
      .sort((a, b) => a.localeCompare(b, "fr"));
  }, [articles]);

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
          <button
            key={p}
            type="button"
            onClick={() => {
              setPlatform(p);
              setShown(PAGE_SIZE);
            }}
            className={chip(platform === p)}
            aria-pressed={platform === p}
          >
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
              onClick={() => {
                setTag(tag === t ? null : t);
                setShown(PAGE_SIZE);
              }}
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
        <>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.slice(0, shown).map((a) => (
              <NewsCard key={a.slug} article={a} />
            ))}
          </div>
          {shown < filtered.length && (
            <div className="mt-8 text-center">
              <button
                type="button"
                onClick={() => setShown((n) => n + PAGE_SIZE)}
                className="rounded-lg border border-border bg-surface px-4 py-2 text-sm hover:border-accent/60"
              >
                Afficher plus ({filtered.length - shown} restants)
              </button>
            </div>
          )}
        </>
      ) : (
        <p className="mt-10 text-center text-muted">Aucun article ne correspond à ces filtres.</p>
      )}
    </div>
  );
}
