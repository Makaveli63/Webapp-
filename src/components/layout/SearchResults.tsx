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
// Mots de contexte (streaming, type de contenu) ignorés pour trouver un titre.
const NOISE = new Set(["anime", "animes", "manga", "serie", "series", "netflix", "crunchyroll", "adn", "prime", "disney", "amazon", "film", "vf", "vostfr", "streaming"]);
const PLATFORM_WORDS: Record<string, RegExp> = {
  ps5: /^PS5$/, ps4: /^PS4$/, playstation: /^PS/, xbox: /^Xbox/, switch: /^Switch/, nintendo: /^Switch/,
  pc: /^PC$/, steam: /^PC$/, mobile: /^(Mobile|iOS|Android)$/, ios: /^(Mobile|iOS)$/, android: /^(Mobile|Android)$/,
};

function parseQuery(query: string) {
  const all = normalize(query).split(" ").filter(Boolean);
  const platforms: RegExp[] = [];
  const words: string[] = [];
  all.forEach((w, i) => {
    if (Object.hasOwn(PLATFORM_WORDS, w)) platforms.push(w === "switch" && all[i + 1] === "2" ? /^Switch 2$/ : PLATFORM_WORDS[w]);
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
  // « cyberpunk netflix » : la plateforme de streaming n'est pas dans le titre du jeu.
  const core = words.filter((w) => !NOISE.has(w));
  const titleWords = core.length ? core : words;
  const games = index.games.filter((g) => matchesGame(titleWords, g));
  const onPlatform = games.filter((g) => onPlatforms(g.platforms, platforms));
  const articlesFor = (w: string[]) => index.articles.filter((a) => matches(w, a.title, a.excerpt, a.source.name, ...a.tags) && onPlatforms(a.platforms, platforms));
  const articles = articlesFor(words);
  return {
    articles: articles.length || titleWords === words ? articles : articlesFor(titleWords),
    // Plateformes parfois incomplètes dans les bases de jeux : sans résultat sur la plateforme, on montre quand même le jeu.
    games: onPlatform.length ? onPlatform : games,
  };
}

export function SearchResults() {
  const q = (useSearchParams().get("q") ?? "").trim();
  const [index, setIndex] = useState<SearchIndex | null>(null);
  const [error, setError] = useState(false);
  const [animeCount, setAnimeCount] = useState(0);
  const [tab, setTab] = useState<"all" | "games" | "anime" | "news">("all");
  const [moreGames, setMoreGames] = useState(false);

  // L'index (actus + jeux) n'est téléchargé que pour la recherche.
  useEffect(() => {
    loadSearchIndex()
      .then(setIndex)
      .catch(() => setError(true));
  }, []);

  const exact = runSearch(index, q);
  // Aucun résultat : on corrige les fautes de frappe (« cal of dutty » → « call of duty »).
  // La correction n'est retenue que si elle trouve quelque chose (« solo leveling » ne devient pas « sols leveling »).
  const guess = index && q && exact.articles.length + exact.games.length === 0 ? correctQuery(q, index.vocab) : null;
  const fixed = runSearch(index, guess ?? "");
  const corrected = guess && guess !== q && fixed.articles.length + fixed.games.length > 0 ? guess : null;
  const found = corrected ? fixed : exact;
  // Les animes ont leur propre section (base AniList complète) : les jeux et les animes ne se mélangent pas.
  const games = found.games.filter((g) => !g.id.startsWith("anilist-"));
  const articles = found.articles;
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

      {index && (
        <div role="tablist" aria-label="Type de résultats" className="mt-4 flex gap-2 overflow-x-auto pb-1">
          {(
            [
              ["all", "Tout", total],
              ["games", "🎮 Jeux", games.length],
              ["anime", "🌸 Animes", animeCount],
              ["news", "📰 Actus", articles.length],
            ] as const
          ).map(([id, label, n]) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={tab === id}
              onClick={() => setTab(id)}
              className={`shrink-0 rounded-full px-3.5 py-1.5 text-sm font-semibold ring-1 ring-inset ${tab === id ? "bg-accent text-white ring-accent" : "glass-pill text-heading ring-border"}`}
            >
              {label} <span className={tab === id ? "text-white/80" : "text-muted"}>{n}</span>
            </button>
          ))}
        </div>
      )}

      {games.length > 0 && (tab === "all" || tab === "games") && (
        <section className="mt-8">
          <h2 className="text-lg font-bold text-heading">🎮 Jeux vidéo</h2>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
            {games.slice(0, moreGames || tab === "games" ? 48 : 8).map((g) => (
              <GameCard key={g.id} game={g} />
            ))}
          </div>
          {games.length > 8 && !moreGames && tab !== "games" && (
            <button type="button" onClick={() => setMoreGames(true)} className="mt-3 rounded-full glass-pill px-4 py-1.5 text-sm font-semibold text-heading ring-1 ring-inset ring-border">
              Voir les {Math.min(games.length, 48)} jeux
            </button>
          )}
        </section>
      )}

      <div className={tab === "all" || tab === "anime" ? undefined : "hidden"}>
        <AniListResults query={parseQuery(shownQuery).words.join(" ")} onCount={setAnimeCount} />
      </div>

      {articles.length > 0 && (tab === "all" || tab === "news") && (
        <section className="mt-8">
          <h2 className="text-lg font-bold text-heading">📰 Actualités</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
            {articles.slice(0, 60).map((a) => (
              <NewsCard key={a.slug} article={a} />
            ))}
          </div>
        </section>
      )}

      {tab === "all" && <WikipediaResults query={parseQuery(shownQuery).words.join(" ")} />}
    </>
  );
}
