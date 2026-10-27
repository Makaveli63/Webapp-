"use client";

/** Accès direct (depuis le navigateur) à l'API publique et gratuite d'AniList : fiches et saisons d'un anime. */
const API = "https://graphql.anilist.co";

export const FORMATS: Record<string, string> = { TV: "Série", TV_SHORT: "Série courte", MOVIE: "Film", OVA: "OAV", ONA: "Web", SPECIAL: "Spécial", MUSIC: "Clip" };
export const STATUS: Record<string, string> = { RELEASING: "En cours", FINISHED: "Terminé", NOT_YET_RELEASED: "À venir", HIATUS: "En pause", CANCELLED: "Annulé" };
export const GENRES_FR: Record<string, string> = {
  Action: "Action", Adventure: "Aventure", Comedy: "Comédie", Drama: "Drame", Fantasy: "Fantasy", Horror: "Horreur",
  "Mahou Shoujo": "Magical girl", Mecha: "Mecha", Music: "Musique", Mystery: "Mystère", Psychological: "Psychologique",
  Romance: "Romance", "Sci-Fi": "Science-fiction", "Slice of Life": "Tranche de vie", Sports: "Sport", Supernatural: "Surnaturel",
  Thriller: "Thriller",
};

export interface AniMedia {
  id: number;
  type?: string;
  title: { romaji?: string; english?: string | null };
  coverImage?: { large?: string; extraLarge?: string };
  bannerImage?: string | null;
  format?: string | null;
  status?: string | null;
  episodes?: number | null;
  duration?: number | null;
  startDate?: { year?: number | null; month?: number | null; day?: number | null };
  nextAiringEpisode?: { episode: number; airingAt: number } | null;
  siteUrl?: string;
  externalLinks?: { site: string; url: string; type?: string; language?: string | null }[];
  description?: string | null;
  genres?: string[];
  averageScore?: number | null;
  studios?: { nodes: { name: string }[] };
  trailer?: { id?: string; site?: string } | null;
  relations?: { edges: { relationType: string; node: { id: number; type?: string } }[] };
}

const FIELDS = `id type title { romaji english } coverImage { large extraLarge } format status episodes duration
  startDate { year month day } nextAiringEpisode { episode airingAt } siteUrl
  relations { edges { relationType node { id type } } }`;
const DETAIL = `${FIELDS} bannerImage description(asHtml: false) genres averageScore
  studios(isMain: true) { nodes { name } } trailer { id site } externalLinks { site url type language }`;

async function gql<T>(query: string, variables: Record<string, unknown>, signal?: AbortSignal): Promise<T> {
  const res = await fetch(API, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ query, variables }),
    signal,
  });
  if (!res.ok) throw new Error(`AniList ${res.status}`);
  const body = (await res.json()) as { data?: T };
  if (!body.data) throw new Error("AniList : réponse vide");
  return body.data;
}

export const https = (u?: string | null) => (u?.startsWith("https://") ? u : undefined);
export const titleOf = (m: AniMedia) => m.title.english || m.title.romaji || "Sans titre";
export const originalOf = (m: AniMedia) => (m.title.english && m.title.romaji !== m.title.english ? m.title.romaji : undefined);
export const nextOf = (m: AniMedia) =>
  m.nextAiringEpisode ? { episode: m.nextAiringEpisode.episode, at: new Date(m.nextAiringEpisode.airingAt * 1000).toISOString() } : undefined;
export const startKey = (m: AniMedia) =>
  m.startDate?.year ? `${m.startDate.year}-${String(m.startDate.month ?? 12).padStart(2, "0")}-${String(m.startDate.day ?? 28).padStart(2, "0")}` : "9999";

/** Plateformes de streaming officielles listées par AniList (version française d'abord). */
export const streamingOf = (m: AniMedia, max = 4) =>
  (m.externalLinks ?? [])
    .filter((l) => l.type === "STREAMING" && https(l.url))
    .sort((a, b) => Number(b.language === "French") - Number(a.language === "French"))
    .filter((l, i, all) => all.findIndex((x) => x.site === l.site) === i)
    .slice(0, max);

