import "server-only";
import fs from "node:fs";
import path from "node:path";
import type { Article, Deal, DealsData } from "@/types";

/** Écrit par scripts/fetch-deals.mjs (`npm run news`) avant le build. */
const FILE = path.join(process.cwd(), ".cache", "news", "deals.json");

const isDeal = (d: unknown): d is Deal => {
  const x = d as Deal;
  return !!x && typeof x.id === "string" && typeof x.title === "string" && typeof x.url === "string" && x.url.startsWith("https://");
};

export function getDeals(): DealsData {
  try {
    const data = JSON.parse(fs.readFileSync(FILE, "utf8")) as Partial<DealsData>;
    return { updatedAt: data.updatedAt, steam: Array.isArray(data.steam) ? data.steam.filter(isDeal) : [] };
  } catch {
    return { steam: [] };
  }
}

const PROMO = /\b(promos?|promotions?|soldes|r[ée]ductions?|bons? plans?|prix (cass|bas)|black friday|french days|days of play|offres?)\b/i;

/** Articles « promotions » des sites d'actu (PlayStation Store, eShop, Xbox…). */
export function promoArticles(articles: Article[]): Article[] {
  return articles.filter((a) => PROMO.test(a.title));
}
