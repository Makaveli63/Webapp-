"use client";

import { EyeOff } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { createPortal } from "react-dom";
import { franchiseOf, isMuted, mute, unmute, useMuted } from "@/lib/muted";

/**
 * « Pas intéressé » : propose de masquer toute la licence du jeu (nom modifiable), avec annulation.
 * Les réglages listent les licences masquées pour les réafficher.
 */
export function NotInterestedButton({ title, className = "" }: { title: string; className?: string }) {
  const muted = useMuted();
  const [open, setOpen] = useState(false);
  const [term, setTerm] = useState(() => franchiseOf(title));
  const [done, setDone] = useState("");
  // Pas la place à droite du bouton : le panneau s'ouvre vers la gauche (il reste dans l'écran).
  const [right, setRight] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: PointerEvent) => !box.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [open]);
  useEffect(() => {
    if (!done) return;
    const t = window.setTimeout(() => setDone(""), 5000);
    return () => window.clearTimeout(t);
  }, [done]);

  const already = muted.find((m) => isMuted(title, [m]));
  const submit = (e: FormEvent) => {
    e.preventDefault();
    mute(term);
    setOpen(false);
    setDone(term.trim());
  };

  return (
    <div ref={box} className="relative">
      <button
        type="button"
        onClick={(e) => {
          if (already) return unmute(already);
          const panel = Math.min(256, window.innerWidth - 32); // largeur du panneau (16rem)
          setRight(e.currentTarget.getBoundingClientRect().left + panel > window.innerWidth - 16);
          setOpen((o) => !o);
        }}
        aria-expanded={open}
        className={`inline-flex h-[30px] items-center gap-1.5 rounded-full glass-pill px-3 text-xs font-semibold ring-1 ring-inset ring-border ${already ? "text-accent" : "text-heading hover:text-fg"} ${className}`}
      >
        <EyeOff className="size-3.5" aria-hidden /> {already ? `${already} masqué · réafficher` : "Pas intéressé"}
      </button>
      {open && (
        <form onSubmit={submit} className={`reading-panel z-30 rounded-2xl p-3 shadow-xl ring-1 ring-border ${right ? "reading-panel-right" : ""}`}>
          <label htmlFor="mute-term" className="text-xs font-semibold uppercase tracking-wide text-muted">
            Ne plus rien voir sur
          </label>
          <input
            id="mute-term"
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            maxLength={40}
            className="mt-1.5 w-full rounded-lg border border-border bg-bg px-3 py-2 text-base text-heading focus:border-accent focus:outline-none md:text-sm"
          />
          <p className="mt-1.5 text-xs text-muted">Actus, sorties, recherche et notifications dont le titre contient ces mots.</p>
          <button type="submit" disabled={term.trim().length < 2} className="mt-3 w-full rounded-full bg-accent px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
            Masquer
          </button>
        </form>
      )}
      {done &&
        createPortal(
          <div role="status" className="follow-toast">
            <div className="follow-toast-body">
              <EyeOff className="size-4 shrink-0 text-accent" aria-hidden />
              <span className="min-w-0">
                <span className="block truncate font-semibold">{done} masqué</span>
                <span className="block text-xs text-white/75">Plus d&apos;actus ni de sorties sur cette licence.</span>
              </span>
              <button
                type="button"
                onClick={() => {
                  unmute(done);
                  setDone("");
                }}
                className="ml-1 shrink-0 font-semibold text-[#b9a4ff]"
              >
                Annuler
              </button>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
