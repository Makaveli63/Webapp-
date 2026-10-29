"use client";

import { ChevronLeft, ChevronRight, ExternalLink, Images, X } from "lucide-react";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

interface Props {
  images: string[];
  source: string;
  sourceUrl?: string;
  title: string;
}

/**
 * Images de l'article du média, sous le résumé : rangée défilante (grille sur grand écran),
 * et visionneuse plein écran au toucher (glisser, flèches, Échap). Affichées depuis le site du média,
 * sans référent, et créditées. Une image qui ne se charge pas disparaît ; la section aussi si aucune ne passe.
 */
export function ArticleGallery({ images, source, sourceUrl, title }: Props) {
  const [failed, setFailed] = useState<Set<string>>(new Set());
  const [open, setOpen] = useState<number | null>(null);
  const shown = images.filter((src) => !failed.has(src));
  const fail = useCallback((src: string) => setFailed((f) => new Set(f).add(src)), []);
  if (!shown.length) return null;

  return (
    <section aria-labelledby="gallery-title" className="mt-8">
      <p id="gallery-title" className="mb-2 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-accent-2">
        <Images className="size-3.5" aria-hidden /> Images de l&apos;article · {shown.length}
      </p>
      <ul className="scroll-row -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0">
        {shown.map((src, i) => (
          <li key={src} className="w-[82%] shrink-0 snap-center sm:w-auto">
            <button
              type="button"
              onClick={() => setOpen(i)}
              aria-label={`Agrandir l'image ${i + 1} sur ${shown.length}`}
              className="block aspect-video w-full overflow-hidden rounded-2xl bg-surface-2 ring-1 ring-inset ring-border transition-transform active:scale-[.98]"
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- image distante du média, affichée telle quelle */}
              <img
                src={src}
                alt={`${title}, image ${i + 1}`}
                loading="lazy"
                decoding="async"
                referrerPolicy="no-referrer"
                onError={() => fail(src)}
                className="size-full object-cover"
              />
            </button>
          </li>
        ))}
      </ul>
      <p className="mt-2 text-xs text-muted">
        Images : {source}
        {sourceUrl && (
          <>
            {" · "}
            <a href={sourceUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-0.5 font-semibold text-heading hover:underline">
              voir l&apos;article original <ExternalLink className="size-3" aria-hidden />
            </a>
          </>
        )}
      </p>
      {open !== null && <Viewer images={shown} start={open} title={title} source={source} onClose={() => setOpen(null)} onFail={fail} />}
    </section>
  );
}

function Viewer({ images, start, title, source, onClose, onFail }: { images: string[]; start: number; title: string; source: string; onClose: () => void; onFail: (src: string) => void }) {
  const track = useRef<HTMLDivElement>(null);
  const closeBtn = useRef<HTMLButtonElement>(null);
  const [index, setIndex] = useState(start);

  // Ouverture sur l'image touchée, sans animation.
  useLayoutEffect(() => {
    const el = track.current;
    if (el) el.scrollLeft = start * el.clientWidth;
    closeBtn.current?.focus();
  }, [start]);

  const go = useCallback((n: number) => {
    const el = track.current;
    if (!el) return;
    const next = Math.max(0, Math.min(images.length - 1, n));
    el.scrollTo({ left: next * el.clientWidth, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  }, [images.length]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowRight") go(index + 1);
      else if (e.key === "ArrowLeft") go(index - 1);
    };
    document.addEventListener("keydown", onKey);
    // La page ne défile pas derrière la visionneuse.
    const root = document.documentElement;
    root.classList.add("viewer-open");
    return () => {
      document.removeEventListener("keydown", onKey);
      root.classList.remove("viewer-open");
    };
  }, [go, index, onClose]);

  const onScroll = () => {
    const el = track.current;
    if (el) setIndex(Math.round(el.scrollLeft / Math.max(el.clientWidth, 1)));
  };
  const arrow = "absolute top-1/2 hidden size-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/12 text-white backdrop-blur-md hover:bg-white/20 disabled:opacity-30 sm:flex";

  return createPortal(
    <div role="dialog" aria-modal="true" aria-label={`Images : ${title}`} className="viewer fixed inset-0 z-[80] bg-black/92 backdrop-blur-xl">
      <div ref={track} onScroll={onScroll} className="flex size-full snap-x snap-mandatory overflow-x-auto overscroll-contain [scrollbar-width:none]">
        {images.map((src, i) => (
          // Toucher le fond (hors image) ferme la visionneuse.
          <div key={src} className="flex size-full shrink-0 snap-center items-center justify-center p-3 sm:p-12" onClick={(e) => e.target === e.currentTarget && onClose()}>
            {/* eslint-disable-next-line @next/next/no-img-element -- image distante du média, affichée telle quelle */}
            <img src={src} alt={`${title}, image ${i + 1}`} referrerPolicy="no-referrer" decoding="async" onError={() => onFail(src)} className="max-h-full max-w-full rounded-xl object-contain shadow-2xl" />
          </div>
        ))}
      </div>
      <div className="viewer-top pointer-events-none absolute inset-x-0 top-0 flex items-center justify-between px-4">
        <span className="rounded-full bg-white/12 px-3 py-1 text-sm font-semibold text-white tabular-nums backdrop-blur-md">
          {index + 1} / {images.length}
        </span>
        <button ref={closeBtn} type="button" onClick={onClose} aria-label="Fermer" className="pointer-events-auto flex size-11 items-center justify-center rounded-full bg-white/12 text-white backdrop-blur-md hover:bg-white/20">
          <X className="size-5" aria-hidden />
        </button>
      </div>
      <button type="button" onClick={() => go(index - 1)} disabled={index <= 0} aria-label="Image précédente" className={`${arrow} left-4`}>
        <ChevronLeft className="size-6" aria-hidden />
      </button>
      <button type="button" onClick={() => go(index + 1)} disabled={index >= images.length - 1} aria-label="Image suivante" className={`${arrow} right-4`}>
        <ChevronRight className="size-6" aria-hidden />
      </button>
      <p className="viewer-bottom pointer-events-none absolute inset-x-0 bottom-0 text-center text-xs text-white/70">Image : {source}</p>
    </div>,
    document.body,
  );
}
