// Calendrier des sorties (semaine / mois) et visuels des grosses sorties → .cache/news/calendar.json
// - Avec RAWG_API_KEY (gratuite sur rawg.io/apidocs) : toutes plateformes, images incluses.
// - Sans clé : sorties PC à venir et récentes de Steam (données publiques de la boutique).
// Visuel des grosses sorties (src/data/releases.json) : champ « image », sinon RAWG, sinon image de
// partage officielle (og:image) de la page source. Bandes-annonces : Steam, RAWG, et pour les grosses
// sorties l'identifiant YouTube de releases.json, vérifié auprès de YouTube. Ne bloque jamais la publication.
import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import path from "node:path";

const OUT_FILE = path.resolve(".cache/news/calendar.json");
// Grande base de jeux pour la recherche (plusieurs milliers), conservée d'un build à l'autre (cache GitHub Actions)
// et complétée quelques pages RAWG à la fois pour ménager le quota gratuit.
const SEARCH_DB_FILE = path.resolve(".cache/news/games-db.json");
const SEARCH_DB_MAX = 6000;
const SEARCH_DB_KEEP_DAYS = 45;
const RAWG_KEY = process.env.RAWG_API_KEY?.trim();
const RAWG_BASE = process.env.RAWG_BASE?.trim() || "https://api.rawg.io"; // remplaçable pour les tests
const MAX_BYTES = 3 * 1024 * 1024;
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36";

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

// Plateformes des grosses sorties (le compte à rebours ne connaît que les grandes familles).
const BIG_PLATFORMS = { PS5: "PS5", "Xbox Series": "Xbox", "Switch 2": "Switch 2", PC: "PC", iOS: "Mobile", Android: "Mobile" };

/**
 * Jeux les plus attendus selon RAWG (les plus ajoutés aux listes des joueurs), avec une date de sortie précise
 * dans les 18 prochains mois. Les dates « 31 décembre » sont des estimations de RAWG (« sortie en 2027 ») : écartées.
 */
async function anticipatedFromRawg() {
  const today = new Date();
  const from = today.toISOString().slice(0, 10);
  const to = new Date(today.getTime() + 548 * 86_400_000).toISOString().slice(0, 10);
  const data = await get(`${RAWG_BASE}/api/games?key=${encodeURIComponent(RAWG_KEY)}&dates=${from},${to}&ordering=-added&page_size=40`);
  return (data?.results ?? [])
    .filter((g) => g?.name && !g.tba && /^\d{4}-\d{2}-\d{2}$/.test(g.released ?? "") && !/-12-31$/.test(g.released) && (g.added ?? 0) >= 150)
    .slice(0, 10)
    .map((g) => ({
      id: `rawg-${g.id}`,
      title: clean(g.name, 120),
      date: g.released,
      platforms: [...new Set(platformLabels((g.platforms ?? []).map((p) => p?.platform?.name ?? "")).map((p) => BIG_PLATFORMS[p]).filter(Boolean))],
      image: httpsUrl(g.background_image),
      source: httpsUrl(`https://rawg.io/games/${g.slug}`),
    }));
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
  // Grosses sorties datées et jeux annoncés sans date : même recherche de visuel et de bande-annonce.
  const releases = [...JSON.parse(readFileSync("src/data/releases.json", "utf8")), ...JSON.parse(readFileSync("src/data/announced.json", "utf8"))];
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
        // Temps de jeu moyen déclaré par les joueurs RAWG (heures), genres en anglais (traduits sur le site).
        playtime: Number.isInteger(g.playtime) && g.playtime > 0 && g.playtime < 1000 ? g.playtime : undefined,
        genres: (g.genres ?? []).map((x) => clean(x?.name, 40)).filter(Boolean).slice(0, 3),
      });
    }
    if (!data?.next) break;
  }
  return games;
}

/** Image RAWG réduite (cartes de la recherche) : /media/crop/600/400/… au lieu de l'original. */
const smallImage = (url) => url?.replace("https://media.rawg.io/media/", "https://media.rawg.io/media/crop/600/400/");

/**
 * Base de recherche : listes RAWG parcourues par morceaux d'un build à l'autre
 * (à venir, sorties des 3 dernières années, les plus populaires de tous les temps).
 */
