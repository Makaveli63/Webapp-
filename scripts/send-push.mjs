// Notifications web (OneSignal), envoyées juste après la publication du site.
// Usage : ONESIGNAL_API_KEY=… node scripts/send-push.mjs   (sans clé : ne fait rien)
//
// - Nouvelles actus : 3 au plus par mise à jour (les tests d'abord), publiées depuis moins de 3 h.
// - Jeu du jour : un rappel vers 11 h (heure de Paris).
// - Grosses sorties : la veille, vers 18 h.
// Ciblage par le tag « gb » = « plateformes|options » écrit par le site (src/lib/push.ts).
// État (articles déjà annoncés) dans .cache/news/push-state.json, conservé d'une exécution à l'autre.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const KEY = process.env.ONESIGNAL_API_KEY?.trim();
const APP_ID = process.env.ONESIGNAL_APP_ID?.trim() || "a643844e-4e4c-4653-8d05-0dd407d79f8f";
const API = process.env.ONESIGNAL_API?.trim() || "https://api.onesignal.com"; // remplaçable pour les tests
const SITE = (process.env.SITE_URL?.trim() || "https://makaveli63.github.io/Webapp-").replace(/\/+$/, "");
const CACHE_DIR = path.resolve(".cache/news");
const STATE_FILE = path.join(CACHE_DIR, "push-state.json");
const MAX_ARTICLES = 3;
const FRESH_MS = 3 * 3600_000;

const PLATS = ["pc", "ps5", "switch2", "xbox"];
const FLAGS = ["a", "d", "s"];
const PLATFORM_CODE = { PC: "pc", PS5: "ps5", "Switch 2": "switch2", Xbox: "xbox" };

/** Toutes les valeurs possibles du tag : 16 combinaisons de plateformes (dont « all ») × 8 d'options. */
const subsets = (items, join) =>
  Array.from({ length: 2 ** items.length }, (_, m) => items.filter((_, i) => m & (1 << i)).join(join));
const PLAT_VALUES = subsets(PLATS, "+").map((s) => s || "all");
const FLAG_VALUES = subsets(FLAGS, "").map((s) => s || "-");

/** Filtres OneSignal (tag gb = v1 OU v2 …) pour les abonnés qui acceptent ces plateformes et ces options. */
export function audience({ platforms = [], flag } = {}) {
  const codes = platforms.map((p) => PLATFORM_CODE[p]).filter(Boolean);
  const generic = !codes.length || platforms.includes("Multi");
  // Actu toutes plateformes, sans option : tous les abonnés (OneSignal limite le nombre de filtres à 200).
  if (generic && !flag) return [{ field: "tag", key: "gb", relation: "exists" }];
  const plats = PLAT_VALUES.filter((v) => v === "all" || generic || codes.some((c) => v.split("+").includes(c)));
  const flags = FLAG_VALUES.filter((v) => !flag || v.includes(flag));
  const values = new Set(plats.flatMap((p) => flags.map((f) => `${p}|${f}`)));
  const others = PLAT_VALUES.flatMap((p) => FLAG_VALUES.map((f) => `${p}|${f}`)).filter((v) => !values.has(v));
  // La liste la plus courte : « gb = v1 OU v2 … », ou « gb existe ET gb ≠ x1 ET gb ≠ x2 … » (200 filtres au plus).
  if (others.length < values.size) return [{ field: "tag", key: "gb", relation: "exists" }, ...others.map((value) => ({ field: "tag", key: "gb", relation: "!=", value }))];
  return [...values].flatMap((value, i) => [...(i ? [{ operator: "OR" }] : []), { field: "tag", key: "gb", relation: "=", value }]);
}

