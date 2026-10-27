"use client";

import { useState } from "react";
import { RemoteImage } from "@/components/ui/RemoteImage";
import { EpisodeDialog } from "@/components/tracker/EpisodeTracker";
import { GameProgress } from "@/components/tracker/GameProgress";
import { themeFor } from "@/lib/themes";
import { airedEpisodes, GAME_STATUS, useTracker, type AnimeTrack, type GameStatus } from "@/lib/tracker";

const ORDER: GameStatus[] = ["en-cours", "a-jouer", "termine", "platine", "abandonne"];

type AnimeFilter = "tous" | "favoris" | "a-voir" | "en-cours" | "termines";
const FILTERS: { id: AnimeFilter; label: string }[] = [
  { id: "tous", label: "Tous" },
  { id: "favoris", label: "❤️ Favoris" },
  { id: "a-voir", label: "🕒 À voir" },
  { id: "en-cours", label: "▶️ En cours" },
  { id: "termines", label: "✅ Terminés" },
];

const done = (a: AnimeTrack) => {
  const max = a.total ?? airedEpisodes(a);
  return !!max && a.seen.length >= max && a.total !== undefined;
};
const keep: Record<AnimeFilter, (a: AnimeTrack) => boolean> = {
  tous: () => true,
  favoris: (a) => !!a.fav,
  "a-voir": (a) => !!a.later,
  "en-cours": (a) => a.seen.length > 0 && !done(a),
  termines: done,
};

/** Animes suivis : avancement, épisodes sortis pas encore vus ; un clic ouvre la grille des épisodes. */
export function MyAnimeTracking({ empty }: { empty?: string }) {
  const t = useTracker();
  const [open, setOpen] = useState<AnimeTrack | null>(null);
  const [filter, setFilter] = useState<AnimeFilter>("tous");
  if (!t) return null;
  const all = Object.values(t.anime).sort((a, b) => Number(!!b.fav) - Number(!!a.fav) || b.updatedAt.localeCompare(a.updatedAt));
  if (!all.length) return empty ? <p className="mt-2 text-sm text-muted">{empty}</p> : null;
  const list = all.filter(keep[filter]);
  const current = open && t.anime[open.id];

  return (
    <>
      <div className="scroll-row -mx-4 mt-3 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0" role="group" aria-label="Filtrer mes animes">
        {FILTERS.map((f) => {
          const n = all.filter(keep[f.id]).length;
          return (
            <button
              key={f.id}
              type="button"
              aria-pressed={filter === f.id}
              onClick={() => setFilter(f.id)}
              className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold ring-1 ring-inset ${filter === f.id ? "bg-accent text-white ring-accent" : "glass-pill text-fg ring-border"}`}
            >
              {f.label} <span className="opacity-70">{n}</span>
            </button>
          );
        })}
      </div>
      {list.length === 0 && <p className="mt-3 text-sm text-muted">Aucun anime dans cette liste.</p>}
      <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {list.map((a) => {
          const aired = airedEpisodes(a);
          const max = a.total ?? aired;
          const pct = max ? Math.round((a.seen.length / max) * 100) : 0;
          const late = aired !== undefined ? Array.from({ length: aired }, (_, i) => i + 1).filter((n) => !a.seen.includes(n)).length : 0;
          return (
            <li key={a.id}>
              <button type="button" onClick={() => setOpen(a)} className="glass flex w-full gap-3 rounded-xl p-2.5 text-left hover:border-accent/60">
                <span className="relative h-20 w-14 shrink-0 overflow-hidden rounded-lg">
                  <RemoteImage src={a.image} alt="" theme={themeFor(a.title)} seed={a.id} className="h-full w-full" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="line-clamp-2 text-sm font-semibold text-heading">
                    {a.fav && <span aria-label="Favori">❤️ </span>}
                    {a.later && <span aria-label="À voir">🕒 </span>}
                    {a.title}
                  </span>
                  <span className="mt-0.5 block text-xs text-muted">
                    {a.seen.length === 0 ? (
                      `Pas commencé${max ? ` · ${max} épisode${max > 1 ? "s" : ""}` : ""}`
                    ) : (
                      <>
                        {a.seen.length}
                        {max ? `/${max}` : ""} épisode{a.seen.length > 1 ? "s" : ""} vu{a.seen.length > 1 ? "s" : ""}
                        {late > 0 && <span className="font-semibold text-accent"> · {late} à rattraper</span>}
                      </>
                    )}
                    {max !== undefined && a.seen.length >= max && <span className="font-semibold text-emerald-500"> · à jour ✓</span>}
                  </span>
                  <span className="mt-2 block h-1.5 overflow-hidden rounded-full bg-black/10 dark:bg-white/10">
                    <Bar pct={pct} />
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      {current && <EpisodeDialog anime={current} seen={current.seen} tracked onClose={() => setOpen(null)} />}
    </>
  );
}

/** Barre de progression (largeur réglée par CSSOM : pas de style en ligne avec la CSP). */
function Bar({ pct }: { pct: number }) {
  return <span ref={(el) => el?.style.setProperty("width", `${Math.min(100, pct)}%`)} className="block h-full rounded-full bg-accent" />;
}

/** Jeux suivis, rangés par statut. */
export function MyGameTracking({ empty }: { empty?: string }) {
  const t = useTracker();
  if (!t) return null;
  const list = Object.values(t.games);
  if (!list.length) return empty ? <p className="mt-2 text-sm text-muted">{empty}</p> : null;
  return (
    <div className="mt-4 space-y-5">
      {ORDER.map((s) => {
        const games = list.filter((g) => g.status === s).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
        if (!games.length) return null;
        return (
          <div key={s}>
            <h3 className="text-sm font-bold text-heading">
              {GAME_STATUS[s].emoji} {GAME_STATUS[s].label} <span className="font-normal text-muted">({games.length})</span>
            </h3>
            <ul className="mt-2 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {games.map((g) => (
                <li key={g.id} className="glass flex gap-3 rounded-xl p-2.5">
                  <span className="relative aspect-[16/9] w-24 shrink-0 overflow-hidden rounded-lg">
                    <RemoteImage src={g.image} alt="" theme={themeFor(g.title)} seed={g.id} className="h-full w-full" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="line-clamp-2 text-sm font-semibold text-heading">{g.title}</span>
                    <span className="block text-xs text-muted">
                      {[g.progress !== undefined && `${g.progress} %`, g.hours !== undefined && `${g.hours} h de jeu`].filter(Boolean).join(" · ")}
                    </span>
                    <GameProgress game={g} full className="mt-1.5" />
                  </span>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}
