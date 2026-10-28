"use client";

import { Check } from "lucide-react";
import { useEffect, useRef, useState } from "react";

const SIZES = [
  { id: "s", label: "Petit" },
  { id: "m", label: "Normal" },
  { id: "l", label: "Grand" },
  { id: "xl", label: "Très grand" },
] as const;
type Size = (typeof SIZES)[number]["id"];

/** Bouton « Aa » des articles : taille du texte (retenue pour tous les articles) et lecture épurée. */
export function ReadingControls() {
  const [open, setOpen] = useState(false);
  const [size, setSize] = useState<Size>("m");
  const [zen, setZen] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = document.documentElement;
    setSize((root.getAttribute("data-text-size") as Size) || "m");
    setZen(root.hasAttribute("data-zen"));
    return () => root.removeAttribute("data-zen"); // lecture épurée : seulement sur l'article ouvert
  }, []);
  useEffect(() => {
    if (!open) return;
    const close = (e: PointerEvent) => !box.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [open]);

  const chooseSize = (next: Size) => {
    setSize(next);
    document.documentElement.setAttribute("data-text-size", next);
    try {
      localStorage.setItem("gb-text-size", next);
    } catch {
      /* stockage indisponible */
    }
  };
  const toggleZen = () => {
    const next = !zen;
    setZen(next);
    document.documentElement.toggleAttribute("data-zen", next);
  };

  return (
    <div ref={box} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label="Taille du texte et lecture épurée"
        className={`inline-flex h-[30px] items-center glass-pill rounded-full px-3 py-1.5 text-xs font-semibold ring-1 ring-inset ring-border ${open ? "text-accent" : "text-heading hover:text-fg"}`}
      >
        <span className="text-[13px] font-bold tracking-tight" aria-hidden>
          <span className="text-[10px]">A</span>A
        </span>
      </button>
      {open && (
        <div role="dialog" aria-label="Affichage de l'article" className="reading-panel z-30 rounded-2xl p-3 shadow-xl ring-1 ring-border">
          <p className="px-1 text-xs font-semibold uppercase tracking-wide text-muted">Taille du texte</p>
          <div className="mt-2 grid grid-cols-4 gap-1 rounded-full bg-surface-2 p-1">
            {SIZES.map((s, i) => (
              <button
                key={s.id}
                type="button"
                aria-pressed={size === s.id}
                aria-label={s.label}
                onClick={() => chooseSize(s.id)}
                className={`rounded-full py-1.5 font-semibold transition-colors ${size === s.id ? "bg-surface text-heading shadow" : "text-muted"}`}
              >
                <span className={["text-xs", "text-sm", "text-base", "text-lg"][i]}>A</span>
              </button>
            ))}
          </div>
          <button type="button" onClick={toggleZen} aria-pressed={zen} className="mt-3 flex w-full items-center justify-between rounded-xl px-2 py-2 text-left text-sm font-semibold text-heading hover:bg-surface-2">
            <span>
              Lecture épurée
              <span className="block text-xs font-normal text-muted">Sans images ni suggestions autour du texte</span>
            </span>
            {zen && <Check className="size-4 text-accent" aria-hidden />}
          </button>
        </div>
      )}
    </div>
  );
}