async function searchDatabase() {
  let db = { cursor: 0, games: {}, ends: {} };
  try {
    db = JSON.parse(readFileSync(SEARCH_DB_FILE, "utf8"));
  } catch {
    // premier passage : base vide
  }
  if (!RAWG_KEY) return Object.values(db.games ?? {});
  const now = new Date();
  const later = new Date(now.getTime() + 548 * 86_400_000);
  const before = new Date(now.getTime() - 3 * 365 * 86_400_000);
  const pages = (list, n, query) => Array.from({ length: n }, (_, i) => ({ list, page: i + 1, query: `${query}&page=${i + 1}` }));
  const lists = [
    ...pages("avenir", 10, `dates=${ymd(now)},${ymd(later)}&ordering=-added`),
    ...pages("recents", 40, `dates=${ymd(before)},${ymd(now)}&ordering=-added`),
    ...pages("populaires", 60, "ordering=-added"),
  ];
  // Dernière page de chaque liste (RAWG répond 404 au-delà) : on ne redemande pas ces pages pendant une semaine.
  const week = ymd(new Date(now.getTime() - 7 * 86_400_000));
  const ends = Object.fromEntries(Object.entries(db.ends ?? {}).filter(([, v]) => v?.at >= week));
  const exists = (p) => !ends[p.list] || p.page < ends[p.list].page;
  const games = db.games ?? {};
  // Les 2 premières pages « à venir » à chaque fois (annonces récentes), puis la suite de la rotation.
  const count = Object.keys(games).length < 1000 ? 25 : 6;
  let cursor = Number.isInteger(db.cursor) ? db.cursor % lists.length : 0;
  const todo = [lists[0], lists[1]].filter(exists);
  for (let tries = 0; todo.length < count + 2 && tries < lists.length; tries++) {
    if (exists(lists[cursor]) && !todo.includes(lists[cursor])) todo.push(lists[cursor]);
    cursor = (cursor + 1) % lists.length;
  }
  let fetched = 0;
  for (const p of todo) {
    if (!exists(p)) continue;
    try {
      const data = await get(`${RAWG_BASE}/api/games?key=${encodeURIComponent(RAWG_KEY)}&page_size=40&${p.query}`);
      for (const g of data?.results ?? []) {
        if (!g?.name || !Number.isInteger(g.id)) continue;
        games[`rawg-${g.id}`] = {
          id: `rawg-${g.id}`,
          title: clean(g.name, 120),
          date: /^\d{4}-\d{2}-\d{2}$/.test(g.released ?? "") ? g.released : undefined,
          platforms: platformLabels((g.platforms ?? []).map((p) => p?.platform?.name ?? "")),
          image: smallImage(httpsUrl(g.background_image)),
          url: httpsUrl(`https://rawg.io/games/${g.slug}`),
          rating: typeof g.metacritic === "number" ? g.metacritic : undefined,
          added: Number.isInteger(g.added) ? g.added : 0,
          seen: now.toISOString().slice(0, 10),
        };
        fetched++;
      }
      if (!data?.next) ends[p.list] = { page: p.page + 1, at: ymd(now) };
    } catch (err) {
      if (err.message === "HTTP 404") ends[p.list] = { page: Math.min(p.page, ends[p.list]?.page ?? Infinity), at: ymd(now) };
      else console.log(`[recherche] page RAWG indisponible (${err.message})`);
    }
  }
  // Oublie les jeux qui ne sont plus dans aucune liste depuis longtemps, garde les plus suivis.
  const limit = ymd(new Date(now.getTime() - SEARCH_DB_KEEP_DAYS * 86_400_000));
  const kept = Object.values(games)
    .filter((g) => (g.seen ?? "") >= limit)
    .sort((a, b) => (b.added ?? 0) - (a.added ?? 0))
    .slice(0, SEARCH_DB_MAX);
  const next = { cursor, ends, games: Object.fromEntries(kept.map((g) => [g.id, g])) };
  writeFileSync(`${SEARCH_DB_FILE}.tmp`, JSON.stringify(next));
  renameSync(`${SEARCH_DB_FILE}.tmp`, SEARCH_DB_FILE);
  console.log(`[recherche] base de jeux : ${kept.length} jeux (${fetched} mis à jour ce build)`);
  return kept;
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
  let searchGames = [];
  try {
    searchGames = await searchDatabase();
  } catch (err) {
    console.log(`[recherche] base de jeux indisponible (${err.message})`);
  }
  const { images, videos } = await releaseMedia();
  let anticipated = [];
  if (RAWG_KEY) {
    try {
      anticipated = await anticipatedFromRawg();
      console.log(`[sorties] jeux les plus attendus (RAWG) : ${anticipated.map((g) => g.title).join(", ") || "aucun"}`);
    } catch (err) {
      console.log(`[sorties] jeux attendus indisponibles (${err.message})`);
    }
  }
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
    anticipated,
    database,
    searchGames: searchGames.map((g) => ({ id: g.id, title: g.title, date: g.date, platforms: g.platforms, image: g.image, url: g.url, rating: g.rating })),
    consolePhotos: photos,
  };
  writeFileSync(`${OUT_FILE}.tmp`, JSON.stringify(result));
  renameSync(`${OUT_FILE}.tmp`, OUT_FILE);
}

main().catch((err) => console.error(`[sorties] erreur inattendue : ${err.message}`));
