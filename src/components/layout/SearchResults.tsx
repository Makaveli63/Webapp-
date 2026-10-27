"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { NewsCard } from "@/components/news/NewsCard";
import { GameCard } from "@/components/search/GameCard";
import { AniListResults } from "@/components/search/AniListResults";
import { WikipediaResults } from "@/components/search/WikipediaResults";
import { correctQuery, normalize } from "@/lib/fuzzy";
import { loadSearchIndex } from "@/lib/search-index";
import type { SearchIndex } from "@/types";

/** Tous les mots de la recherche doivent apparaître (dans n'importe quel ordre). */
const matches = (words: string[], ...fields: (string | undefined)[]) => {
  const hay = ` ${normalize(fields.filter(Boolean).join(" "))} `;
  return words.every((w) => hay.includes(w));
};

function runSearch(index: SearchIndex | null, query: string) {
  const words = normalize(query).split(" ").filter(Boolean);
  if (!index || !words.length) return { articles: [], games: [] };
  return {
    articles: index.articles.filter((a) => matches(words, a.title, a.excerpt, a.source.name, ...a.tags, ...a.platforms)),
    games: index.games.filter((g) => matches(words, g.title, g.aka)),
  };
}

export function SearchResults() {
  const q = (useSearchParams().get("q") ?? "").trim();
  const [index, setIndex] = useState<SearchIndex | null>(null);
  const [error, setError] = useState(false);

  // L'index (actus + jeux) n'est téléchargé que pour la recherche.
  useEffect(() => {
    loadSearchIndex()
      .then(setIndex)
      .catch(() => setError(true));
  }, []);

  const exact = runSearch(index, q);
  // Aucun résultat : on corrige les fautes de frappe (« cal of dutty » → « call of duty »).
  const corrected = index && q && exact.articles.length + exact.games.length === 0 ? correctQuery(q, index.vocab) : null;
  const fixed = runSearch(index, corrected ?? "");
  const { articles, games } = corrected ? fixed : exact;
  const shownQuery = corrected ?? q;

  if (!q) return <p className="mt-4 text-muted">Recherchez un jeu, une console, un éditeur…</p>;

  return (
    <>
      <p className="mt-4 text-muted">
        {error
          ? "Index de recherche indisponible."
          : !index
            ? "Chargement…"
            : `${articles.length + games.length} résultat${articles.length + games.length > 1 ? "s" : ""} pour « ${shownQuery} »`}
      </p>
      {corrected && (
        <p className="mt-1 text-sm text-muted">
          Corrigé depuis « {q} ».{" "}
          <Link href={`/recherche?q=${encodeURIComponent(corrected)}`} className="font-semibold text-accent underline underline-offset-2">
            Chercher « {corrected} »
          </Link>
        </p>
      )}

      {games.length > 0 && (
        <section className="mt-8">
          <h2 className="text-lg font-bold text-heading">{games.some((g) => g.id.startsWith("anilist-")) ? "Jeux et animes" : "Jeux"}</h2>
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

      <AniListResults query={shownQuery} />
      <WikipediaResults query={shownQuery} />
    </>
  );
}
