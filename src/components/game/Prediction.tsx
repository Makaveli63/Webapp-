"use client";

import { Target } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { bumpActivity, recordPrediction } from "@/lib/badges";
import { rpc, socialEnabled, voterId } from "@/lib/social";

interface Stats {
  avg: number | null;
  count: number;
  mine: number | null;
}

/**
 * Pronostic : deviner la moyenne de la presse avant les tests. Une fois les tests publiés,
 * on compare (« écart de 1 point ») et le badge « Pronostiqueur » récompense les bons pronostics.
 */
export function Prediction({ gameKey, title, pressAverage }: { gameKey: string; title: string; pressAverage?: number }) {
  const [stats, setStats] = useState<Stats | null>(null);
  const [value, setValue] = useState(15);
  const [error, setError] = useState("");

  const load = useCallback(() => {
    rpc<Stats>("get_predictions", { p_game: gameKey, p_voter: voterId() })
      .then((s) => {
        setStats(s);
        if (s.mine !== null) setValue(Number(s.mine));
        if (s.mine !== null && pressAverage !== undefined) recordPrediction(gameKey, Number(s.mine), pressAverage);
      })
      .catch(() => setStats({ avg: null, count: 0, mine: null }));
  }, [gameKey, pressAverage]);

  useEffect(() => {
    if (socialEnabled) load();
  }, [load]);
  if (!socialEnabled) return null;

  const send = async () => {
    setError("");
    try {
      await rpc("predict_game", { p_game: gameKey, p_score: value, p_voter: voterId() });
      if (stats?.mine === null) bumpActivity("predictions");
      load();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const fmt = (n: number) => `${String(Math.round(n * 10) / 10).replace(".", ",")}/20`;
  const mine = stats?.mine !== null && stats?.mine !== undefined ? Number(stats.mine) : null;

  return (
    <section aria-labelledby="predict-title" className="glass rounded-2xl p-5">
      <h2 id="predict-title" className="flex items-center gap-2 text-lg font-bold text-heading">
        <Target className="size-5 text-accent" aria-hidden /> Pronostic
      </h2>
      {pressAverage !== undefined ? (
        <p className="mt-2 text-sm text-fg">
          Moyenne de la presse : <strong>{fmt(pressAverage)}</strong>
          {mine !== null && (
            <>
              {" "}
              · ton pronostic : <strong>{fmt(mine)}</strong> (écart de {fmt(Math.abs(mine - pressAverage)).replace("/20", "")} pt
              {Math.abs(mine - pressAverage) >= 2 ? "s" : ""}) {Math.abs(mine - pressAverage) <= 1 ? "🎯 Bien vu !" : ""}
            </>
          )}
          {stats?.avg !== null && stats?.avg !== undefined && <> · pronostic moyen des lecteurs : {fmt(Number(stats.avg))}</>}
        </p>
      ) : (
        <>
          <p className="mt-1 text-sm text-muted">
            Quelle note moyenne la presse va-t-elle donner à {title} ? Réponds avant les premiers tests.
          </p>
          <div className="mt-3 flex items-center gap-3">
            <input
              type="range"
              min={0}
              max={20}
              step={0.5}
              value={value}
              aria-label="Ton pronostic sur 20"
              onChange={(e) => setValue(Number(e.target.value))}
              className="h-2 min-w-0 flex-1 accent-[var(--accent)]"
            />
            <span className="w-14 text-right font-bold tabular-nums text-heading">{fmt(value)}</span>
            <button type="button" onClick={send} className="shrink-0 rounded-full bg-accent px-4 py-2 text-sm font-semibold text-white">
              {mine !== null ? "Modifier" : "Parier"}
            </button>
          </div>
          {!!stats?.count && (
            <p className="mt-2 text-xs text-muted">
              {stats.count} pronostic{stats.count > 1 ? "s" : ""} · moyenne des lecteurs : {fmt(Number(stats.avg))}
            </p>
          )}
        </>
      )}
      {error && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>}
    </section>
  );
}
