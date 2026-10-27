// Anime : épisodes de la saison (prochain épisode et compte à rebours) et prochaines sorties,
// depuis l'API publique et gratuite d'AniList (anilist.co). Écrit .cache/news/anime.json avant le build.
// Seules les plateformes de streaming officielles listées par AniList sont reprises (Crunchyroll, ADN, Netflix…).
import { mkdirSync, renameSync, writeFileSync } from "node:fs";
import path from "node:path";

const OUT_FILE = path.resolve(".cache/news/anime.json");
const API = process.env.ANILIST_URL || "https://graphql.anilist.co";

const QUERY = `
query {
  airing: Page(perPage: 36) { media(type: ANIME, status: RELEASING, sort: POPULARITY_DESC, isAdult: false) { ...f } }
  upcoming: Page(perPage: 24) { media(type: ANIME, status: NOT_YET_RELEASED, sort: POPULARITY_DESC, isAdult: false) { ...f } }
}
fragment f on Media {
  id
  title { romaji english }
  coverImage { extraLarge large }
  bannerImage
  format
  episodes
  nextAiringEpisode { episode airingAt }
  startDate { year month day }
  genres
  averageScore
  siteUrl
  externalLinks { site url type language }
  trailer { id site }
}`;

const GENRES_FR = {
  Action: "Action", Adventure: "Aventure", Comedy: "Comédie", Drama: "Drame", Fantasy: "Fantasy", Horror: "Horreur",
  "Mahou Shoujo": "Magical girl", Mecha: "Mecha", Music: "Musique", Mystery: "Mystère", Psychological: "Psychologique",
  Romance: "Romance", "Sci-Fi": "Science-fiction", "Slice of Life": "Tranche de vie", Sports: "Sport", Supernatural: "Surnaturel",
  Thriller: "Thriller",
};
const FORMATS = { TV: "Série", TV_SHORT: "Série courte", MOVIE: "Film", OVA: "OAV", ONA: "Web", SPECIAL: "Spécial" };

const https = (u) => (typeof u === "string" && u.startsWith("https://") ? u : undefined);
const clean = (t, max) => String(t ?? "").replace(/\s+/g, " ").trim().slice(0, max);

function startDate(d) {
  if (!d?.year) return undefined;
  return [d.year, String(d.month ?? 1).padStart(2, "0"), String(d.day ?? 1).padStart(2, "0")].join("-");
}

function toAnime(m) {
  const streaming = (m.externalLinks ?? [])
    .filter((l) => l?.type === "STREAMING" && https(l.url))
    // Version française en priorité, puis les liens sans langue précise (plateformes internationales).
    .sort((a, b) => Number(b.language === "French") - Number(a.language === "French"))
    .filter((l, i, all) => all.findIndex((x) => x.site === l.site) === i)
    .slice(0, 4)
    .map((l) => ({ site: clean(l.site, 40), url: l.url }));
  return {
    id: `anilist-${m.id}`,
    title: clean(m.title?.english || m.title?.romaji, 120),
    original: m.title?.english && m.title?.romaji !== m.title.english ? clean(m.title.romaji, 120) : undefined,
    image: https(m.coverImage?.extraLarge) ?? https(m.coverImage?.large),
    banner: https(m.bannerImage),
    format: FORMATS[m.format] ?? m.format ?? undefined,
    episodes: Number.isInteger(m.episodes) ? m.episodes : undefined,
    next: m.nextAiringEpisode?.airingAt
      ? { episode: m.nextAiringEpisode.episode, at: new Date(m.nextAiringEpisode.airingAt * 1000).toISOString() }
      : undefined,
    start: startDate(m.startDate),
    genres: (m.genres ?? []).slice(0, 3).map((g) => GENRES_FR[g] ?? g),
    score: Number.isInteger(m.averageScore) ? m.averageScore : undefined,
    url: https(m.siteUrl),
    streaming,
    trailer: m.trailer?.site === "youtube" && /^[\w-]{6,20}$/.test(m.trailer.id ?? "") ? m.trailer.id : undefined,
  };
}

async function main() {
  let data = { airing: [], upcoming: [] };
  try {
    const res = await fetch(API, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json", "User-Agent": "GamingBase/1.0 (anime)" },
      body: JSON.stringify({ query: QUERY }),
      signal: AbortSignal.timeout(20_000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    data = {
      airing: (json?.data?.airing?.media ?? []).map(toAnime).filter((a) => a.title),
      upcoming: (json?.data?.upcoming?.media ?? []).map(toAnime).filter((a) => a.title),
    };
    console.log(`[anime] AniList : ${data.airing.length} en cours, ${data.upcoming.length} à venir`);
  } catch (err) {
    console.log(`[anime] AniList indisponible (${err.message})`);
  }
  mkdirSync(path.dirname(OUT_FILE), { recursive: true });
  writeFileSync(`${OUT_FILE}.tmp`, JSON.stringify({ updatedAt: new Date().toISOString(), ...data }));
  renameSync(`${OUT_FILE}.tmp`, OUT_FILE);
}

main().catch((err) => console.error(`[anime] erreur inattendue : ${err.message}`));
