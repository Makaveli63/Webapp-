"use client";

import { useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { CONSOLE_CHOICES, onMyConsoles, useMyConsoles, writeConsoles } from "@/lib/consoles";
import { isMuted, useMuted } from "@/lib/muted";
import { CATEGORIES, PLATFORMS, type Article, type Category, type Platform } from "@/types";
import { NewsCard } from "./NewsCard";

// Pages de 4 articles (grille 2 × 2 sur grand écran) plutôt qu'une liste sans fin.
const PAGE_SIZE = 4;
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
  // Plateforme venue d'un lien (?plateforme=PS5) : filtre ponctuel, en plus de « Mes consoles ».
  const [platform, setPlatform] = useState<Platform | "Toutes">(initialPlatform ?? "Toutes");
  const mine = useMyConsoles();
  const muted = useMuted();
  const [tag, setTag] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const top = useRef<HTMLDivElement>(null);

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
      onMyConsoles(a, mine) &&
      !isMuted(a.title, muted) &&
      (!tag || a.tags.includes(tag)),
  );

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const current = Math.min(page, pages);
  // Nouvelle page : retour en haut de la liste (sans animation si l'utilisateur la réduit).
  const go = (n: number) => {
    setPage(n);
    const smooth = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    requestAnimationFrame(() => top.current?.scrollIntoView({ behavior: smooth ? "smooth" : "auto", block: "start" }));
  };

  const chip = (active: boolean) =>
    `shrink-0 whitespace-nowrap rounded-full px-3.5 py-1.5 text-sm ring-1 ring-inset transition-colors ${
      active ? "bg-accent text-white ring-accent" : "glass-pill text-muted ring-border hover:text-fg"
    }`;

  return (
    <div>
      {showCategories && (
        <div className="mb-2 scroll-row -mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0" role="group" aria-label="Filtrer par rubrique">
          {(["Toutes", ...(Object.keys(CATEGORIES) as Category[]).filter((c) => c !== "Anime")] as const).map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => {
                setCategory(c);
                setPage(1);
              }}
              className={chip(category === c)}
              aria-pressed={category === c}
            >
              {c === "Toutes" ? "Toutes les rubriques" : CATEGORIES[c].label}
            </button>
          ))}
        </div>
      )}
      <div className="scroll-row -mx-4 flex items-center gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0" role="group" aria-label="Mes consoles">
        <span className="shrink-0 text-xs font-semibold uppercase tracking-wide text-muted">Mes consoles</span>
        <button type="button" onClick={() => { writeConsoles([]); setPage(1); }} className={chip(!mine.length)} aria-pressed={!mine.length}>
          Toutes
        </button>
        {CONSOLE_CHOICES.map((c) => {
          const on = mine.includes(c);
          return (
            <button
              key={c}
              type="button"
              onClick={() => {
                writeConsoles(on ? mine.filter((x) => x !== c) : [...mine, c]);
                setPage(1);
              }}
              className={chip(on)}
              aria-pressed={on}
            >
              {c}
            </button>
          );
        })}
        {platform !== "Toutes" && (
          <button type="button" onClick={() => { setPlatform("Toutes"); setPage(1); }} className="inline-flex shrink-0 items-center gap-1 rounded-full bg-accent-2/15 px-3 py-1.5 text-sm font-semibold text-accent-2 ring-1 ring-inset ring-accent-2/40">
            Seulement {platform} <X className="size-3.5" aria-label="Retirer ce filtre" />
          </button>
        )}
      </div>
      {mine.length > 0 && <p className="mt-1.5 text-xs text-muted">Gardé sur cet appareil, aussi pour l&apos;accueil. Les actus multiplateformes restent affichées.</p>}
      {tags.length > 0 && (
        <div className="mt-2 scroll-row -mx-4 flex gap-1.5 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0" role="group" aria-label="Filtrer par tag">
          {tags.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => {
                setTag(tag === t ? null : t);
                setPage(1);
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
          <div ref={top} className="mt-5 grid scroll-mt-24 gap-3 sm:grid-cols-2 sm:gap-4">
            {filtered.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE).map((a) => (
              <NewsCard key={a.slug} article={a} />
            ))}
          </div>
          {pages > 1 && <Pagination page={current} pages={pages} onChange={go} />}
        </>
      ) : (
        <p className="mt-10 text-center text-muted">Aucun article ne correspond à ces filtres.</p>
      )}
    </div>
  );
}

/** Numéros de page affichés : 1 … 4 5 6 … 20 (la page courante et ses voisines, plus les extrémités). */
function pageItems(page: number, pages: number): (number | "…")[] {
  const keep = new Set([1, pages, page - 1, page, page + 1].filter((n) => n >= 1 && n <= pages));
  const sorted = [...keep].sort((a, b) => a - b);
  return sorted.flatMap((n, i) => (i && n - sorted[i - 1] > 1 ? (["…", n] as const) : [n]));
}

function Pagination({ page, pages, onChange }: { page: number; pages: number; onChange: (n: number) => void }) {
  const arrow = "inline-flex size-11 items-center justify-center rounded-full glass-pill ring-1 ring-inset ring-border text-heading disabled:opacity-35 hover:ring-accent";
  return (
    <nav aria-label="Pages d'articles" className="mt-8 flex flex-col items-center gap-2">
      <div className="flex items-center gap-1.5">
        <button type="button" onClick={() => onChange(page - 1)} disabled={page <= 1} aria-label="Page précédente" className={arrow}>
          <ChevronLeft className="size-5" aria-hidden />
        </button>
        <ol className="flex items-center gap-1">
          {pageItems(page, pages).map((n, i) =>
            n === "…" ? (
              <li key={`gap-${i}`} aria-hidden className="w-6 text-center text-sm text-muted">
                …
              </li>
            ) : (
              <li key={n}>
                <button
                  type="button"
                  onClick={() => onChange(n)}
                  aria-current={n === page ? "page" : undefined}
                  aria-label={`Page ${n}`}
                  className={`min-w-10 rounded-full px-2 py-2 text-sm font-semibold tabular-nums transition-colors ${
                    n === page ? "bg-accent text-white" : "text-muted hover:bg-surface-2 hover:text-fg"
                  }`}
                >
                  {n}
                </button>
              </li>
            ),
          )}
        </ol>
        <button type="button" onClick={() => onChange(page + 1)} disabled={page >= pages} aria-label="Page suivante" className={arrow}>
          <ChevronRight className="size-5" aria-hidden />
        </button>
      </div>
      <p className="text-xs text-muted tabular-nums">
        Page {page} sur {pages}
      </p>
    </nav>
  );
}
