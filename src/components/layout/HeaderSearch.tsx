"use client";

import { Search as SearchIcon } from "lucide-react";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { SearchBar } from "./SearchBar";

/**
 * Loupe de l'en-tête (téléphone, tablette et ordinateur) : touchée, c'est la bulle de la loupe elle-même qui
 * s'allonge vers la gauche jusqu'à devenir le champ de recherche, comme sur iOS. Les autres boutons restent
 * en place, la page reste visible derrière ; les résultats s'affichent sous le champ, sans changer de page.
 * La croix (champ vide), Échap ou un toucher à côté referment : le champ se rétracte dans la loupe.
 */
// Ressort : s'étire vite, dépasse à peine, se pose (repli sur une courbe simple si linear() n'existe pas).
const SPRING_STEPS =
  "linear(0, 0.009, 0.035 2.1%, 0.141 4.4%, 0.723 12.9%, 0.938 16.7%, 1.017 19.4%, 1.067, 1.099 24.3%, 1.108 26%, 1.104, 1.088 30.6%, 1.019 39.2%, 0.996 43.3%, 0.986 47.6%, 0.991 57.2%, 1)";
const spring = () => (CSS.supports("animation-timing-function", SPRING_STEPS) ? SPRING_STEPS : "cubic-bezier(.3, 1.25, .45, 1)");
const reduced = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export function HeaderSearch({ active }: { active: boolean }) {
  const [open, setOpen] = useState(false);
  const [closing, setClosing] = useState(false);
  const pathname = usePathname();
  const loupe = useRef<HTMLButtonElement>(null);
  const box = useRef<HTMLDivElement>(null);
  const field = useRef<HTMLDivElement>(null);

  // Le champ se termine exactement au bord droit de la loupe : il en sort, et les boutons voisins ne bougent pas.
  const anchor = () => {
    const nav = document.getElementById("gb-topnav");
    const b = loupe.current?.getBoundingClientRect();
    if (!nav || !b || !box.current) return;
    box.current.style.setProperty("--hs-right", `${Math.max(0, nav.getBoundingClientRect().right - b.right)}px`);
  };
  const stretch = (from: number, to: number, options: KeyframeAnimationOptions) => {
    const el = field.current!;
    el.dataset.stretching = "";
    const anim = el.animate([{ width: `${from}px` }, { width: `${to}px` }], options);
    return anim;
  };

  useLayoutEffect(() => {
    if (!open) return;
    anchor();
    const el = field.current;
    const size = loupe.current?.offsetWidth ?? 44;
    if (!el) return;
    if (reduced()) return void delete el.dataset.stretching;
    const anim = stretch(size, el.getBoundingClientRect().width, { duration: 560, easing: spring() });
    anim.onfinish = anim.oncancel = () => field.current && delete field.current.dataset.stretching;
  }, [open]);
  useEffect(() => {
    if (!open) return;
    window.addEventListener("resize", anchor);
    return () => window.removeEventListener("resize", anchor);
  }, [open]);

  const close = useCallback(() => {
    setClosing(true);
    const el = field.current;
    const animate = el && !reduced();
    if (animate) stretch(el.getBoundingClientRect().width, loupe.current?.offsetWidth ?? 44, { duration: 300, easing: "cubic-bezier(.4, 0, .2, 1)", fill: "forwards" });
    window.setTimeout(() => {
      setOpen(false);
      setClosing(false);
    }, animate ? 300 : 150);
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
        onClick={() => setOpen(true)}
        aria-label="Rechercher"
        aria-expanded={open}
        className={`hs-loupe head-btn -mr-1 flex size-11 items-center justify-center rounded-full ${active ? "text-accent" : "text-muted"} hover:text-fg`}
      >
        <SearchIcon className="size-5" aria-hidden />
      </button>
      {open &&
        createPortal(
          <div ref={box} className="header-search">
            {/* data-stretching dès l'ouverture : le texte du champ n'apparaît qu'une fois la bulle étirée. */}
            <div ref={field} data-stretching="" className="hs-field">
              <SearchBar spotlight autoFocus onDone={close} onCancel={close} />
            </div>
          </div>,
          document.getElementById("gb-topnav") ?? document.body, // dans l'en-tête, par-dessus le logo
        )}
      {open && createPortal(<div aria-hidden className="search-scrim" onClick={close} />, document.body)}
    </>
  );
}
