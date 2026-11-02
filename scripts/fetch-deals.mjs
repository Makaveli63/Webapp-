// Promos du moment et calendriers des grosses sorties, écrits avant le build.
// - Promos PC : données publiques de la boutique Steam (prix en euros, France) → .cache/news/deals.json
// - Promos consoles : données publiques des boutiques PlayStation Store, Xbox et eShop Nintendo (France).
//   Une boutique qui refuse l'accès (403…) est simplement laissée de côté jusqu'à la mise à jour suivante.
// - Calendrier : un fichier .ics par grosse sortie → public/calendrier/<id>.ics (ajout au calendrier du téléphone)
// Ne bloque jamais la publication.
import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import path from "node:path";

const OUT_FILE = path.resolve(".cache/news/deals.json");
const ICS_DIR = path.resolve("public/calendrier");
const STEAM_URL = process.env.STEAM_DEALS_URL || "https://store.steampowered.com/api/featuredcategories?cc=fr&l=french";
const SITE = "https://makaveli63.github.io/Webapp-";

function clean(text, max) {
  const t = String(text ?? "").replace(/\s+/g, " ").trim();
  return t.length > max ? `${t.slice(0, max - 1).trimEnd()}…` : t;
}

function writeJson(file, data) {
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(`${file}.tmp`, JSON.stringify(data));
  renameSync(`${file}.tmp`, file);
}

const euros = (cents) => (Number.isFinite(cents) ? `${(cents / 100).toFixed(2).replace(".", ",")} €` : undefined);

