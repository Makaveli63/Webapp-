"use client";

import { Pause, Play, SkipBack, SkipForward, X } from "lucide-react";
import Link from "next/link";
import { controlListening, useListening } from "@/lib/listen";

/** Mini-lecteur de « Écouter les actus » : île sombre au-dessus de la barre d'onglets, sur toutes les pages. */
export function ListenPlayer() {
  const { items, index, state } = useListening();
  const current = items[index];
  if (state === "stopped" || !current) return null;
  return (
    <div role="region" aria-label="Lecture des actus" className="listen-player">
      {current.path ? (
        <Link href={current.path} className="min-w-0 flex-1">
          <PlayerTitle index={index} total={items.length} title={current.title} />
        </Link>
      ) : (
        <div className="min-w-0 flex-1">
          <PlayerTitle index={index} total={items.length} title={current.title} />
        </div>
      )}
      <button type="button" onClick={() => controlListening("previous")} aria-label="Actu précédente" className="p-1.5">
        <SkipBack className="size-5" aria-hidden />
      </button>
      <button
        type="button"
        onClick={() => controlListening(state === "playing" ? "pause" : "resume")}
        aria-label={state === "playing" ? "Pause" : "Reprendre"}
        className="flex size-9 shrink-0 items-center justify-center rounded-full bg-white text-black"
      >
        {state === "playing" ? <Pause className="size-4" fill="currentColor" aria-hidden /> : <Play className="size-4" fill="currentColor" aria-hidden />}
      </button>
      <button type="button" onClick={() => controlListening("next")} aria-label="Actu suivante" className="p-1.5">
        <SkipForward className="size-5" aria-hidden />
      </button>
      <button type="button" onClick={() => controlListening("stop")} aria-label="Arrêter la lecture" className="p-1.5 text-white/70">
        <X className="size-5" aria-hidden />
      </button>
    </div>
  );
}

function PlayerTitle({ index, total, title }: { index: number; total: number; title: string }) {
  return (
    <>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-white/60">
        🎧 Actu {index + 1} sur {total}
      </p>
      <p className="truncate text-sm font-semibold">{title}</p>
    </>
  );
}
