import "server-only";
import fs from "node:fs";
import path from "node:path";
import { mockArticles } from "@/data/news";
import { getCalendar } from "@/lib/calendar";
import { themeFor } from "@/lib/themes";
import type { Article, Category } from "@/types";

/** Écrit par `npm run news` (scripts/fetch-news.mjs) avant le build. */
const ARTICLES_FILE = path.join(process.cwd(), ".cache", "news", "articles.json");

function isArticle(a: unknown): a is Article {
  const x = a as Article;
  return !!x && typeof x.slug === "string" && typeof x.title === "string" && Array.isArray(x.platforms);
}

let cache: Article[] | undefined;

/**
 * Articles des flux RSS, du plus récent au plus ancien.
 * Les articles de démonstration ne servent que si aucun flux n'a été récupéré.
 */
export async function getArticles(): Promise<Article[]> {
  if (!cache) {
    let articles: Article[] = [];
    try {
      const data: unknown = JSON.parse(fs.readFileSync(ARTICLES_FILE, "utf8"));
      if (Array.isArray(data)) articles = data.filter(isArticle).map((a) => ({ ...a, category: a.category ?? "Actu" }));
    } catch {
      // fichier absent (développement local sans `npm run news`) : articles de démo
    }
    // Article sans image sur une console précise : vraie photo libre de la console, créditée.
    const photos = getCalendar().consolePhotos;
    cache = (articles.length ? articles : mockArticles).map((a) => {
      if (a.image) return a;
      const photo = photos[themeFor(`${a.title} ${a.tags.join(" ")}`, a.platforms).id];
      return photo ? { ...a, image: photo.url, imageCredit: photo.credit } : a;
    });
  }
  return cache;
}

/** Actu jeu vidéo seulement : l'anime a sa propre rubrique et n'est pas mélangé au reste. */
export async function getGamingArticles(): Promise<Article[]> {
  return (await getArticles()).filter((a) => a.category !== "Anime");
}

export async function getArticlesByCategory(category: Category): Promise<Article[]> {
  return (await getArticles()).filter((a) => a.category === category);
}
