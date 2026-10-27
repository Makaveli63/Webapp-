// Calendrier des sorties (semaine / mois) et visuels des grosses sorties → .cache/news/calendar.json
// - Avec RAWG_API_KEY (gratuite sur rawg.io/apidocs) : toutes plateformes, images incluses.
// - Sans clé : sorties PC à venir et récentes de Steam (données publiques de la boutique).
// Visuel des grosses sorties (src/data/releases.json) : champ « image », sinon RAWG, sinon image de
// partage officielle (og:image) de la page source. Ne bloque jamais la publication.
import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import path from "node:path";

const OUT_FILE = path.resolve(".cache/news/calendar.json");
const RAWG_KEY = process.env.RAWG_API_KEY?.trim();
const RAWG_BASE = process.env.RAWG_BASE?.trim() || "https://api.rawg.io"; // remplaçable pour les tests
const MAX_BYTES = 3 * 1024 * 1024;
const UA = "GamingBase/1.0 (calendrier des sorties)";

const clean = (t, max) => {
  const s = String(t ?? "").replace(/\s+/g, " ").trim();
  return s.length > max ? `${s.slice(0, max - 1).trimEnd()}…` : s;
};

function httpsUrl(raw) {
  try {
    const url = new URL(String(raw ?? "").trim().replace(/&amp;/g, "&"));
    if (url.protocol === "http:") url.protocol = "https:";
    return url.protocol === "https:" ? url.href : undefined;
  } catch {
    return undefined;
  }
}

async function get(url, as = "json") {
  const res = await fetch(url, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(15_000) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const body = await res.arrayBuffer();
  if (body.byteLength > MAX_BYTES) throw new Error("réponse trop volumineuse");
  const text = new TextDecoder().decode(body);
  return as === "json" ? JSON.parse(text) : text;
}

const ymd = (d) => d.toISOString().slice(0, 10);

/** Fenêtre couverte : depuis lundi dernier jusqu'à la fin du mois prochain. */
function windowDates(now = new Date()) {
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  start.setUTCDate(start.getUTCDate() - ((start.getUTCDay() + 6) % 7));
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 2, 0));
  return [ymd(start), ymd(end)];
}

const PLATFORM_LABELS = [
  [/playstation 5/i, "PS5"],
  [/playstation 4/i, "PS4"],
  [/xbox series/i, "Xbox Series"],
  [/xbox one/i, "Xbox One"],
  [/switch 2/i, "Switch 2"],
  [/nintendo switch/i, "Switch"],
  [/^pc$/i, "PC"],
  [/macos/i, "Mac"],
  [/ios/i, "iOS"],
  [/android/i, "Android"],
];

function platformLabels(names) {
  const out = [];
  for (const name of names) {
    const label = PLATFORM_LABELS.find(([re]) => re.test(name))?.[1];
    if (label && !out.includes(label)) out.push(label);
  }
  return out;
}

async function fromRawg() {
  const [from, to] = windowDates();
  const games = [];
  for (const page of [1, 2]) {
    const data = await get(
      `${RAWG_BASE}/api/games?key=${encodeURIComponent(RAWG_KEY)}&dates=${from},${to}&ordering=-added&page_size=40&page=${page}`,
    );
    for (const g of data?.results ?? []) {
      if (!g?.name || !/^\d{4}-\d{2}-\d{2}$/.test(g.released ?? "")) continue;
      games.push({
        id: `rawg-${g.id}`,
        title: clean(g.name, 120),
        date: g.released,
        platforms: platformLabels((g.platforms ?? []).map((p) => p?.platform?.name ?? "")),
        image: httpsUrl(g.background_image),
        url: httpsUrl(`https://rawg.io/games/${g.slug}`),
      });
    }
    if (!data?.next) break;
  }
  return games;
}

/** Date Steam en anglais (« Nov 5, 2026 », « 5 Nov, 2026 ») → AAAA-MM-JJ, sinon undefined. */
function steamDate(text) {
  const t = Date.parse(`${String(text ?? "").replace(",", "")} 12:00 UTC`);
  return Number.isNaN(t) ? undefined : ymd(new Date(t));
}

async function fromSteam() {
  const cats = await get("https://store.steampowered.com/api/featuredcategories?cc=fr&l=english");
  const items = [...(cats?.coming_soon?.items ?? []), ...(cats?.new_releases?.items ?? [])];
  const seen = new Set();
  const games = [];
  for (const item of items) {
    if (!item?.id || seen.has(item.id) || games.length >= 30) continue;
    seen.add(item.id);
    try {
      const details = (await get(`https://store.steampowered.com/api/appdetails?appids=${item.id}&cc=fr&l=english`))?.[item.id]?.data;
      const date = steamDate(details?.release_date?.date);
      if (!date || details?.type !== "game") continue;
      games.push({
        id: `steam-${item.id}`,
        title: clean(details.name ?? item.name, 120),
        date,
        platforms: ["PC"],
        image: httpsUrl(details.header_image ?? item.header_image),
        url: httpsUrl(`https://store.steampowered.com/app/${item.id}/`),
      });
    } catch {
      /* jeu ignoré */
    }
  }
  const [from, to] = windowDates();
  return games.filter((g) => g.date >= from && g.date <= to);
}

/** Image de partage officielle d'une page (balise og:image). */
async function ogImage(pageUrl) {
  const html = await get(pageUrl, "text");
  const m =
    /<meta[^>]+property=["']og:image(?::secure_url)?["'][^>]+content=["']([^"']+)["']/i.exec(html) ??
    /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i.exec(html);
  return httpsUrl(m?.[1] ? new URL(m[1], pageUrl).href : undefined);
}

async function releaseImages() {
  const releases = JSON.parse(readFileSync("src/data/releases.json", "utf8"));
  const out = {};
  for (const r of releases) {
    try {
      let image = httpsUrl(r.image);
      if (!image && RAWG_KEY) {
        const data = await get(
          `${RAWG_BASE}/api/games?key=${encodeURIComponent(RAWG_KEY)}&search=${encodeURIComponent(r.title)}&search_precise=true&page_size=1`,
        );
        image = httpsUrl(data?.results?.[0]?.background_image);
      }
      if (!image) image = await ogImage(r.source);
      if (image) out[r.id] = image;
    } catch (err) {
      console.log(`[sorties] visuel introuvable pour ${r.title} (${err.message})`);
    }
  }
  return out;
}

async function main() {
  mkdirSync(path.dirname(OUT_FILE), { recursive: true });
  let source;
  let games = [];
  try {
    if (RAWG_KEY) {
      games = await fromRawg();
      source = "RAWG";
    } else {
      games = await fromSteam();
      source = "Steam";
    }
    console.log(`[sorties] ${source} : ${games.length} jeux`);
  } catch (err) {
    console.log(`[sorties] calendrier indisponible (${err.message})`);
  }
  const images = await releaseImages();
  console.log(`[sorties] visuels des grosses sorties : ${Object.keys(images).length}`);

  const seen = new Set();
  const result = {
    updatedAt: new Date().toISOString(),
    source,
    games: games.filter((g) => !seen.has(g.id) && seen.add(g.id)).sort((a, b) => a.date.localeCompare(b.date)),
    releaseImages: images,
  };
  writeFileSync(`${OUT_FILE}.tmp`, JSON.stringify(result));
  renameSync(`${OUT_FILE}.tmp`, OUT_FILE);
}

main().catch((err) => console.error(`[sorties] erreur inattendue : ${err.message}`));
