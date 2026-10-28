"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { NewsCard } from "@/components/news/NewsCard";
import { GameCard } from "@/components/search/GameCard";
import { AniListResults } from "@/components/search/AniListResults";
import { WikipediaResults } from "@/components/search/WikipediaResults";
import { aliasesOf } from "@/lib/aliases";
import { canon, correctQuery, normalize } from "@/lib/fuzzy";
import { loadSearchIndex } from "@/lib/search-index";
import type { SearchIndex } from "@/types";

/**
 * Tous les mots de la recherche doivent apparaître (dans n'importe quel ordre). Les nombres doivent commencer
 * un mot (« gta 6 » ne trouve pas « 2026 »).
 */
const has = (hay: string, words: string[]) => words.every((w) => (/^\d/.test(w) ? hay.includes(` ${w}`) : hay.includes(w)));
const matches = (words: string[], ...fields: (string | undefined)[]) => has(` ${canon(fields.filter(Boolean).join(" "))} `, words);

// Texte cherché d'un jeu : titre, autre titre et autres écritures (« GTA 6 », « GTA VI » pour Grand Theft Auto VI).
const gameHay = new WeakMap<object, string>();
const matchesGame = (words: string[], g: SearchIndex["games"][number]) => {
  let hay = gameHay.get(g);
  if (hay === undefined) {
    hay = ` ${canon([g.title, g.aka, ...aliasesOf(g.title)].filter(Boolean).join(" | "))} `;
    gameHay.set(g, hay);
  }
  return has(hay, words);
};

// Petits mots ignorés (« 007 first light sur ps5 ») et noms de plateformes traités comme un filtre.
const STOP_WORDS = new Set(["sur", "le", "la", "les", "de", "des", "du", "un", "une", "jeu", "jeux", "pour", "en", "et", "l", "d", "video"]);
const PLATFORM_WORDS: Record<string, RegExp> = {
  ps5: /^PS5$/, ps4: /^PS4$/, playstation: /^PS/, xbox: /^Xbox/, switch: /^Switch/, nintendo: /^Switch/,
  pc: /^PC$/, steam: /^PC$/, mobile: /^(Mobile|iOS|Android)$/, ios: /^(Mobile|iOS)$/, android: /^(Mobile|Android)$/,
};

function parseQuery(query: string) {
  const all = normalize(query).split(" ").filter(Boolean);
  const platforms: RegExp[] = [];
  const words: string[] = [];
  all.forEach((w, i) => {
    if (PLATFORM_WORDS[w]) platforms.push(w === "switch" && all[i + 1] === "2" ? /^Switch 2$/ : PLATFORM_WORDS[w]);
    else if (w === "2" && all[i - 1] === "switch") return;
    else if (!STOP_WORDS.has(w) || all.length === 1) words.push(w);
  });
  // Recherche d'une plateforme seule (« ps5 ») : on cherche le mot, pas un filtre vide.
  const split = (list: string[]) => canon(list.join(" ")).split(" ").filter(Boolean);
  return words.length ? { words: split(words), platforms } : { words: split(all), platforms: [] };
}

const onPlatforms = (list: string[], platforms: RegExp[]) =>
  !platforms.length || list.includes("Multi") || platforms.every((re) => list.some((p) => re.test(p)));

function runSearch(index: SearchIndex | null, query: string) {
  const { words, platforms } = parseQuery(query);
  if (!index || !words.length) return { articles: [], games: [] };
  const games = index.games.filter((g) => matchesGame(words, g));
  const onPlatform = games.filter((g) => onPlatforms(g.platforms, platforms));
  return {
    articles: index.articles.filter((a) => matches(words, a.title, a.excerpt, a.source.name, ...a.tags) && onPlatforms(a.platforms, platforms)),
    // Plateformes parfois incomplètes dans les bases de jeux : sans résultat sur la plateforme, on montre quand même le jeu.
    games: onPlatform.length ? onPlatform : games,
  };
}

export function SearchResults() {
  const q = (useSearchParams().get("q") ?? "").trim();
  const [index, setIndex] = useState<SearchIndex | null>(null);
  const [error, setError] = useState(false);
  const [animeCount, setAnimeCount] = useState(0);

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
  const total = articles.length + games.length + animeCount;

  if (!q) return <p className="mt-4 text-muted">Recherchez un jeu, une console, un éditeur…</p>;

  return (
    <>
      <p className="mt-4 text-muted">
        {error
          ? "Index de recherche indisponible."
          : !index
            ? "Chargement…"
            : `${total} résultat${total > 1 ? "s" : ""} pour « ${shownQuery} »`}
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

      <AniListResults query={parseQuery(shownQuery).words.join(" ")} onCount={setAnimeCount} />
      <WikipediaResults query={parseQuery(shownQuery).words.join(" ")} />
    </>
  );
}
