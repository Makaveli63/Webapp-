"use client";

import { Search as SearchIcon } from "lucide-react";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { SearchBar } from "./SearchBar";

/**
 * Loupe de l'en-tête (mobile et tablette) : touchée, elle s'étire en champ de recherche sur toute la largeur,
 * comme sur iOS ; les résultats s'affichent dessous, sans changer de page. « Annuler » referme.
 */
export function HeaderSearch({ active }: { active: boolean }) {
  const [open, setOpen] = useState(false);
  const [closing, setClosing] = useState(false);
  const pathname = usePathname();

  const close = useCallback(() => {
    setClosing(true);
    window.setTimeout(() => {
      setOpen(false);
      setClosing(false);
    }, 220);
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
        onClick={() => setOpen(true)}
        aria-label="Rechercher"
        aria-expanded={open}
        className={`head-btn -mr-1 flex size-11 items-center justify-center rounded-full ${active ? "text-accent" : "text-muted"} hover:text-fg lg:hidden`}
      >
        <SearchIcon className="size-5" aria-hidden />
      </button>
      {open &&
        createPortal(
          <div className="header-search lg:hidden">
            <SearchBar spotlight autoFocus className="hs-field min-w-0 flex-1" onDone={close} onCancel={close} />
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
