"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * Petit effet au changement de page : la nouvelle page glisse depuis la droite,
 * ou depuis la gauche quand on revient en arrière (bouton retour, geste de balayage).
 */
export function PageTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const back = useRef(false);
  // Animation choisie pendant le rendu (et non après) : pas d'image sans effet avant qu'il démarre.
  const [state, setState] = useState({ path: pathname, anim: "" });
  if (state.path !== pathname) setState({ path: pathname, anim: back.current ? "page-in-back" : "page-in-forward" });
  // Effet de repli : seulement si le navigateur n'a pas les transitions façon iOS (AppleTransitions).

  useEffect(() => {
    const onPop = () => (back.current = true);
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);
  useEffect(() => {
    back.current = false;
  }, [pathname]);

  return (
    <div
      key={pathname}
      className={state.anim}
      onAnimationEnd={(e) => {
        if (e.target === e.currentTarget) setState((s) => ({ ...s, anim: "" }));
      }}
    >
      {children}
    </div>
  );
}
