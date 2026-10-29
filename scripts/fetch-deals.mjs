// Promos du moment et calendriers des grosses sorties, écrits avant le build.
// - Promos PC : données publiques de la boutique Steam (prix en euros, France) → .cache/news/deals.json
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
    headers: { "User-Agent": "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)", Accept: "application/json" },
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
  writeJson(OUT_FILE, { updatedAt: new Date().toISOString(), steam });
}

main().catch((err) => console.error(`[promos] erreur inattendue : ${err.message}`));
