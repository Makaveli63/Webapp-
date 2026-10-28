"use client";

import { Headphones, Pause, Play } from "lucide-react";
import { controlListening, startListening, useListening, type SpokenItem } from "@/lib/listen";

export type { SpokenItem };

/**
 * 🎧 Carte « Écouter les actus » de l'accueil : lance la lecture ; le mini-lecteur (ListenPlayer) reste ensuite
 * affiché sur toutes les pages.
 */
export function ListenNews({ items }: { items: SpokenItem[] }) {
  const { state } = useListening();
  if (!items.length) return null;
  const minutes = Math.max(1, Math.round(items.reduce((n, i) => n + i.text.split(" ").length, 0) / 160));
  const busy = state !== "stopped";
  return (
    <button
      type="button"
      onClick={() => (busy ? controlListening(state === "playing" ? "pause" : "resume") : startListening(items))}
      className="glass flex w-full items-center gap-3 rounded-2xl p-4 text-left hover:border-accent/60"
    >
      <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-accent text-white">
        <Headphones className="size-6" aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-lg font-bold text-heading">Écouter les actus</span>
        <span className="block text-sm text-muted">
          Les {items.length} dernières actus lues à voix haute, environ {minutes} min
        </span>
      </span>
      {state === "playing" ? <Pause className="size-5 shrink-0 text-accent" aria-hidden /> : <Play className="size-5 shrink-0 text-accent" aria-hidden />}
    </button>
  );
}
