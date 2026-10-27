import "server-only";
import Parser from "rss-parser";
import { DEFAULT_FEEDS, type Feed } from "@/data/feeds";
import { mockArticles } from "@/data/news";
import type { Article, Platform } from "@/types";

const MAX_ITEMS_PER_FEED = 25;
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
  const parsed = await new Parser().parseString(await res.text());
  const minDate = Date.now() - MAX_AGE_DAYS * 86_400_000;

  return parsed.items
    .filter((item) => item.title && item.link)
    .slice(0, MAX_ITEMS_PER_FEED)
    .map((item): Article => {
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
        author: item.creator ?? feed.name,
        publishedAt: item.isoDate ?? new Date().toISOString(),
        source: { name: feed.name, url: item.link },
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
