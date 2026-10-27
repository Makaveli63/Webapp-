"use client";

import { Award } from "lucide-react";
import { useEffect, useState } from "react";
import { computeBadges, readActivity, type Badge } from "@/lib/badges";
import { rpc, socialEnabled, voterId } from "@/lib/social";

/** Badges gagnés sur cet appareil (commentaires, sondages, notes, pronostics, j'aime, favoris). */
export function MyBadges() {
  const [badges, setBadges] = useState<Badge[] | null>(null);

  useEffect(() => {
    const favorites = (() => {
      try {
        return JSON.parse(localStorage.getItem("gb-favoris") ?? "[]").length as number;
      } catch {
        return 0;
      }
    })();
    const empty = { polls: 0, ratings: 0, predictions: 0, likes: 0 };
    const done = (server: typeof empty) => setBadges(computeBadges(readActivity(), server, favorites));
    if (!socialEnabled) return done(empty);
    rpc<typeof empty>("get_my_activity", { p_voter: voterId() }).then(done).catch(() => done(empty));
  }, []);

  if (!badges) return null;
  const earned = badges.filter((b) => b.earned).length;
  return (
    <section aria-labelledby="badges-title" className="glass rounded-xl p-4 sm:p-5">
      <h2 id="badges-title" className="flex items-center gap-2 font-semibold text-heading">
        <Award className="size-5 text-accent" aria-hidden /> Mes badges <span className="text-sm font-normal text-muted">({earned}/{badges.length})</span>
      </h2>
      <ul className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {badges.map((b) => (
          <li
            key={b.id}
            title={b.hint}
            className={`rounded-xl p-3 text-center ring-1 ring-inset ${b.earned ? "ring-accent/50 glass-pill" : "opacity-45 ring-border grayscale"}`}
          >
            <span className="block text-2xl" aria-hidden>
              {b.emoji}
            </span>
            <span className="mt-1 block text-sm font-semibold text-heading">{b.label}</span>
            <span className="block text-xs text-muted">{b.earned ? "Débloqué" : b.hint}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
