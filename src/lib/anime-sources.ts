"use client";

/**
 * Autres sources pour la fiche anime :
 * - résumé en français : traduction préparée par le site, sinon Wikipédia en français (trouvée via Wikidata) ;
 * - notes MyAnimeList (API Jikan) et Kitsu.
 * Toutes publiques, gratuites et sans clé ; chacune peut échouer sans gêner le reste.
 */
const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

const json = async <T,>(url: string, signal?: AbortSignal): Promise<T | null> => {
  try {
    const r = await fetch(url, { signal, headers: { Accept: "application/json" } });
    return r.ok ? ((await r.json()) as T) : null;
  } catch {
    return null;
  }
};

export interface FrenchSynopsis {
  text: string;
  source: "site" | "wikipedia";
  url?: string;
}

/** Article Wikipédia en français lié à l'anime dans Wikidata (identifiant AniList P8729, ou MyAnimeList P4086). */
async function wikipediaFr(anilistId: number, malId: number | null | undefined, signal?: AbortSignal): Promise<FrenchSynopsis | null> {
  const api = "https://www.wikidata.org/w/api.php";
  for (const claim of [`P8729=${anilistId}`, malId ? `P4086=${malId}` : null].filter(Boolean)) {
    const search = await json<{ query?: { search?: { title: string }[] } }>(
      `${api}?action=query&list=search&srsearch=haswbstatement:${claim}&srlimit=1&format=json&origin=*`,
      signal,
    );
    const qid = search?.query?.search?.[0]?.title;
    if (!qid || !/^Q\d+$/.test(qid)) continue;
    const entity = await json<{ entities?: Record<string, { sitelinks?: { frwiki?: { title: string } } }> }>(
      `${api}?action=wbgetentities&ids=${qid}&props=sitelinks&sitefilter=frwiki&format=json&origin=*`,
      signal,
    );
    const title = entity?.entities?.[qid]?.sitelinks?.frwiki?.title;
    if (!title) continue;
    const page = encodeURIComponent(title.replace(/ /g, "_"));
    const summary = await json<{ extract?: string; content_urls?: { desktop?: { page?: string } } }>(
      `https://fr.wikipedia.org/api/rest_v1/page/summary/${page}`,
      signal,
    );
    if (summary?.extract && summary.extract.length > 60) {
      return { text: summary.extract, source: "wikipedia", url: summary.content_urls?.desktop?.page ?? `https://fr.wikipedia.org/wiki/${page}` };
    }
  }
  return null;
}

export async function frenchSynopsis(anilistId: number, malId?: number | null, signal?: AbortSignal): Promise<FrenchSynopsis | null> {
  const site = await json<{ fr?: string }>(`${BASE_PATH}/anime-fr/${anilistId}.json`, signal);
  if (site?.fr) return { text: site.fr, source: "site" };
  return wikipediaFr(anilistId, malId, signal);
}

export interface OtherRatings {
  mal?: { score: number; rank?: number; members?: number; url: string };
  kitsu?: { score: number; url: string };
}

/** Recommandations des fans de MyAnimeList (Jikan) : identifiants MAL, du plus voté au moins voté. */
export async function malRecommendations(malId: number, signal?: AbortSignal): Promise<number[]> {
  const r = await json<{ data?: { entry?: { mal_id?: number }; votes?: number }[] }>(`https://api.jikan.moe/v4/anime/${malId}/recommendations`, signal);
  return (r?.data ?? [])
    .filter((d) => typeof d.entry?.mal_id === "number" && (d.votes ?? 0) >= 2)
    .slice(0, 12)
    .map((d) => d.entry!.mal_id!);
}

/** Notes MyAnimeList (Jikan) et Kitsu, retrouvées grâce à l'identifiant MyAnimeList fourni par AniList. */
export async function otherRatings(malId: number, signal?: AbortSignal): Promise<OtherRatings> {
  const [mal, kitsu] = await Promise.all([
    json<{ data?: { score?: number | null; rank?: number | null; members?: number | null; url?: string } }>(
      `https://api.jikan.moe/v4/anime/${malId}`,
      signal,
    ),
    json<{ included?: { attributes?: { averageRating?: string | null; slug?: string } }[] }>(
      `https://kitsu.app/api/edge/mappings?filter[externalSite]=myanimelist/anime&filter[externalId]=${malId}&include=item`,
      signal,
    ),
  ]);
  const out: OtherRatings = {};
  const d = mal?.data;
  if (typeof d?.score === "number") {
    out.mal = { score: d.score, rank: d.rank ?? undefined, members: d.members ?? undefined, url: d.url?.startsWith("https://") ? d.url : `https://myanimelist.net/anime/${malId}` };
  }
  const k = kitsu?.included?.[0]?.attributes;
  const rating = Number(k?.averageRating);
  if (k?.slug && Number.isFinite(rating) && rating > 0) out.kitsu = { score: rating, url: `https://kitsu.app/anime/${encodeURIComponent(k.slug)}` };
  return out;
}
