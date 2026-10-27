"use client";

import { Check, Heart, X } from "lucide-react";
import { useEffect, useState } from "react";
import { DealCard } from "@/components/deals/DealCard";
import { NewsCard } from "@/components/news/NewsCard";
import { GameProgress } from "@/components/tracker/GameProgress";
import { MyAnimeTracking, MyGameTracking } from "@/components/tracker/MyTracking";
import { RemoteImage } from "@/components/ui/RemoteImage";
import { mentions, toggleCollection, useCollection, type CollectionGame } from "@/lib/collection";
import { loadSearchIndex } from "@/lib/search-index";
import { themeFor } from "@/lib/themes";
import type { Deal, SearchIndex } from "@/types";

function GameList({ title, icon, games, list }: { title: string; icon: React.ReactNode; games: CollectionGame[]; list: "owned" | "wanted" }) {
  return (
    <section>
      <h2 className="flex items-center gap-2 text-xl font-bold text-heading">
        {icon} {title} <span className="text-base font-normal text-muted">({games.length})</span>
      </h2>
      {games.length === 0 ? (
        <p className="mt-2 text-sm text-muted">
          Aucun jeu pour l&apos;instant : utilise les boutons « Je l&apos;ai » et « Je le veux » sur les sorties, les promos ou dans la recherche.
        </p>
      ) : (
        <ul className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {games.map((g) => (
            <li key={g.id} className="glass relative overflow-hidden rounded-xl">
              <div className="aspect-[16/9]">
                <RemoteImage src={g.image} alt={g.title} theme={themeFor(g.title)} seed={g.id} className="h-full w-full" />
              </div>
              <p className="line-clamp-2 p-2.5 pb-0 text-sm font-semibold text-heading">{g.title}</p>
              <div className="p-2.5">{!g.id.startsWith("anilist-") && <GameProgress game={g} />}</div>
              <button
                type="button"
                onClick={() => toggleCollection(list, g)}
                aria-label={`Retirer ${g.title}`}
                className="absolute right-1.5 top-1.5 z-10 flex size-8 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur hover:bg-black/80"
              >
                <X className="size-4" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/** Ma collection : listes + actus et promos qui concernent les jeux voulus. */
export function CollectionView({ deals }: { deals: Deal[] }) {
  const c = useCollection();
  const [index, setIndex] = useState<SearchIndex | null>(null);
  useEffect(() => {
    loadSearchIndex().then(setIndex).catch(() => setIndex(null));
  }, []);

  if (!c) return <p className="mt-6 text-muted">Chargement…</p>;
  const watched = [...c.wanted, ...c.owned];
  const forMeDeals = deals.filter((d) => c.wanted.some((g) => g.id === d.id || mentions(d.title, g.title)));
  const forMeNews = (index?.articles ?? []).filter((a) => watched.some((g) => mentions(a.title, g.title))).slice(0, 12);

  return (
    <div className="mt-8 space-y-10">
      {(forMeDeals.length > 0 || forMeNews.length > 0) && (
        <section>
          <h2 className="text-xl font-bold text-heading">✨ Pour toi</h2>
          <p className="mt-1 text-sm text-muted">Les promos et actus qui parlent de tes jeux.</p>
          {forMeDeals.length > 0 && (
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {forMeDeals.map((d) => (
                <DealCard key={d.id} deal={d} />
              ))}
            </div>
          )}
          {forMeNews.length > 0 && (
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {forMeNews.map((a) => (
                <NewsCard key={a.slug} article={a} />
              ))}
            </div>
          )}
        </section>
      )}
      <section>
        <h2 className="text-xl font-bold text-heading">🎮 Mon suivi de jeux</h2>
        <MyGameTracking empty="Choisis « Mon suivi… » sur un jeu (En cours, Terminé, 100 %…) pour suivre ton avancement." />
      </section>
      <section>
        <h2 className="text-xl font-bold text-heading">📺 Mes animes</h2>
        <MyAnimeTracking empty="Touche « Suivre les épisodes » sur un anime (onglet Anime ou recherche) pour cocher les épisodes vus." />
      </section>
      <GameList title="Je le veux" icon={<Heart className="size-5 text-rose-500" aria-hidden />} games={c.wanted} list="wanted" />
      <GameList title="Je l'ai" icon={<Check className="size-5 text-emerald-500" aria-hidden />} games={c.owned} list="owned" />
    </div>
  );
}
