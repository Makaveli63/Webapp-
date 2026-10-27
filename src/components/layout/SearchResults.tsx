"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { NewsCard } from "@/components/news/NewsCard";
import { GameCard } from "@/components/search/GameCard";
import { WikipediaResults } from "@/components/search/WikipediaResults";
import type { SearchIndex } from "@/types";

const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

/** Minuscules, sans accents ni ponctuation : « Call-of-Duty: BO7 » → « call of duty bo7 ». */
const normalize = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

/** Tous les mots de la recherche doivent apparaître (dans n'importe quel ordre). */
const matches = (words: string[], ...fields: (string | undefined)[]) => {
  const hay = ` ${normalize(fields.filter(Boolean).join(" "))} `;
  return words.every((w) => hay.includes(w));
};

export function SearchResults() {
  const q = (useSearchParams().get("q") ?? "").trim();
  const [index, setIndex] = useState<SearchIndex | null>(null);
  const [error, setError] = useState(false);

  // L'index (actus + jeux) n'est téléchargé que sur cette page.
  useEffect(() => {
    fetch(`${BASE_PATH}/recherche-index.json`)
      .then((r) => r.json())
      .then(setIndex)
      .catch(() => setError(true));
  }, []);

  const words = normalize(q).split(" ").filter(Boolean);
  const articles = index && words.length ? index.articles.filter((a) => matches(words, a.title, a.excerpt, a.source.name, ...a.tags, ...a.platforms)) : [];
  const games = index && words.length ? index.games.filter((g) => matches(words, g.title)) : [];

  if (!q) return <p className="mt-4 text-muted">Recherchez un jeu, une console, un éditeur…</p>;

  return (
    <>
      <p className="mt-4 text-muted">
        {error
          ? "Index de recherche indisponible."
          : !index
            ? "Chargement…"
            : `${articles.length + games.length} résultat${articles.length + games.length > 1 ? "s" : ""} pour « ${q} »`}
      </p>

      {games.length > 0 && (
        <section className="mt-8">
          <h2 className="text-lg font-bold text-heading">Jeux</h2>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
            {games.slice(0, 12).map((g) => (
              <GameCard key={g.id} game={g} />
            ))}
          </div>
        </section>
      )}

      {articles.length > 0 && (
        <section className="mt-8">
          <h2 className="text-lg font-bold text-heading">Actualités</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
            {articles.slice(0, 60).map((a) => (
              <NewsCard key={a.slug} article={a} />
            ))}
          </div>
        </section>
      )}

      <WikipediaResults query={q} />
    </>
  );
}
