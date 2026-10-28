// Ajoute à .cache/news/articles.json les articles écrits par l'admin dans le tableau de bord
// (Supabase, fonction publique get_published_articles). Lancé après fetch-news.mjs.
// Sécurité : le HTML brut est neutralisé et seuls les liens https:// ou internes sont gardés.
import { existsSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import path from "node:path";

const FILE = path.resolve(".cache/news/articles.json");
const URL_BASE = (process.env.SUPABASE_URL ?? "").trim().replace(/\/+$/, "").replace(/\/rest\/v1$/, "");
const KEY = (process.env.SUPABASE_ANON_KEY ?? "").trim();
const SITE = "https://makaveli63.github.io/Webapp-";
const PLATFORMS = ["PC", "PS5", "Switch 2", "Xbox", "Mobile", "Multi"];

const slugify = (s) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 80);

/** Texte Markdown sans HTML brut ni lien dangereux (javascript:, data:…). */
function safeMarkdown(md) {
  return String(md)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\]\((?!https:\/\/|\/)[^)]*\)/g, "]()");
}

const plain = (md) => String(md).replace(/[#*_>`\[\]()!-]/g, " ").replace(/\s+/g, " ").trim();

const RELEASES_FILE = path.resolve(".cache/news/admin-releases.json");

/** Grosses sorties ajoutées dans le tableau de bord (fonction publique get_admin_releases, admin.sql). */
async function adminReleases() {
  try {
    const res = await fetch(`${URL_BASE}/rest/v1/rpc/get_admin_releases`, {
      method: "POST",
      headers: { apikey: KEY, ...(KEY.startsWith("eyJ") ? { Authorization: `Bearer ${KEY}` } : {}), "Content-Type": "application/json" },
      body: "{}",
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) return console.log(`[admin] sorties indisponibles (HTTP ${res.status}) — admin.sql exécuté ?`);
    const rows = await res.json();
    const list = (Array.isArray(rows) ? rows : [])
      .filter((r) => r && typeof r.title === "string" && /^\d{4}-\d{2}-\d{2}$/.test(r.date ?? ""))
      .map((r) => ({
        id: `admin-${String(r.id).slice(0, 8)}`,
        title: r.title.slice(0, 120),
        date: r.date,
        platforms: (Array.isArray(r.platforms) ? r.platforms : []).filter((p) => PLATFORMS.includes(p)).slice(0, 5),
        image: typeof r.image === "string" && r.image.startsWith("https://") ? r.image : undefined,
        source: typeof r.source === "string" && r.source.startsWith("https://") ? r.source : `${SITE}/sorties/`,
      }));
    writeFileSync(`${RELEASES_FILE}.tmp`, JSON.stringify(list));
    renameSync(`${RELEASES_FILE}.tmp`, RELEASES_FILE);
    console.log(`[admin] ${list.length} grosse(s) sortie(s) ajoutée(s) dans le tableau de bord.`);
  } catch (err) {
    console.log(`[admin] sorties indisponibles (${err.message})`);
  }
}

async function main() {
  if (!URL_BASE || !KEY) return console.log("[admin] Supabase non configuré : pas d'articles de l'admin.");
  await adminReleases();
  const res = await fetch(`${URL_BASE}/rest/v1/rpc/get_published_articles`, {
    method: "POST",
    headers: { apikey: KEY, ...(KEY.startsWith("eyJ") ? { Authorization: `Bearer ${KEY}` } : {}), "Content-Type": "application/json" },
    body: "{}",
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) return console.log(`[admin] articles indisponibles (HTTP ${res.status}) — community.sql exécuté ?`);
  const rows = await res.json();
  if (!Array.isArray(rows)) return;
  const mine = rows
    .filter((r) => r && typeof r.title === "string" && typeof r.body === "string")
    .map((r) => {
      const excerpt = plain(r.body).slice(0, 220);
      return {
        slug: `gb-${String(r.id).slice(0, 8)}-${slugify(r.title)}`,
        title: r.title.slice(0, 200),
        excerpt,
        content: safeMarkdown(r.body),
        category: ["Actu", "Test", "Console"].includes(r.category) ? r.category : "Actu",
        score: typeof r.score === "string" && /^\d{1,2}([,.]\d)?\/(5|10|20|100)$/.test(r.score) ? r.score.replace(".", ",") : undefined,
        tags: ["GamingBase"],
        platforms: (Array.isArray(r.platforms) ? r.platforms : []).filter((p) => PLATFORMS.includes(p)).slice(0, 4),
        author: "Makaveli63",
        publishedAt: new Date(Date.parse(r.created_at) || Date.now()).toISOString(),
        source: { name: "GamingBase", url: `${SITE}/` },
        image: typeof r.image === "string" && r.image.startsWith("https://") ? r.image : undefined,
        external: false,
      };
    });
  const current = existsSync(FILE) ? JSON.parse(readFileSync(FILE, "utf8")) : [];
  const all = [...mine, ...current.filter((a) => !String(a.slug).startsWith("gb-"))].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
  writeFileSync(`${FILE}.tmp`, JSON.stringify(all));
  renameSync(`${FILE}.tmp`, FILE);
  console.log(`[admin] ${mine.length} article(s) de l'admin`);
}

main().catch((err) => console.log(`[admin] erreur (${err.message})`));
