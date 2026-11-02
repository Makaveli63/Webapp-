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
    const list = (v: unknown) => (Array.isArray(v) ? v.filter(isDeal) : []);
    return { updatedAt: data.updatedAt, steam: list(data.steam), playstation: list(data.playstation), xbox: list(data.xbox), nintendo: list(data.nintendo) };
  } catch {
    return { steam: [], playstation: [], xbox: [], nintendo: [] };
  }
}

/** Toutes les promos, toutes boutiques confondues (bibliothèque, fiches de jeu). */
export function allDeals(d: DealsData = getDeals()): Deal[] {
  return [...d.steam, ...d.playstation, ...d.xbox, ...d.nintendo];
}

const PROMO = /\b(promos?|promotions?|soldes|r[ée]ductions?|bons? plans?|prix (cass|bas)|black friday|french days|days of play|offres?)\b/i;

/** Articles « promotions » des sites d'actu (PlayStation Store, eShop, Xbox…). */
export function promoArticles(articles: Article[]): Article[] {
  return articles.filter((a) => PROMO.test(a.title));
}
