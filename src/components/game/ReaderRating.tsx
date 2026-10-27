"use client";

import { Users } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { scoreTier } from "@/components/ui/ScoreBadge";
import { bumpActivity } from "@/lib/badges";
import { rpc, socialEnabled, voterId } from "@/lib/social";

interface Stats {
  avg: number | null;
  count: number;
  mine: number | null;
}

/** Note des lecteurs sur 20 : un vote par appareil (modifiable), moyenne en direct. */
export function ReaderRating({ gameKey, title }: { gameKey: string; title: string }) {
  const [stats, setStats] = useState<Stats | null>(null);
  const [value, setValue] = useState(14);
  const [error, setError] = useState("");

  const load = useCallback(() => {
    rpc<Stats>("get_game_rating", { p_game: gameKey, p_voter: voterId() })
      .then((s) => {
        setStats(s);
        if (s.mine !== null) setValue(s.mine);
      })
      .catch(() => setStats({ avg: null, count: 0, mine: null }));
  }, [gameKey]);

  useEffect(() => {
    if (socialEnabled) load();
  }, [load]);
  if (!socialEnabled) return null;

  const send = async () => {
    setError("");
    try {
      await rpc("rate_game", { p_game: gameKey, p_score: value, p_voter: voterId() });
      if (stats?.mine === null) bumpActivity("ratings");
      load();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const avg = stats?.avg !== null && stats?.avg !== undefined ? `${String(stats.avg).replace(".", ",")}/20` : null;
  return (
    <section aria-labelledby="readers-title" className="glass rounded-2xl p-5">
      <h2 id="readers-title" className="flex items-center gap-2 text-lg font-bold text-heading">
        <Users className="size-5 text-accent" aria-hidden /> La note des lecteurs
      </h2>
      <div className="mt-3 flex flex-wrap items-center gap-4">
        {avg ? (
          <span className={`score-glass score-solid rounded-2xl px-3.5 py-2 text-2xl font-extrabold ${scoreTier(avg).className}`}>{avg}</span>
        ) : (
          <span className="text-sm text-muted">Pas encore de note : sois le premier !</span>
        )}
        {!!stats?.count && <span className="text-sm text-muted">{stats.count} lecteur{stats.count > 1 ? "s" : ""}</span>}
      </div>
      <div className="mt-4">
        <label htmlFor={`rate-${gameKey}`} className="text-sm font-semibold text-heading">
          {stats?.mine !== null && stats?.mine !== undefined ? "Ta note (modifiable)" : `Ta note pour ${title}`} : {value}/20
        </label>
        <div className="mt-2 flex items-center gap-3">
          <input
            id={`rate-${gameKey}`}
            type="range"
            min={0}
            max={20}
            step={1}
            value={value}
            onChange={(e) => setValue(Number(e.target.value))}
            className="h-2 min-w-0 flex-1 accent-[var(--accent)]"
          />
          <button type="button" onClick={send} className="shrink-0 rounded-full bg-accent px-4 py-2 text-sm font-semibold text-white">
            Noter
          </button>
        </div>
      </div>
      {error && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>}
    </section>
  );
}
