import "server-only";
import Parser from "rss-parser";
import { mockArticles } from "@/data/news";
import type { Article, Platform } from "@/types";

/**
 * Flux RSS francophones à agréger, configurables via la variable
 * d'environnement RSS_FEEDS (format : "Nom|URL,Nom|URL").
 * Sans configuration, seuls les articles locaux sont affichés.
 */
function getFeeds(): { name: string; url: string }[] {
  return (process.env.RSS_FEEDS ?? "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const [name, url] = entry.split("|");
      return { name: name.trim(), url: url.trim() };
    });
}

const PLATFORM_KEYWORDS: [Platform, RegExp][] = [
  ["PS5", /\b(ps5|playstation 5|playstation)\b/i],
  ["Switch 2", /\bswitch\s?2\b|\bnintendo\b/i],
  ["Xbox", /\bxbox\b/i],
  ["PC", /\b(pc|steam|epic games)\b/i],
  ["Mobile", /\b(ios|android|mobile)\b/i],
];

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

async function fetchFeed(feed: { name: string; url: string }): Promise<Article[]> {
  const parser = new Parser({ timeout: 5000 });
  const res = await fetch(feed.url, { next: { revalidate: 900 } });
  if (!res.ok) throw new Error(`${feed.name}: HTTP ${res.status}`);
  const parsed = await parser.parseString(await res.text());
  return parsed.items.slice(0, 20).map((item) => {
    const title = item.title ?? "Sans titre";
    const excerpt = (item.contentSnippet ?? "").slice(0, 220);
    return {
      slug: `rss-${slugify(feed.name)}-${slugify(title)}`,
      title,
      excerpt,
      content: excerpt,
      platforms: detectPlatforms(`${title} ${excerpt}`),
      tags: (item.categories ?? []).slice(0, 3),
      author: item.creator ?? feed.name,
      publishedAt: item.isoDate ?? new Date().toISOString(),
      source: { name: feed.name, url: item.link },
      external: true,
    };
  });
}

export async function getArticles(): Promise<Article[]> {
  const results = await Promise.allSettled(getFeeds().map(fetchFeed));
  const external = results.flatMap((r) => (r.status === "fulfilled" ? r.value : []));
  return [...mockArticles, ...external].sort((a, b) =>
    b.publishedAt.localeCompare(a.publishedAt),
  );
}

export async function getArticle(slug: string): Promise<Article | undefined> {
  return (await getArticles()).find((a) => a.slug === slug);
}
