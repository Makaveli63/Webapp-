"use client";

import type { SearchIndex } from "@/types";

const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
let pending: Promise<SearchIndex> | null = null;

/** Index de recherche (/recherche-index.json), téléchargé une seule fois puis partagé. */
export function loadSearchIndex(): Promise<SearchIndex> {
  pending ??= fetch(`${BASE_PATH}/recherche-index.json`).then((r) => {
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.json() as Promise<SearchIndex>;
  });
  pending.catch(() => (pending = null)); // nouvel essai possible après une erreur
  return pending;
}
