"use client";

import { EyeOff, X } from "lucide-react";
import { unmute, useMuted } from "@/lib/muted";

/** Réglages : licences masquées avec « Pas intéressé », réaffichables d'un toucher. */
export function MutedList() {
  const muted = useMuted();
  return (
    <section className="glass rounded-xl p-4">
      <div className="flex items-center gap-3">
        <EyeOff className="size-5 shrink-0 text-muted" aria-hidden />
        <div className="min-w-0 flex-1">
          <h2 className="font-semibold text-heading">Licences masquées</h2>
          <p className="text-sm text-muted">
            {muted.length
              ? "Tu ne vois plus leurs actus, sorties ni notifications. Touche une licence pour la réafficher."
              : "Aucune. Sur la fiche d'un jeu ou un article, touche « Pas intéressé » pour ne plus rien voir sur sa licence."}
          </p>
        </div>
      </div>
      {muted.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-2">
          {muted.map((m) => (
            <li key={m}>
              <button
                type="button"
                onClick={() => unmute(m)}
                aria-label={`Réafficher ${m}`}
                className="inline-flex items-center gap-1.5 rounded-full bg-surface-2 px-3 py-1.5 text-sm font-semibold text-heading ring-1 ring-inset ring-border hover:ring-accent"
              >
                {m} <X className="size-3.5 text-muted" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
