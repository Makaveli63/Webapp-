// Calendrier des sorties (semaine / mois) et visuels des grosses sorties → .cache/news/calendar.json
// - Avec RAWG_API_KEY (gratuite sur rawg.io/apidocs) : toutes plateformes, images incluses.
// - Sans clé : sorties PC à venir et récentes de Steam (données publiques de la boutique).
// Visuel des grosses sorties (src/data/releases.json) : champ « image », sinon RAWG, sinon image de
// partage officielle (og:image) de la page source. Bandes-annonces : Steam, RAWG, et pour les grosses
// sorties l'identifiant YouTube de releases.json, vérifié auprès de YouTube. Ne bloque jamais la publication.
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
  // Bandes-annonces des 12 jeux les plus suivis (liste triée par popularité) : quota RAWG gratuit ménagé.
  for (const g of games.slice(0, 12)) {
    try {
      g.video = await rawgVideo(g.id.replace("rawg-", ""));
    } catch {
      /* pas de vidéo */
    }
  }
  return games;
}

/** Première bande-annonce Steam lisible directement (MP4 ou WebM). */
function steamVideo(movies) {
  for (const m of Array.isArray(movies) ? movies : []) {
    const mp4 = httpsUrl(m?.mp4?.max ?? m?.mp4?.["480"] ?? m?.webm?.max ?? m?.webm?.["480"]);
    if (mp4) return { mp4, poster: httpsUrl(m.thumbnail) };
  }
  return undefined;
}

/** Bande-annonce RAWG d'un jeu (souvent issue de Steam), si elle existe. */
async function rawgVideo(gameId) {
  const data = await get(`${RAWG_BASE}/api/games/${gameId}/movies?key=${encodeURIComponent(RAWG_KEY)}`);
  const m = data?.results?.[0];
  const mp4 = httpsUrl(m?.data?.max ?? m?.data?.["480"]);
  return mp4 ? { mp4, poster: httpsUrl(m.preview) } : undefined;
}

const norm = (t) => String(t ?? "").toLowerCase().normalize("NFD").replace(/[^a-z0-9]/g, "");

