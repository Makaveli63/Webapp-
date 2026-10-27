"use client";

import { MyAnimeTracking } from "@/components/tracker/MyTracking";
import { useTracker } from "@/lib/tracker";

/** « Mon suivi » en haut de l'onglet Anime, seulement si au moins un anime est suivi. */
export function MyAnimeSection() {
  const t = useTracker();
  if (!t || !Object.keys(t.anime).length) return null;
  return (
    <section aria-labelledby="anime-suivi">
      <h2 id="anime-suivi" className="text-xl font-bold text-heading">📋 Mon suivi</h2>
      <p className="mt-1 text-sm text-muted">Tes animes et les épisodes à rattraper. Touche un anime pour cocher tes épisodes.</p>
      <MyAnimeTracking />
    </section>
  );
}
