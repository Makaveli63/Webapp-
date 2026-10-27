"use client";

import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { CATEGORIES, PLATFORMS, type Article, type Category, type Platform } from "@/types";
import { NewsCard } from "./NewsCard";

const PAGE_SIZE = 24;
const MAX_TAGS = 16;

interface Props {
  articles: Article[];
  /** Affiche le filtre par rubrique (page Actualités uniquement). */
  showCategories?: boolean;
}

/** Lit le filtre de plateforme dans l'URL (?plateforme=PS5) et réinitialise la liste quand il change. */
export function NewsList({ articles, showCategories = false }: Props) {
  const param = useSearchParams().get("plateforme");
  const initial = PLATFORMS.includes(param as Platform) ? (param as Platform) : undefined;
  return (
    <FilterableNewsList
      key={initial ?? "all"}
      articles={articles}
      showCategories={showCategories}
      initialPlatform={initial}
    />
  );
}

function FilterableNewsList({ articles, showCategories, initialPlatform }: Props & { initialPlatform?: Platform }) {
  const [category, setCategory] = useState<Category | "Toutes">("Toutes");
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
    (a) =>
      (category === "Toutes" || a.category === category) &&
      (platform === "Toutes" || a.platforms.includes(platform)) &&
      (!tag || a.tags.includes(tag)),
  );

  const chip = (active: boolean) =>
    `shrink-0 whitespace-nowrap rounded-full px-3.5 py-1.5 text-sm ring-1 ring-inset transition-colors ${
      active ? "bg-accent text-white ring-accent" : "bg-surface text-muted ring-border hover:text-fg"
    }`;

  return (
    <div>
      {showCategories && (
        <div className="mb-2 scroll-row -mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0" role="group" aria-label="Filtrer par rubrique">
          {(["Toutes", ...(Object.keys(CATEGORIES) as Category[])] as const).map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => {
                setCategory(c);
                setShown(PAGE_SIZE);
              }}
              className={chip(category === c)}
              aria-pressed={category === c}
            >
              {c === "Toutes" ? "Toutes les rubriques" : CATEGORIES[c].label}
            </button>
          ))}
        </div>
      )}
      <div className="scroll-row -mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0" role="group" aria-label="Filtrer par plateforme">
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
            {p === "Toutes" ? "Toutes les plateformes" : p}
          </button>
        ))}
      </div>
      {tags.length > 0 && (
        <div className="mt-2 scroll-row -mx-4 flex gap-1.5 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0" role="group" aria-label="Filtrer par tag">
          {tags.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => {
                setTag(tag === t ? null : t);
                setShown(PAGE_SIZE);
              }}
              aria-pressed={tag === t}
              className={`shrink-0 whitespace-nowrap rounded-md px-2.5 py-1 text-xs ring-1 ring-inset ${
                tag === t ? "bg-accent-2/15 text-accent-2 ring-accent-2/50" : "text-muted ring-border hover:text-fg"
              }`}
            >
              #{t}
            </button>
          ))}
        </div>
      )}

      {filtered.length ? (
        <>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
            {filtered.slice(0, shown).map((a) => (
              <NewsCard key={a.slug} article={a} />
            ))}
          </div>
          {shown < filtered.length && (
            <div className="mt-8 text-center">
              <button
                type="button"
                onClick={() => setShown((n) => n + PAGE_SIZE)}
                className="w-full rounded-lg border border-border bg-surface px-4 py-3 text-sm font-medium hover:border-accent/60 sm:w-auto sm:py-2"
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