/** Vérifie via YouTube (oEmbed, sans clé) qu'un identifiant correspond bien au jeu attendu. */
async function checkedYoutube(id, names) {
  if (!/^[A-Za-z0-9_-]{11}$/.test(id ?? "")) return undefined;
  const data = await get(`https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(`https://www.youtube.com/watch?v=${id}`)}`);
  const title = norm(data?.title);
  return names.some((n) => n && title.includes(norm(n))) ? { youtube: id } : undefined;
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
        video: steamVideo(details.movies),
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

async function releaseMedia() {
  const releases = JSON.parse(readFileSync("src/data/releases.json", "utf8"));
  const images = {};
  const videos = {};
  for (const r of releases) {
    let rawgId;
    try {
      let image = httpsUrl(r.image);
      if (RAWG_KEY) {
        const data = await get(
          `${RAWG_BASE}/api/games?key=${encodeURIComponent(RAWG_KEY)}&search=${encodeURIComponent(r.title)}&search_precise=true&page_size=1`,
        );
        const found = data?.results?.[0];
        if (found && norm(found.name).includes(norm(r.title).slice(0, 12))) {
          rawgId = found.id;
          image ??= httpsUrl(found.background_image);
        }
      }
      if (!image) image = await ogImage(r.source);
      if (image) images[r.id] = image;
    } catch (err) {
      console.log(`[sorties] visuel introuvable pour ${r.title} (${err.message})`);
    }
    // Vidéo : YouTube vérifié d'abord, puis bande-annonce RAWG ; chaque étape peut échouer sans bloquer l'autre.
    let video;
    if (r.youtube) {
      video = await checkedYoutube(r.youtube, [r.title, r.short]).catch((err) => {
        console.log(`[sorties] vérification YouTube impossible pour ${r.title} (${err.message})`);
        return undefined;
      });
      if (!video) console.log(`[sorties] vidéo YouTube non retenue pour ${r.title}`);
    }
    if (!video && rawgId) video = await rawgVideo(rawgId).catch(() => undefined);
    if (video) videos[r.id] = video;
  }
  return { images, videos };
}

/** Base de jeux pour la recherche : les 200 jeux les plus populaires de RAWG. */
async function gameDatabase() {
  if (!RAWG_KEY) return [];
  const games = [];
  for (const page of [1, 2, 3, 4, 5]) {
    const data = await get(`${RAWG_BASE}/api/games?key=${encodeURIComponent(RAWG_KEY)}&ordering=-added&page_size=40&page=${page}`);
    for (const g of data?.results ?? []) {
      if (!g?.name) continue;
      games.push({
        id: `rawg-${g.id}`,
        title: clean(g.name, 120),
        date: /^\d{4}-\d{2}-\d{2}$/.test(g.released ?? "") ? g.released : undefined,
        platforms: platformLabels((g.platforms ?? []).map((p) => p?.platform?.name ?? "")),
        image: httpsUrl(g.background_image),
        url: httpsUrl(`https://rawg.io/games/${g.slug}`),
        rating: typeof g.metacritic === "number" ? g.metacritic : undefined,
      });
    }
    if (!data?.next) break;
  }
  return games;
}

/**
 * Vraies photos des consoles, sous licence libre uniquement (Wikipédia, paramètre pilicense=free),
 * avec l'auteur et la licence pour le crédit. Utilisées quand un article n'a pas d'image.
 */
const CONSOLE_PAGES = { switch: "Nintendo Switch 2", ps: "PlayStation 5", xbox: "Xbox Series X and Series S" };

async function consolePhotos() {
  const out = {};
  for (const [theme, page] of Object.entries(CONSOLE_PAGES)) {
    try {
      const q = new URLSearchParams({
        action: "query", format: "json", redirects: "1", titles: page,
        prop: "pageimages", piprop: "name|thumbnail", pithumbsize: "1280", pilicense: "free",
      });
      const data = await get(`https://en.wikipedia.org/w/api.php?${q}`);
      const p = Object.values(data?.query?.pages ?? {})[0];
      const url = httpsUrl(p?.thumbnail?.source);
      if (!url || !p?.pageimage) continue;
      const meta = await get(
        `https://commons.wikimedia.org/w/api.php?${new URLSearchParams({ action: "query", format: "json", titles: `File:${p.pageimage}`, prop: "imageinfo", iiprop: "extmetadata" })}`,
      );
      const em = Object.values(meta?.query?.pages ?? {})[0]?.imageinfo?.[0]?.extmetadata ?? {};
      const strip = (h) => clean(String(h ?? "").replace(/<[^>]*>/g, ""), 80);
      const author = strip(em.Artist?.value);
      const license = strip(em.LicenseShortName?.value);
      out[theme] = {
        url,
        credit: `Photo : ${author || "Wikimedia Commons"}${license ? `, ${license}` : ""} (Wikimedia Commons)`,
        page: `https://commons.wikimedia.org/wiki/File:${encodeURIComponent(p.pageimage)}`,
      };
    } catch (err) {
      console.log(`[sorties] photo de console indisponible pour ${page} (${err.message})`);
    }
  }
  return out;
}

async function main() {
  mkdirSync(path.dirname(OUT_FILE), { recursive: true });
  // RAWG (toutes plateformes, si clé) complété par Steam (PC) ; doublons retirés par titre.
  const results = await Promise.allSettled([RAWG_KEY ? fromRawg() : Promise.resolve([]), fromSteam()]);
  const [rawg, steam] = results.map((r) => (r.status === "fulfilled" ? r.value : []));
  results.forEach((r, i) => {
    if (r.status === "rejected") console.log(`[sorties] ${i ? "Steam" : "RAWG"} indisponible (${r.reason?.message})`);
  });
  const key = (t) => t.toLowerCase().normalize("NFD").replace(/[^a-z0-9]/g, "");
  const known = new Set(rawg.map((g) => key(g.title)));
  const games = [...rawg, ...steam.filter((g) => !known.has(key(g.title)))];
  const source = rawg.length ? "RAWG" : steam.length ? "Steam" : undefined;
  console.log(`[sorties] RAWG : ${rawg.length} jeux, Steam : ${steam.length} jeux, total : ${games.length}`);
  let database = [];
  try {
    database = await gameDatabase();
    console.log(`[sorties] base de jeux pour la recherche : ${database.length}`);
  } catch (err) {
    console.log(`[sorties] base de jeux indisponible (${err.message})`);
  }
  const { images, videos } = await releaseMedia();
  const photos = await consolePhotos();
  console.log(`[sorties] photos libres des consoles : ${Object.keys(photos).join(", ") || "aucune"}`);
  console.log(
    `[sorties] grosses sorties : ${Object.keys(images).length} visuels, ${Object.keys(videos).length} vidéos ; ` +
      `calendrier : ${games.filter((g) => g.video).length} bandes-annonces`,
  );

  const seen = new Set();
  const result = {
    updatedAt: new Date().toISOString(),
    source,
    games: games.filter((g) => !seen.has(g.id) && seen.add(g.id)).sort((a, b) => a.date.localeCompare(b.date)),
    releaseImages: images,
    releaseVideos: videos,
    database,
    consolePhotos: photos,
  };
  writeFileSync(`${OUT_FILE}.tmp`, JSON.stringify(result));
  renameSync(`${OUT_FILE}.tmp`, OUT_FILE);
}

main().catch((err) => console.error(`[sorties] erreur inattendue : ${err.message}`));
