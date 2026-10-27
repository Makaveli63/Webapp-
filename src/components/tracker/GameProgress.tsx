"use client";

import { GAME_STATUS, gameKey, setGameTrack, useTracker, type GameStatus } from "@/lib/tracker";

interface Props {
  game: { title: string; image?: string };
  /** Version complète (fiche du jeu) : avancement en % et heures de jeu en plus du statut */
  full?: boolean;
  className?: string;
}

/** Suivi d'un jeu : à jouer, en cours, terminé, 100 %, abandonné (+ avancement et heures en version complète). */
export function GameProgress({ game, full = false, className = "" }: Props) {
  const tracker = useTracker();
  const key = gameKey(game.title);
  const track = tracker?.games[key];
  const stop = (e: React.SyntheticEvent) => e.stopPropagation();

  return (
    <div className={`relative z-10 ${className}`} onClick={stop}>
      <label className="sr-only" htmlFor={`suivi-${key}`}>
        Mon suivi : {game.title}
      </label>
      <select
        id={`suivi-${key}`}
        value={track?.status ?? ""}
        onChange={(e) => setGameTrack(game, e.target.value ? { status: e.target.value as GameStatus } : null)}
        className={`w-full rounded-full px-2.5 py-1 text-xs font-semibold ${
          track ? "bg-accent text-white" : "glass-pill text-muted ring-1 ring-inset ring-border"
        }`}
      >
        <option value="">📋 Mon suivi…</option>
        {(Object.keys(GAME_STATUS) as GameStatus[]).map((s) => (
          <option key={s} value={s}>
            {GAME_STATUS[s].emoji} {GAME_STATUS[s].label}
          </option>
        ))}
      </select>
      {full && track && (
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="text-sm text-muted">
            Avancement : <span className="font-semibold text-heading">{track.progress ?? 0} %</span>
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              value={track.progress ?? 0}
              onChange={(e) => setGameTrack(game, { progress: Number(e.target.value) })}
              className="mt-1 w-full accent-accent"
            />
          </label>
          <label className="text-sm text-muted">
            Heures de jeu
            <input
              type="number"
              inputMode="numeric"
              min={0}
              max={99999}
              value={track.hours ?? ""}
              placeholder="0"
              onChange={(e) => setGameTrack(game, { hours: e.target.value === "" ? undefined : Math.max(0, Number(e.target.value) || 0) })}
              className="glass-pill mt-1 block w-28 rounded-lg px-3 py-1.5 text-heading ring-1 ring-inset ring-border"
            />
          </label>
        </div>
      )}
    </div>
  );
}
