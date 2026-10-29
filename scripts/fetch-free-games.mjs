// Récupère les jeux gratuits du moment et écrit .cache/news/free-games.json, lu par le build.
// - Epic Games Store : données publiques de la boutique (jeux de la semaine + ceux de jeudi prochain)
// - Autres boutiques (Steam, GOG, Prime Gaming…) : API publique de GamerPower (attribution requise)
// Ne bloque jamais la publication : en cas d'échec, la page affiche un message d'indisponibilité.
import { mkdirSync, renameSync, writeFileSync } from "node:fs";
import path from "node:path";

const OUT_FILE = path.resolve(".cache/news/free-games.json");
const EPIC_URL =
  process.env.EPIC_URL ||
  "https://store-site-backend-static-ipv4.ak.epicgames.com/freeGamesPromotions?locale=fr&country=FR&allowCountries=FR";
const GAMERPOWER_URL = process.env.GAMERPOWER_URL || "https://www.gamerpower.com/api/giveaways?type=game&sort-by=date";
const MAX_BYTES = 5 * 1024 * 1024;

function clean(text, max) {
  const t = String(text ?? "").replace(/\s+/g, " ").trim();
  return t.length > max ? `${t.slice(0, max - 1).trimEnd()}…` : t;
}

function safeUrl(raw) {
  try {
    const url = new URL(String(raw ?? "").trim());
    return url.protocol === "https:" || url.protocol === "http:" ? url.href : undefined;
  } catch {
    return undefined;
  }
}

function isoOrUndefined(value) {
  const t = Date.parse(value ?? "");
  return Number.isNaN(t) ? undefined : new Date(t).toISOString();
}

async function getJson(url) {
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)", Accept: "application/json" },
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const body = await res.arrayBuffer();
  if (body.byteLength > MAX_BYTES) throw new Error("réponse trop volumineuse");
  return JSON.parse(new TextDecoder().decode(body));
}

/** Offres à 100 % de réduction (prix 0) dans une liste de promotions Epic. */
function freeOffers(groups) {
  return (groups ?? [])
    .flatMap((g) => g?.promotionalOffers ?? [])
    .filter((o) => o?.discountSetting?.discountPercentage === 0);
}

/** Visuel officiel Epic, au format large de préférence. */
function epicImage(el) {
  const images = el.keyImages ?? [];
  for (const type of ["OfferImageWide", "DieselStoreFrontWide", "featuredMedia", "Thumbnail", "OfferImageTall"]) {
    const url = safeUrl(images.find((i) => i?.type === type)?.url);
    if (url?.startsWith("https://")) return url;
  }
  return undefined;
}

function epicSlug(el) {
  return (
    el.catalogNs?.mappings?.find((m) => m?.pageType === "productHome")?.pageSlug ||
    el.catalogNs?.mappings?.[0]?.pageSlug ||
    el.offerMappings?.[0]?.pageSlug ||
    el.productSlug?.replace(/\/home$/, "")
  );
}

async function fetchEpic() {
  const data = await getJson(EPIC_URL);
  const elements = data?.data?.Catalog?.searchStore?.elements ?? [];
  const now = Date.now();
  const games = [];

  for (const el of elements) {
    if (!el?.title) continue;
    const slug = epicSlug(el);
    const url = safeUrl(slug ? `https://store.epicgames.com/fr/p/${slug}` : "https://store.epicgames.com/fr/free-games");
    const worth = el.price?.totalPrice?.fmtPrice?.originalPrice;
    const base = {
      title: clean(el.title, 120),
      store: "Epic Games",
      url,
      worth: worth && worth !== "0" ? clean(worth, 20) : undefined,
      image: epicImage(el),
    };

    const current = freeOffers(el.promotions?.promotionalOffers).find(
      (o) => Date.parse(o.startDate) <= now && now < Date.parse(o.endDate),
    );
    if (current) {
      games.push({ ...base, id: `epic-${el.id}`, status: "now", startDate: isoOrUndefined(current.startDate), endDate: isoOrUndefined(current.endDate) });
      continue;
    }
    const upcoming = freeOffers(el.promotions?.upcomingPromotionalOffers)[0];
    if (upcoming) {
      games.push({ ...base, id: `epic-${el.id}`, status: "upcoming", startDate: isoOrUndefined(upcoming.startDate), endDate: isoOrUndefined(upcoming.endDate) });
    }
  }
  return games;
}

const STORE_NAMES = [
  ["Steam", /steam/i],
  ["GOG", /gog/i],
  ["Prime Gaming", /prime|amazon/i],
  ["Ubisoft", /ubisoft/i],
  ["EA", /\bea\b|origin/i],
  ["Itch.io", /itch/i],
  ["Xbox", /xbox/i],
  ["PlayStation", /playstation|ps4|ps5/i],
  ["Nintendo", /switch|nintendo/i],
];

async function fetchGamerPower() {
  const data = await getJson(GAMERPOWER_URL);
  if (!Array.isArray(data)) return [];
  return data
    .filter((g) => g?.type === "Game" && g?.status === "Active")
    .filter((g) => !/epic games/i.test(g.platforms ?? "")) // déjà couvert par les données officielles d'Epic
    .slice(0, 40)
    .map((g) => {
      const platforms = String(g.platforms ?? "");
      const store = STORE_NAMES.find(([, re]) => re.test(platforms))?.[0] ?? "Autre";
      const end = g.end_date && g.end_date !== "N/A" ? isoOrUndefined(g.end_date.replace(" ", "T") + "Z") : undefined;
      return {
        id: `gp-${g.id}`,
        title: clean(String(g.title ?? "").replace(/\s*\((Steam|GOG|PC|Epic Games)\)\s*Giveaway$/i, "").replace(/\s*Giveaway$/i, ""), 120),
        store,
        url: safeUrl(g.open_giveaway_url) ?? safeUrl(g.gamerpower_url),
        worth: g.worth && g.worth !== "N/A" ? clean(g.worth, 20) : undefined,
        status: "now",
        endDate: end,
        platforms: clean(platforms, 80),
        image: [g.image, g.thumbnail].map(safeUrl).find((u) => u?.startsWith("https://")),
      };
    })
    .filter((g) => g.title && g.url);
}

async function main() {
  mkdirSync(path.dirname(OUT_FILE), { recursive: true });
  const [epic, others] = await Promise.allSettled([fetchEpic(), fetchGamerPower()]);
  for (const [name, r] of [["Epic Games", epic], ["GamerPower", others]]) {
    console.log(`[gratuits] ${name}: ${r.status === "fulfilled" ? `${r.value.length} jeux` : `échec (${r.reason?.message})`}`);
  }
  const result = {
    updatedAt: new Date().toISOString(),
    epicAvailable: epic.status === "fulfilled",
    othersAvailable: others.status === "fulfilled",
    games: [...(epic.status === "fulfilled" ? epic.value : []), ...(others.status === "fulfilled" ? others.value : [])],
  };
  writeFileSync(`${OUT_FILE}.tmp`, JSON.stringify(result));
  renameSync(`${OUT_FILE}.tmp`, OUT_FILE);
}

main().catch((err) => console.error(`[gratuits] erreur inattendue : ${err.message}`));
