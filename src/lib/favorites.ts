"use client";

import { useEffect, useState } from "react";
import type { Article } from "@/types";

/** Favoris enregistrés sur l'appareil du visiteur (localStorage), sans compte ni serveur. */
const KEY = "gb-favoris";
const EVENT = "gb-favoris-change";

export type FavoriteArticle = Pick<
  Article,
  "slug" | "title" | "excerpt" | "image" | "source" | "category" | "platforms" | "publishedAt" | "tags" | "score"
> & { savedAt: string };

function read(): FavoriteArticle[] {
  try {
    const data = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

function write(list: FavoriteArticle[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(list.slice(0, 300)));
  } catch {
    /* stockage indisponible (navigation privée) */
  }
  window.dispatchEvent(new Event(EVENT));
}

export function toggleFavorite(article: Article) {
  const list = read();
  if (list.some((f) => f.slug === article.slug)) {
    write(list.filter((f) => f.slug !== article.slug));
  } else {
    const { slug, title, excerpt, image, source, category, platforms, publishedAt, tags, score } = article;
    write([{ slug, title, excerpt, image, source, category, platforms, publishedAt, tags, score, savedAt: new Date().toISOString() }, ...list]);
  }
}

/** Liste des favoris, mise à jour en direct (y compris depuis un autre onglet). */
export function useFavorites(): FavoriteArticle[] | null {
  const [list, setList] = useState<FavoriteArticle[] | null>(null);
  useEffect(() => {
    const update = () => setList(read());
    update();
    window.addEventListener(EVENT, update);
    window.addEventListener("storage", update);
    return () => {
      window.removeEventListener(EVENT, update);
      window.removeEventListener("storage", update);
    };
  }, []);
  return list;
}
