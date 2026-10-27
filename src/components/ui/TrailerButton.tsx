"use client";

import { Play, X } from "lucide-react";
import { useEffect, useState } from "react";
import type { Video } from "@/types";
import { VideoPlayer } from "./VideoPlayer";

/** Bouton « Bande-annonce » qui ouvre la vidéo dans une fenêtre par-dessus la page. */
export function TrailerButton({ video, title, className = "" }: { video: Video; title: string; className?: string }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    document.body.classList.add("overflow-hidden");
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.classList.remove("overflow-hidden");
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen(true);
        }}
        className={`inline-flex items-center gap-1.5 rounded-full bg-black/70 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur hover:bg-accent ${className}`}
      >
        <Play className="size-3.5" fill="currentColor" aria-hidden /> Bande-annonce
      </button>
      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Bande-annonce : ${title}`}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4"
          onClick={() => setOpen(false)}
        >
          <div className="w-full max-w-3xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-2 flex items-center justify-between gap-4 text-white">
              <p className="truncate font-semibold">{title}</p>
              <button type="button" onClick={() => setOpen(false)} aria-label="Fermer" className="rounded-full p-2 hover:bg-white/15">
                <X className="size-5" />
              </button>
            </div>
            <VideoPlayer video={video} title={title} autoPlay />
          </div>
        </div>
      )}
    </>
  );
}
