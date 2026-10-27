import "server-only";
import Parser from "rss-parser";
import { DEFAULT_FEEDS, type Feed } from "@/data/feeds";
import { mockArticles } from "@/data/news";
import type { Article, Platform } from "@/types";

const MAX_ITEMS_PER_FEED = 25;
const MAX_FEED_BYTES = 5 * 1024 * 1024;
const MAX_AGE_DAYS = 30;

function getFeeds(): Feed[] {
  const env = (process.env.RSS_FEEDS ?? "").trim();
  if (!env) return DEFAULT_FEEDS;
  return env
    .split(",")
    .map((entry) => entry.split("|").map((s) => s.trim()))
    .filter(([name, url]) => name && url)
    .map(([name, url]) => ({ name, url }));
}

const PLATFORM_KEYWORDS: [Platform, RegExp][] = [
  ["PS5", /\b(ps5|playstation 5|playstation)\b/i],
  ["Switch 2", /\bswitch\s?2\b|\bnintendo\b/i],
  ["Xbox", /\bxbox\b/i],
  ["PC", /\b(pc|steam|epic games)\b/i],
  ["Mobile", /\b(ios|android|mobile)\b/i],
];

/** Articles qui concernent la scène homebrew / sécurité. */
export const SCENE_TAG = "Scène";
const SCENE_KEYWORDS =
  /\b(hack|hacks|hacker|jailbreak|homebrew|exploit|exploits|faille|failles|cfw|custom firmware|modchip|kernel|vulnérabilité|bug bounty)\b/i;

function detectPlatforms(text: string): Platform[] {
  const found = PLATFORM_KEYWORDS.filter(([, re]) => re.test(text)).map(([p]) => p);
  return found.length ? found : ["Multi"];
}

function slugify(s: string) {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 80);
}

/** N'accepte que les liens http(s) : un flux piégé ne doit pas pouvoir injecter de lien javascript:. */
function safeUrl(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  try {
    const url = new URL(raw.trim());
    return url.protocol === "https:" || url.protocol === "http:" ? url.href : undefined;
  } catch {
    return undefined;
  }
}

/** Lit la réponse en refusant les flux anormalement volumineux. */
async function readLimited(res: Response): Promise<string> {
  const declared = Number(res.headers.get("content-length") ?? 0);
  if (declared > MAX_FEED_BYTES) throw new Error("flux trop volumineux");
  const body = await res.arrayBuffer();
  if (body.byteLength > MAX_FEED_BYTES) throw new Error("flux trop volumineux");
  return new TextDecoder().decode(body);
}

/** Date ISO valide et jamais dans le futur (un flux ne doit pas pouvoir s'épingler en tête). */
function validDate(iso: string | undefined): string {
  const t = iso ? Date.parse(iso) : NaN;
  return new Date(Number.isNaN(t) ? Date.now() : Math.min(t, Date.now())).toISOString();
}

function clean(text: string, max: number) {
  const t = text.replace(/\s+/g, " ").trim();
  return t.length > max ? `${t.slice(0, max - 1).trimEnd()}…` : t;
}

async function fetchFeed(feed: Feed): Promise<Article[]> {
  const res = await fetch(feed.url, {
    headers: { "User-Agent": "PixelUnderground/1.0 (agrégateur RSS)" },
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const parsed = await new Parser().parseString(await readLimited(res));
  const minDate = Date.now() - MAX_AGE_DAYS * 86_400_000;

  return parsed.items
    .map((item) => ({ item, link: safeUrl(item.link) }))
    .filter(({ item, link }) => item.title && link)
    .slice(0, MAX_ITEMS_PER_FEED)
    .map(({ item, link }): Article => {
      const title = clean(item.title!, 200);
      const excerpt = clean(item.contentSnippet ?? "", 220);
      const text = `${title} ${excerpt}`;
      const categories = (item.categories ?? []).filter((c): c is string => typeof c === "string");
      const tags = categories.slice(0, 3);
      if (SCENE_KEYWORDS.test(text)) tags.unshift(SCENE_TAG);
      return {
        slug: `rss-${slugify(feed.name)}-${slugify(title)}`,
        title,
        excerpt,
        content: excerpt,
        platforms: detectPlatforms(text),
        tags,
        author: clean(item.creator ?? feed.name, 80),
        publishedAt: validDate(item.isoDate),
        source: { name: feed.name, url: link },
        external: true,
      };
    })
    .filter((a) => Date.parse(a.publishedAt) >= minDate);
}

let cache: Promise<Article[]> | undefined;

/**
 * Articles des flux RSS, triés du plus récent au plus ancien (récupérés une fois par build).
 * Les articles de démonstration ne servent que si aucun flux n'a répondu.
 */
export function getArticles(): Promise<Article[]> {
  cache ??= (async () => {
    const feeds = getFeeds();
    const results = await Promise.allSettled(feeds.map(fetchFeed));
    results.forEach((r, i) =>
      console.log(
        `[rss] ${feeds[i].name}: ${r.status === "fulfilled" ? `${r.value.length} articles` : `échec (${(r.reason as Error).message})`}`,
      ),
    );
    const external = results.flatMap((r) => (r.status === "fulfilled" ? r.value : []));
    const seen = new Set<string>();
    return (external.length ? external : mockArticles)
      .filter((a) => !seen.has(a.slug) && seen.add(a.slug))
      .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
  })();
  return cache;
}
