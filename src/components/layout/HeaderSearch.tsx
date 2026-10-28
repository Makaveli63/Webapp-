"use client";

import { Search as SearchIcon } from "lucide-react";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { SearchBar } from "./SearchBar";

/**
 * Loupe de l'en-tête (mobile et tablette) : touchée, elle s'étire vers la gauche jusqu'à devenir le champ
 * de recherche, comme sur iOS ; les résultats s'affichent dessous, sans changer de page.
 * « Annuler » referme : le champ se rétracte dans la loupe.
 */
const EASE = "cubic-bezier(.2, .9, .25, 1)";
const reduced = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
export function HeaderSearch({ active }: { active: boolean }) {
  const [open, setOpen] = useState(false);
  const [closing, setClosing] = useState(false);
  const pathname = usePathname();
  const loupe = useRef<HTMLButtonElement>(null);
  const field = useRef<HTMLDivElement>(null);
  // Point de départ : la loupe (position et taille), mesurée au toucher.
  const from = useRef<DOMRect | null>(null);

  // Image de départ de l'étirement : champ réduit à la taille de la loupe, à sa place.
  const frames = () => {
    const el = field.current;
    const start = from.current;
    if (!el || !start) return null;
    const end = el.getBoundingClientRect();
    const dx = start.right - end.right;
    const scale = Math.min(1, start.height / end.height);
    const left = Math.max(0, end.width - start.width / scale);
    return {
      field: [
        { clipPath: `inset(0 0 0 ${left}px round 999px)`, transform: `translateX(${dx}px) scale(${scale})`, opacity: 0.5 },
        { clipPath: "inset(0 0 0 0 round 999px)", transform: "translateX(0) scale(1)", opacity: 1 },
      ],
      // La petite loupe du champ suit le bord gauche qui s'étire.
      icon: [{ transform: `translateX(${left + (start.width / scale - 40) / 2}px)` }, { transform: "translateX(0)" }],
    };
  };
  const play = (f: NonNullable<ReturnType<typeof frames>>, options: KeyframeAnimationOptions, reverse = false) => {
    const el = field.current!;
    el.dataset.stretching = "1";
    const anim = el.animate(reverse ? [...f.field].reverse() : f.field, options);
    el.querySelector("form > svg")?.animate(reverse ? [...f.icon].reverse() : f.icon, options);
    return anim;
  };

  useLayoutEffect(() => {
    if (!open || reduced()) return;
    const f = frames();
    if (!f) return;
    const anim = play(f, { duration: 420, easing: EASE });
    anim.onfinish = anim.oncancel = () => field.current && delete field.current.dataset.stretching;
  }, [open]);

  const close = useCallback(() => {
    setClosing(true);
    const f = reduced() ? null : frames();
    if (f) play(f, { duration: 260, easing: "cubic-bezier(.4, 0, .2, 1)", fill: "forwards" }, true);
    window.setTimeout(() => {
      setOpen(false);
      setClosing(false);
    }, f ? 260 : 200);
  }, []);
  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    const root = document.documentElement;
    if (open) root.setAttribute("data-search", closing ? "closing" : "open");
    else root.removeAttribute("data-search");
    return () => root.removeAttribute("data-search");
  }, [open, closing]);

  return (
    <>
      <button
        type="button"
        ref={loupe}
        onClick={() => {
          from.current = loupe.current?.getBoundingClientRect() ?? null;
          setOpen(true);
        }}
        aria-label="Rechercher"
        aria-expanded={open}
        className={`head-btn -mr-1 flex size-11 items-center justify-center rounded-full ${active ? "text-accent" : "text-muted"} hover:text-fg lg:hidden`}
      >
        <SearchIcon className="size-5" aria-hidden />
      </button>
      {open &&
        createPortal(
          <div className="header-search lg:hidden">
            <div ref={field} className="hs-field min-w-0 flex-1">
              <SearchBar spotlight autoFocus onDone={close} onCancel={close} />
            </div>
            <button type="button" onClick={close} className="hs-cancel shrink-0 text-[15px] font-semibold text-accent">
              Annuler
            </button>
          </div>,
          document.getElementById("gb-topnav") ?? document.body, // dans l'en-tête, par-dessus le logo et les boutons
        )}
      {open && createPortal(<div aria-hidden className="search-scrim lg:hidden" onClick={close} />, document.body)}
    </>
  );
}