async function steamDeals() {
  const res = await fetch(STEAM_URL, {
    headers: { "User-Agent": "GamingBase/1.0 (promos)", Accept: "application/json" },
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  const items = Array.isArray(data?.specials?.items) ? data.specials.items : [];
  const seen = new Set();
  return items
    .filter((i) => Number.isInteger(i?.id) && i.discounted && i.discount_percent > 0 && i.name && !seen.has(i.id) && seen.add(i.id))
    .map((i) => ({
      id: `steam-${i.id}`,
      title: clean(i.name, 120),
      store: "Steam",
      discount: Math.min(99, Math.max(1, Math.round(i.discount_percent))),
      price: euros(i.final_price),
      oldPrice: euros(i.original_price),
      image: typeof i.large_capsule_image === "string" && i.large_capsule_image.startsWith("https://") ? i.large_capsule_image
        : typeof i.header_image === "string" && i.header_image.startsWith("https://") ? i.header_image : undefined,
      url: `https://store.steampowered.com/app/${i.id}/`,
      until: Number.isFinite(i.discount_expiration) ? new Date(i.discount_expiration * 1000).toISOString() : undefined,
    }))
    .sort((a, b) => b.discount - a.discount)
    .slice(0, 24);
}

// ---------- Consoles ----------

const UA = { "User-Agent": "GamingBase/1.0 (promos)", "Accept-Language": "fr-FR,fr;q=0.9" };
const DEBUG = !!process.env.DEALS_DEBUG;
const MAX = 24;

async function getJson(url, headers = {}) {
  const res = await fetch(url, { headers: { ...UA, Accept: "application/json", ...headers }, signal: AbortSignal.timeout(20_000) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}
async function getText(url) {
  const res = await fetch(url, { headers: { ...UA, Accept: "text/html" }, signal: AbortSignal.timeout(20_000) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
}
const https = (u) => (typeof u !== "string" || !u ? undefined : u.startsWith("//") ? `https:${u}` : u.startsWith("https://") ? u : undefined);
const pct = (now, before) => (before > 0 && now < before ? Math.round((1 - now / before) * 100) : 0);
const eur = (n) => (Number.isFinite(n) ? `${n.toFixed(2).replace(".", ",")} €` : undefined);
const slug = (t) => t.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "jeu";
const dedupe = (list) => {
  const seen = new Set();
  return list.filter((d) => d.title && d.discount > 0 && !seen.has(d.title.toLowerCase()) && seen.add(d.title.toLowerCase()));
};
/** Objet JSON qui commence à `from` dans un texte (accolades équilibrées, chaînes comprises). */
function jsonAt(text, from) {
  const start = text.indexOf("{", from);
  if (start < 0) return null;
  let depth = 0;
  let str = false;
  for (let i = start; i < text.length; i++) {
    const c = text[i];
    if (str) {
      if (c === "\\") i++;
      else if (c === '"') str = false;
    } else if (c === '"') str = true;
    else if (c === "{") depth++;
    else if (c === "}" && --depth === 0) return JSON.parse(text.slice(start, i + 1));
  }
  return null;
}
const top = (list) => dedupe(list).sort((a, b) => b.discount - a.discount).slice(0, MAX);

/** eShop Nintendo : moteur de recherche public de nintendo.com (jeux Switch en promo, prix France). */
async function nintendoDeals() {
  const q = new URLSearchParams({
    q: "*",
    fq: 'type:GAME AND price_has_discount_b:true AND system_type:nintendoswitch*',
    sort: "popularity asc",
    rows: "60",
    start: "0",
    wt: "json",
  });
  const data = await getJson(`https://searching.nintendo-europe.com/fr/select?${q}`);
  const docs = Array.isArray(data?.response?.docs) ? data.response.docs : [];
  if (DEBUG) console.log("[promos:debug] nintendo", JSON.stringify(docs[0] ?? data).slice(0, 1500));
  return top(
    docs.map((d) => {
      const now = Number(d.price_lowest_f ?? d.price_discounted_f);
      const before = Number(d.price_regular_f);
      const url = typeof d.url === "string" && d.url.startsWith("/") ? `https://www.nintendo.com${d.url.startsWith("/fr-fr/") ? "" : "/fr-fr"}${d.url}` : undefined;
      return {
        id: `nintendo-${d.fs_id ?? d.nsuid_txt?.[0] ?? slug(String(d.title ?? ""))}`,
        title: clean(d.title, 120),
        store: "eShop Nintendo",
        discount: Math.min(99, Math.round(Number(d.price_discount_percentage_f) || pct(now, before))),
        price: eur(now),
        oldPrice: eur(before),
        image: https(d.wishlist_email_banner640w_image_url_s) ?? https(d.image_url_h2x1_s) ?? https(d.image_url),
        url: url ?? "https://www.nintendo.com/fr-fr/Rechercher/Rechercher-299117.html",
      };
    }).filter((d) => d.discount > 0 && d.price),
  );
}

/** Xbox : page publique « Jeux en promotion » de xbox.com (les données des jeux sont dans la page). */
async function xboxBrowseDeals() {
  const html = await getText("https://www.xbox.com/fr-FR/games/browse/DynamicChannel.GameDeals");
  const at = html.indexOf("__PRELOADED_STATE__");
  if (DEBUG) console.log("[promos:debug] xbox page", html.length, at);
  if (at < 0) return [];
  const state = jsonAt(html, at);
  const summaries = state?.core2?.products?.productSummaries ?? {};
  const list = Object.values(summaries);
  if (DEBUG) console.log("[promos:debug] xbox produit", list.length, JSON.stringify({ k: Object.keys(list[0] ?? {}), sp: list[0]?.specificPrices, img: list[0]?.images, t: list[0]?.title, id: list[0]?.productId }).slice(0, 2500));
  return top(
    list
      .map((p) => {
        const offers = (p?.specificPrices?.purchaseable ?? []).filter((o) => o?.listPrice < o?.msrp && !o?.eligibilityInfo);
        const o = offers.sort((a, b) => a.listPrice - b.listPrice)[0];
        if (!o || !p?.title || !p?.productId) return null;
        const end = Date.parse(o.endDate);
        return {
          id: `xbox-${p.productId}`,
          title: clean(p.title, 120),
          store: "Xbox",
          discount: Math.min(99, Math.round(o.discountPercentage || pct(o.listPrice, o.msrp))),
          price: eur(o.listPrice),
          oldPrice: eur(o.msrp),
          image: https(p?.images?.superHeroArt?.url) ?? https(p?.images?.boxArt?.url) ?? https(p?.images?.poster?.url),
          url: `https://www.xbox.com/fr-FR/games/store/${slug(p.title)}/${p.productId}`,
          until: Number.isFinite(end) && end < Date.now() + 365 * 86_400_000 ? new Date(end).toISOString() : undefined,
        };
      })
      .filter(Boolean),
  );
}

/** Xbox : liste publique « Promotions » du Microsoft Store, puis fiches (titre, image, prix) par lots de 20. */
async function xboxDeals() {
  try {
    const fromPage = await xboxBrowseDeals();
    if (fromPage.length) return fromPage;
  } catch (err) {
    if (DEBUG) console.log(`[promos:debug] xbox page : ${err.message}`);
  }
  const list = await getJson(
    "https://reco-public.rec.mp.microsoft.com/channels/Reco/V8.0/Lists/Computed/Deal?Market=FR&Language=fr&ItemTypes=Game&deviceFamily=Windows.Xbox&count=100&skipitems=0",
  );
  const ids = (list?.Items ?? []).map((i) => i?.Id).filter((id) => typeof id === "string" && /^[A-Z0-9]{12}$/.test(id));
  if (DEBUG) console.log("[promos:debug] xbox ids", ids.length, JSON.stringify(list).slice(0, 400));
  const out = [];
  for (let i = 0; i < ids.length && out.length < 60; i += 20) {
    const data = await getJson(
      `https://displaycatalog.mp.microsoft.com/v7.0/products?bigIds=${ids.slice(i, i + 20).join(",")}&market=FR&languages=fr-fr,fr,neutral`,
    );
    for (const p of data?.Products ?? []) {
      const title = clean(p?.LocalizedProperties?.[0]?.ProductTitle, 120);
      const images = p?.LocalizedProperties?.[0]?.Images ?? [];
      const pick = (purpose) => https(images.find((im) => im?.ImagePurpose === purpose)?.Uri);
      // Prix public (sans abonnement requis) le plus bas parmi les offres d'achat.
      let best = null;
      for (const sku of p?.DisplaySkuAvailabilities ?? []) {
        for (const a of sku?.Availabilities ?? []) {
          const price = a?.OrderManagementData?.Price;
          if (!a?.Actions?.includes("Purchase") || a?.RemediationRequired || !price) continue;
          if (price.CurrencyCode !== "EUR" || !(price.ListPrice < price.MSRP)) continue;
          if (!best || price.ListPrice < best.price.ListPrice) best = { price, end: a?.Conditions?.EndDate };
        }
      }
      if (!title || !best) continue;
      const end = Date.parse(best.end);
      out.push({
        id: `xbox-${p.ProductId}`,
        title,
        store: "Xbox",
        discount: Math.min(99, pct(best.price.ListPrice, best.price.MSRP)),
        price: eur(best.price.ListPrice),
        oldPrice: eur(best.price.MSRP),
        image: pick("SuperHeroArt") ?? pick("TitledHeroArt") ?? pick("BoxArt") ?? pick("Poster"),
        url: `https://www.xbox.com/fr-FR/games/store/${slug(title)}/${p.ProductId}`,
        until: Number.isFinite(end) && end < Date.now() + 365 * 86_400_000 ? new Date(end).toISOString() : undefined,
      });
    }
  }
  return top(out);
}

/** PlayStation Store : la page publique des offres contient les données des jeux (prix, image, fin de l'offre). */
async function playstationDeals() {
  const base = "https://store.playstation.com/fr-fr";
  const page = await getText(`${base}/pages/deals`);
  // Catégorie « Toutes les offres » connue, plus celles citées par la page.
  const cats = [...new Set(["3f772501-f6f8-49b7-abac-874a88ca4897", ...[...page.matchAll(/category\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/g)].map((m) => m[1])])];
  if (DEBUG) console.log("[promos:debug] ps page", page.length, (page.match(/<script/g) ?? []).length, "scripts", cats.slice(0, 8), page.slice(0, 300).replace(/\s+/g, " "));
  const found = new Map();
  const walk = (node) => {
    if (!node || typeof node !== "object") return;
    if (Array.isArray(node)) return node.forEach(walk);
    const price = node.price;
    if (typeof node.name === "string" && price && typeof price === "object" && price.discountedPrice && price.basePrice) {
      const num = (s) => Number(String(s).replace(/[^\d,]/g, "").replace(",", "."));
      const now = num(price.discountedPrice);
      const before = num(price.basePrice);
      const media = Array.isArray(node.media) ? node.media : [];
      const img = media.find((m) => m?.role === "MASTER") ?? media.find((m) => m?.role === "GAMEHUB_COVER_ART") ?? media.find((m) => m?.type === "IMAGE");
      const end = Number(price.endTime);
      const discount = pct(now, before);
      if (discount > 0 && node.id && !price.isTiedToSubscription)
        found.set(node.id, {
          id: `ps-${node.id}`,
          title: clean(node.name, 120),
          store: "PlayStation Store",
          discount: Math.min(99, discount),
          price: eur(now),
          oldPrice: eur(before),
          image: https(img?.url),
          url: `${base}/${node.__typename === "Concept" ? "concept" : "product"}/${node.id}`,
          until: Number.isFinite(end) && end > Date.now() ? new Date(end).toISOString() : undefined,
        });
    }
    for (const v of Object.values(node)) walk(v);
  };
  const scan = (html) => {
    for (const m of html.matchAll(/<script[^>]*(?:type="application\/json"|id="__NEXT_DATA__")[^>]*>([\s\S]*?)<\/script>/g)) {
      try {
        walk(JSON.parse(m[1]));
      } catch {}
    }
  };
  scan(page);
  // Grille d'une catégorie : requête publique de la boutique (celle de son site).
  for (const hash of ["4ce7d410a4db2c8b635a48c1dcec375906ff63b19dadd87e073f8fd0c0481d35", "257713466fc3264850aa473409a29088e3a4115e6e69e9fb3e061c8dd5b9f5c6"]) {
    if (found.size) break;
    for (let offset = 0; offset < 96; offset += 48) {
      const variables = { id: cats[0], pageArgs: { size: 48, offset }, sortBy: null, filterBy: [], facetOptions: [] };
      const q = new URLSearchParams({
        operationName: "categoryGridRetrieve",
        variables: JSON.stringify(variables),
        extensions: JSON.stringify({ persistedQuery: { version: 1, sha256Hash: hash } }),
      });
      try {
        const data = await getJson(`https://web.np.playstation.com/api/graphql/v1/op?${q}`, { "x-psn-store-locale-override": "fr-FR", "content-type": "application/json" });
        const before = found.size;
        walk(data);
        if (DEBUG) console.log(`[promos:debug] ps graphql ${hash.slice(0, 6)} +${offset} : ${found.size - before} jeux`, found.size === before ? JSON.stringify(data).slice(0, 400) : "");
        if (found.size === before) break;
      } catch (err) {
        if (DEBUG) console.log(`[promos:debug] ps graphql ${hash.slice(0, 6)} : ${err.message}`);
        break;
      }
    }
  }
  for (const id of cats.slice(0, 3)) {
    if (found.size >= 60) break;
    try {
      const html = await getText(`${base}/category/${id}/1`);
      const before = found.size;
      scan(html);
      if (DEBUG) {
        const i = html.indexOf("discountedPrice");
        console.log(`[promos:debug] ps category ${id} : ${html.length} car., ${found.size - before} jeux, prix à ${i}`, i > 0 ? html.slice(Math.max(0, i - 600), i + 200) : "");
      }
    } catch (err) {
      if (DEBUG) console.log(`[promos:debug] ps category ${id} : ${err.message}`);
    }
  }
  return top([...found.values()]);
}

// ---------- Calendriers (.ics) ----------

const icsText = (s) => String(s).replace(/[\;,]/g, (c) => `\\${c}`).replace(/\r?\n/g, "\\n");
const ymd = (date) => date.replaceAll("-", "");

function nextDay(date) {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10).replaceAll("-", "");
}

function releaseIcs(r) {
  const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d+Z$/, "Z");
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//GamingBase//Sorties//FR",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${r.id}@gamingbase`,
    `DTSTAMP:${stamp}`,
    `DTSTART;VALUE=DATE:${ymd(r.date)}`,
    `DTEND;VALUE=DATE:${nextDay(r.date)}`,
    `SUMMARY:${icsText(`🎮 Sortie : ${r.title}`)}`,
    `DESCRIPTION:${icsText(`${r.title} sort aujourd'hui (${(r.platforms ?? []).join(", ")}).\nCompte à rebours : ${SITE}/sorties/`)}`,
    `URL:${SITE}/sorties/`,
    "BEGIN:VALARM",
    "ACTION:DISPLAY",
    `DESCRIPTION:${icsText(`${r.title} sort demain !`)}`,
    "TRIGGER:-PT12H",
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
    "",
  ].join("\r\n");
}

function writeCalendars() {
  const releases = JSON.parse(readFileSync("src/data/releases.json", "utf8"));
  mkdirSync(ICS_DIR, { recursive: true });
  let n = 0;
  for (const r of releases) {
    if (!/^[a-z0-9-]{1,80}$/.test(r?.id ?? "") || !/^\d{4}-\d{2}-\d{2}$/.test(r?.date ?? "")) continue;
    writeFileSync(path.join(ICS_DIR, `${r.id}.ics`), releaseIcs(r));
    n++;
  }
  console.log(`[calendrier] ${n} fichier(s) .ics`);
}

async function main() {
  try {
    writeCalendars();
  } catch (err) {
    console.log(`[calendrier] échec (${err.message})`);
  }
  let steam = [];
  try {
    steam = await steamDeals();
    console.log(`[promos] Steam : ${steam.length} jeux en promo`);
  } catch (err) {
    console.log(`[promos] Steam indisponible (${err.message})`);
  }
  const consoles = {};
  for (const [name, label, fn] of [
    ["playstation", "PlayStation Store", playstationDeals],
    ["xbox", "Xbox", xboxDeals],
    ["nintendo", "eShop Nintendo", nintendoDeals],
  ]) {
    try {
      consoles[name] = await fn();
      console.log(`[promos] ${label} : ${consoles[name].length} jeux en promo`);
      if (DEBUG) console.log(JSON.stringify(consoles[name].slice(0, 2)));
    } catch (err) {
      consoles[name] = [];
      console.log(`[promos] ${label} indisponible (${err.message})`);
    }
  }
  writeJson(OUT_FILE, { updatedAt: new Date().toISOString(), steam, ...consoles });
}

main().catch((err) => console.error(`[promos] erreur inattendue : ${err.message}`));
