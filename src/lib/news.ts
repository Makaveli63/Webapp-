import "server-only";
import fs from "node:fs";
import path from "node:path";
import { mockArticles } from "@/data/news";
import type { Article } from "@/types";

/** Articles qui concernent la scène homebrew / sécurité. */
export const SCENE_TAG = "Scène";

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
      if (Array.isArray(data)) articles = data.filter(isArticle);
    } catch {
      // fichier absent (développement local sans `npm run news`) : articles de démo
    }
    cache = articles.length ? articles : mockArticles;
  }
  return cache;
}
