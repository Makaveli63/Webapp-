"use client";

import { Check, ListChecks, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { airedEpisodes, setEpisodes, untrackAnime, useTracker } from "@/lib/tracker";

export interface EpisodeInfo {
  id: string;
  title: string;
  image?: string;
  total?: number;
  /** Durée d'un épisode (minutes) */
  duration?: number;
  next?: { episode: number; at: string };
}

/** Bouton « Mes épisodes » : coche les épisodes vus d'un anime (une saison = une fiche). */
export function EpisodeTracker({ anime, className = "" }: { anime: EpisodeInfo; className?: string }) {
  const tracker = useTracker();
  const [open, setOpen] = useState(false);
  const track = tracker?.anime[anime.id];
  const seen = track?.seen ?? [];
  const total = anime.total ?? track?.total;
  const label = !track ? "Suivre les épisodes" : `Mes épisodes · ${seen.length}${total ? `/${total}` : ""}`;

  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen(true);
        }}
        className={`relative z-10 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold transition-colors ${
          track ? "bg-accent text-white" : "glass-pill text-muted ring-1 ring-inset ring-border hover:text-fg"
        } ${className}`}
      >
        <ListChecks className="size-3.5" aria-hidden /> {label}
      </button>
      {open && <EpisodeDialog anime={{ ...anime, total }} seen={seen} tracked={!!track} onClose={() => setOpen(false)} />}
    </>
  );
}

export function EpisodeDialog({ anime, seen, tracked, onClose }: { anime: EpisodeInfo; seen: number[]; tracked: boolean; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.classList.add("overflow-hidden");
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.classList.remove("overflow-hidden");
    };
  }, [onClose]);

  const aired = airedEpisodes(anime);
  // Épisodes affichés : le total s'il est connu, sinon ceux déjà sortis (et au moins ceux déjà cochés).
  const count = Math.min(2000, Math.max(anime.total ?? aired ?? 12, ...seen, 1));
  const set = new Set(seen);
  const save = (next: number[]) => setEpisodes(anime, next);
  const toggle = (n: number) => save(set.has(n) ? seen.filter((x) => x !== n) : [...seen, n]);
  const nextToWatch = Array.from({ length: count }, (_, i) => i + 1).find((n) => !set.has(n));
  const available = aired ?? count;

  return createPortal(
    <div role="dialog" aria-modal="true" aria-label={`Épisodes vus : ${anime.title}`} className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-3 sm:items-center" onClick={onClose}>
      <div className="glass-strong max-h-[85vh] w-full max-w-md overflow-y-auto rounded-2xl p-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-accent">Mon suivi</p>
            <h2 className="line-clamp-2 font-bold text-heading">{anime.title}</h2>
            {anime.id.startsWith("anilist-") && (
              <Link href={`/anime/fiche?id=${anime.id.slice(8)}`} onClick={onClose} className="text-xs font-semibold text-accent underline underline-offset-2">
                Voir la fiche et toutes les saisons
              </Link>
            )}
            <p className="mt-0.5 text-sm text-muted">
              {seen.length} épisode{seen.length > 1 ? "s" : ""} vu{seen.length > 1 ? "s" : ""}
              {anime.total ? ` sur ${anime.total}` : ""}
              {aired !== undefined && anime.total && aired < anime.total ? ` · ${aired} sorti${aired > 1 ? "s" : ""}` : ""}
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label="Fermer" className="rounded-full p-2 text-muted hover:bg-black/10 hover:text-fg">
            <X className="size-5" />
          </button>
        </div>

        <div className="mt-4 grid grid-cols-6 gap-1.5 sm:grid-cols-8">
          {Array.from({ length: count }, (_, i) => i + 1).map((n) => {
            const on = set.has(n);
            const out = n <= available;
            return (
              <button
                key={n}
                type="button"
                aria-pressed={on}
                aria-label={`Épisode ${n}${out ? "" : " (pas encore sorti)"}`}
                onClick={() => toggle(n)}
                className={`flex aspect-square items-center justify-center rounded-lg text-sm font-bold transition-colors ${
                  on ? "bg-accent text-white" : out ? "glass-pill text-heading ring-1 ring-inset ring-border" : "border border-dashed border-border text-muted/60"
                }`}
              >
                {on ? <Check className="size-4" aria-hidden /> : n}
              </button>
            );
          })}
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {nextToWatch && nextToWatch <= available && (
            <button type="button" onClick={() => save([...seen, nextToWatch])} className="rounded-full bg-accent px-3 py-1.5 text-sm font-semibold text-white">
              + J&apos;ai vu l&apos;épisode {nextToWatch}
            </button>
          )}
          <button
            type="button"
            onClick={() => save(Array.from({ length: Math.max(1, Math.min(available, count)) }, (_, i) => i + 1))}
            className="glass-pill rounded-full px-3 py-1.5 text-sm font-semibold text-heading ring-1 ring-inset ring-border"
          >
            Tout vu
          </button>
          {!tracked && (
            <button type="button" onClick={() => save([])} className="glass-pill rounded-full px-3 py-1.5 text-sm font-semibold text-heading ring-1 ring-inset ring-border">
              Suivre sans cocher
            </button>
          )}
          {tracked && (
            <button
              type="button"
              onClick={() => {
                untrackAnime(anime.id);
                onClose();
              }}
              className="rounded-full px-3 py-1.5 text-sm font-semibold text-rose-500 hover:bg-rose-500/10"
            >
              Ne plus suivre
            </button>
          )}
        </div>
        <p className="mt-3 text-xs text-muted">Touchez un épisode pour le cocher ou le décocher. Retrouvez votre suivi dans l&apos;onglet Anime et dans Ma bibliothèque.</p>
      </div>
    </div>,
    document.body,
  );
}
