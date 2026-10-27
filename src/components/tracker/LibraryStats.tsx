"use client";

import { useState } from "react";
import { libraryStats, monthlyHours, useTracker } from "@/lib/tracker";

/** « 12 h », « 1 h 30 », « 45 min ». */
export function formatHours(hours: number): string {
  const total = Math.round(hours * 60);
  if (total < 60) return `${total} min`;
  const h = Math.floor(total / 60);
  const m = total % 60;
  return m ? `${h} h ${String(m).padStart(2, "0")}` : `${h} h`;
}

function Tile({ value, label, hint }: { value: string; label: string; hint?: string }) {
  return (
    <div className="glass rounded-2xl p-4">
      <p className="text-2xl font-black text-heading sm:text-3xl">{value}</p>
      <p className="mt-1 text-sm font-semibold text-fg">{label}</p>
      {hint && <p className="text-xs text-muted">{hint}</p>}
    </div>
  );
}

/** Hauteur d'une barre (CSSOM : pas de style en ligne avec la CSP). */
function Bar({ pct, className, label }: { pct: number; className: string; label: string }) {
  return (
    <span
      ref={(el) => el?.style.setProperty("height", `${pct > 0 ? Math.max(pct, 2) : 0}%`)}
      className={`block w-full max-w-5 rounded-t ${className}`}
      aria-hidden
      title={label}
    />
  );
}

/** Statistiques de la bibliothèque : temps de jeu et de visionnage, et heures par mois. */
export function LibraryStats() {
  const t = useTracker();
  const months = t ? monthlyHours(t.log) : [];
  const [picked, setPicked] = useState<string | null>(null);
  if (!t) return null;
  const s = libraryStats(t);
  const max = Math.max(...months.map((m) => Math.max(m.games, m.anime)), 0);
  const current = months.find((m) => m.key === picked) ?? months[months.length - 1];

  return (
    <section aria-labelledby="stats-title">
      <h2 id="stats-title" className="text-xl font-bold text-heading">📊 Mes stats</h2>
      <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Tile value={formatHours(s.gameHours)} label="de jeu" hint={`${s.playing} jeu${s.playing > 1 ? "x" : ""} en cours`} />
        <Tile value={formatHours(s.animeMinutes / 60)} label="d'anime regardé" hint={`${s.episodes} épisode${s.episodes > 1 ? "s" : ""} vu${s.episodes > 1 ? "s" : ""}`} />
        <Tile value={String(s.finished)} label={`jeu${s.finished > 1 ? "x" : ""} terminé${s.finished > 1 ? "s" : ""}`} hint={`dont ${s.platinum} à 100 %`} />
        <Tile value={String(s.animeUpToDate)} label={`anime${s.animeUpToDate > 1 ? "s" : ""} à jour`} hint={`sur ${Object.keys(t.anime).length} suivi${Object.keys(t.anime).length > 1 ? "s" : ""}`} />
      </div>

      <div className="glass mt-4 rounded-2xl p-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="text-sm font-bold text-heading">Heures par mois</h3>
          <p className="flex gap-3 text-xs text-muted">
            <span className="inline-flex items-center gap-1.5">
              <span className="bg-viz-games size-2.5 rounded-sm" aria-hidden /> Jeux
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="bg-viz-anime size-2.5 rounded-sm" aria-hidden /> Anime
            </span>
          </p>
        </div>
        {max === 0 ? (
          <p className="mt-3 text-sm text-muted">
            Coche des épisodes ou indique tes heures de jeu sur la fiche d&apos;un jeu : ton temps apparaîtra ici, mois par mois.
          </p>
        ) : (
          <>
            <div className="mt-4 flex h-36 items-stretch gap-2 border-b border-border" aria-hidden>
              {months.map((m) => (
                <button
                  key={m.key}
                  type="button"
                  tabIndex={-1}
                  onMouseEnter={() => setPicked(m.key)}
                  onClick={() => setPicked(m.key)}
                  className={`flex flex-1 items-end justify-center gap-0.5 rounded-t-lg pt-1 ${m.key === current?.key ? "bg-black/5 dark:bg-white/5" : ""}`}
                >
                  <Bar pct={(m.games / max) * 100} className="bg-viz-games" label={`Jeux : ${formatHours(m.games)}`} />
                  <Bar pct={(m.anime / max) * 100} className="bg-viz-anime" label={`Anime : ${formatHours(m.anime)}`} />
                </button>
              ))}
            </div>
            <div className="mt-1 flex gap-2 text-center text-xs text-muted" aria-hidden>
              {months.map((m) => (
                <span key={m.key} className={`flex-1 ${m.key === current?.key ? "font-bold text-fg" : ""}`}>
                  {m.label}
                </span>
              ))}
            </div>
            {current && (
              <p className="mt-3 text-sm text-fg" aria-live="polite">
                <strong className="capitalize">{current.label}</strong> : {formatHours(current.games)} de jeu · {formatHours(current.anime)} d&apos;anime
              </p>
            )}
            <table className="sr-only">
              <caption>Heures par mois</caption>
              <thead>
                <tr>
                  <th>Mois</th>
                  <th>Jeux</th>
                  <th>Anime</th>
                </tr>
              </thead>
              <tbody>
                {months.map((m) => (
                  <tr key={m.key}>
                    <td>{m.label}</td>
                    <td>{formatHours(m.games)}</td>
                    <td>{formatHours(m.anime)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
        <p className="mt-3 text-xs text-muted">
          Temps d&apos;anime calculé avec la durée des épisodes (AniList, 24 min si inconnue). Temps de jeu : celui que tu indiques sur
          chaque jeu, compté le jour où tu le changes.
        </p>
      </div>
    </section>
  );
}