const parisHour = (d = new Date()) => Number(new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", hourCycle: "h23", timeZone: "Europe/Paris" }).format(d));
const parisDay = (d = new Date()) => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris" }).format(d);
const readJson = (file, fallback) => {
  try {
    return JSON.parse(readFileSync(file, "utf8"));
  } catch {
    return fallback;
  }
};
const cut = (s, n) => (s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s);

async function send({ title, body, url, image, filters, topic }) {
  const res = await fetch(`${API}/notifications?c=push`, {
    method: "POST",
    headers: { Authorization: `Key ${KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      app_id: APP_ID,
      target_channel: "push",
      headings: { en: title, fr: title },
      contents: { en: body, fr: body },
      url,
      ...(image ? { chrome_web_image: image } : {}),
      web_push_topic: topic,
      filters,
    }),
    signal: AbortSignal.timeout(20_000),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.errors) throw new Error(`HTTP ${res.status} ${JSON.stringify(data.errors ?? data).slice(0, 200)}`);
  return data.id ? "envoyée" : "aucun abonné concerné";
}

async function adminReleases() {
  const url = process.env.SUPABASE_URL?.trim().replace(/\/+$/, "").replace(/\/rest\/v1$/, "");
  const key = process.env.SUPABASE_ANON_KEY?.trim();
  if (!url || !key) return [];
  try {
    const res = await fetch(`${url}/rest/v1/rpc/get_admin_releases`, {
      method: "POST",
      headers: { apikey: key, ...(key.startsWith("eyJ") ? { Authorization: `Bearer ${key}` } : {}), "Content-Type": "application/json" },
      body: "{}",
      signal: AbortSignal.timeout(15_000),
    });
    return res.ok ? await res.json() : [];
  } catch {
    return [];
  }
}

async function main() {
  if (!KEY) return console.log("[push] ONESIGNAL_API_KEY absente : notifications web désactivées.");
  const articles = readJson(path.join(CACHE_DIR, "archive.json"), []);
  const state = readJson(STATE_FILE, null);
  const now = Date.now();
  const next = { sent: state?.sent ?? [], daily: state?.daily ?? "", releases: state?.releases ?? [] };
  const jobs = [];

  if (!state) {
    // Première exécution : on retient l'existant sans rien envoyer (pas de rafale d'anciennes actus).
    next.sent = articles.map((a) => a.slug);
    console.log(`[push] première exécution : ${next.sent.length} articles déjà connus, rien n'est envoyé.`);
  } else {
    const known = new Set(next.sent);
    const fresh = articles.filter((a) => a?.slug && !known.has(a.slug) && now - Date.parse(a.publishedAt) < FRESH_MS);
    for (const a of fresh) next.sent.push(a.slug);
    const picked = fresh.sort((x, y) => (y.category === "Test") - (x.category === "Test") || y.publishedAt.localeCompare(x.publishedAt)).slice(0, MAX_ARTICLES);
    for (const a of picked) {
      const anime = a.category === "Anime";
      jobs.push({
        label: a.title,
        title: anime ? "🌸 Anime" : a.category === "Test" ? `⭐ Test${a.score ? ` · ${a.score}` : ""}` : `🎮 ${(a.platforms ?? []).filter((p) => p !== "Multi").join(" · ") || "Actu jeu vidéo"}`,
        body: cut(a.title, 140),
        url: `${SITE}/actualites/${a.slug}/`,
        image: a.image?.startsWith("https://") ? a.image : undefined,
        filters: anime ? audience({ flag: "a" }) : audience({ platforms: a.platforms }),
        topic: `article-${a.slug.slice(0, 40)}`,
      });
    }
  }

  const today = parisDay();
  const hour = parisHour();
  if (state && hour === 11 && next.daily !== today) {
    next.daily = today;
    jobs.push({ label: "jeu du jour", title: "🧩 Jeu du jour", body: "Le jeu mystère d'aujourd'hui t'attend. Sauras-tu le deviner ?", url: `${SITE}/jeu-du-jour/`, filters: audience({ flag: "d" }), topic: "daily" });
  }

  if (state && hour === 18) {
    const tomorrow = parisDay(new Date(now + 86_400_000));
    const releases = [...readJson("src/data/releases.json", []), ...(await adminReleases())];
    for (const r of releases.filter((r) => r?.date === tomorrow && !next.releases.includes(`${r.id}@${r.date}`)).slice(0, 3)) {
      next.releases.push(`${r.id}@${r.date}`);
      jobs.push({
        label: r.title,
        title: "🚀 Sortie demain",
        body: `${r.short ?? r.title}${r.platforms?.length ? ` sur ${r.platforms.join(", ")}` : ""}`,
        url: `${SITE}/sorties/`,
        image: r.image?.startsWith("https://") ? r.image : undefined,
        filters: audience({ platforms: r.platforms, flag: "s" }),
        topic: `release-${r.id}`,
      });
    }
  }

  for (const job of jobs) {
    try {
      console.log(`[push] ${job.label} : ${await send(job)}`);
    } catch (err) {
      console.log(`[push] ${job.label} : échec (${err.message})`);
    }
  }
  if (!jobs.length && state) console.log("[push] rien de nouveau à annoncer.");

  next.sent = next.sent.slice(-3000);
  next.releases = next.releases.slice(-200);
  if (!existsSync(CACHE_DIR)) mkdirSync(CACHE_DIR, { recursive: true });
  writeFileSync(STATE_FILE, JSON.stringify(next));
}

if (import.meta.url === `file://${process.argv[1]}`) await main();