/** Synopsis AniList en texte brut (balises et mentions de source retirées). */
export const plainDescription = (d?: string | null) =>
  (d ?? "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/\(Source:[^)]*\)/gi, "")
    .replace(/&quot;/g, '"')
    .replace(/&#039;|&apos;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

export async function searchAnime(q: string, signal?: AbortSignal): Promise<AniMedia[]> {
  const data = await gql<{ Page: { media: AniMedia[] } }>(
    `query ($q: String) { Page(perPage: 12) { media(search: $q, type: ANIME, isAdult: false, sort: SEARCH_MATCH) { ${FIELDS} externalLinks { site url type language } } } }`,
    { q: q.slice(0, 100) },
    signal,
  );
  return (data.Page?.media ?? []).filter((m) => m?.id);
}

export async function getAnimeDetail(id: number, signal?: AbortSignal): Promise<AniMedia | null> {
  const data = await gql<{ Media: AniMedia | null }>(`query ($id: Int) { Media(id: $id, type: ANIME, isAdult: false) { ${DETAIL} } }`, { id }, signal);
  return data.Media;
}

// Suite chronologique (saisons) : on suit les liens « préquelle » / « suite » ; les autres liens (films, OAV, spin-off)
// sont ajoutés sans être suivis, pour ne pas parcourir toute une franchise géante.
const CHAIN = new Set(["PREQUEL", "SEQUEL"]);
const EXTRA = new Set(["SIDE_STORY", "SPIN_OFF", "ALTERNATIVE", "SUMMARY", "PARENT", "COMPILATION"]);
const MAX_LEVELS = 8;
const MAX_ENTRIES = 40;

/** Toutes les saisons, films et OAV liés à un anime, du plus ancien au plus récent. */
export async function getFranchise(start: AniMedia, signal?: AbortSignal): Promise<AniMedia[]> {
  const found = new Map<number, AniMedia>([[start.id, start]]);
  let frontier: AniMedia[] = [start];
  const extras = new Set<number>();
  for (let level = 0; level < MAX_LEVELS && frontier.length && found.size < MAX_ENTRIES; level++) {
    const next = new Set<number>();
    for (const m of frontier) {
      for (const e of m.relations?.edges ?? []) {
        if (e.node?.type !== "ANIME" || found.has(e.node.id)) continue;
        if (CHAIN.has(e.relationType)) next.add(e.node.id);
        else if (EXTRA.has(e.relationType)) extras.add(e.node.id);
      }
    }
    if (!next.size) break;
    const ids = [...next].slice(0, MAX_ENTRIES - found.size);
    const data = await gql<{ Page: { media: AniMedia[] } }>(
      `query ($ids: [Int]) { Page(perPage: 50) { media(id_in: $ids, type: ANIME, isAdult: false) { ${FIELDS} } } }`,
      { ids },
      signal,
    );
    frontier = data.Page?.media ?? [];
    for (const m of frontier) found.set(m.id, m);
  }
  const missing = [...extras].filter((id) => !found.has(id)).slice(0, Math.max(0, MAX_ENTRIES - found.size));
  if (missing.length) {
    const data = await gql<{ Page: { media: AniMedia[] } }>(
      `query ($ids: [Int]) { Page(perPage: 50) { media(id_in: $ids, type: ANIME, isAdult: false) { ${FIELDS} } } }`,
      { ids: missing },
      signal,
    );
    for (const m of data.Page?.media ?? []) found.set(m.id, m);
  }
  return [...found.values()].filter((m) => m.format !== "MUSIC").sort((a, b) => startKey(a).localeCompare(startKey(b)));
}

/** Lien vers la fiche d'un anime sur le site (« anilist-123 » ou 123). */
export const animeHref = (id: string | number) => `/anime/fiche?id=${String(id).replace(/^anilist-/, "")}`;
