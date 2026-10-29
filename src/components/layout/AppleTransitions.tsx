"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
const clean = (path: string) => (path.replace(/\/+$/, "") || "/");

/**
 * Transitions entre les pages façon iOS (API View Transitions du navigateur) :
 * la nouvelle page arrive par la droite par-dessus l'ancienne, qui recule un peu et s'assombrit.
 * Retour arrière : immédiat (glissement léger de PageTransition). En-tête, île et barre d'onglets restent en place.
 * Navigateur sans cette API ou animations réduites : navigation normale.
 */
export function AppleTransitions() {
  const router = useRouter();
  const pathname = usePathname();
  const waiters = useRef<{ target: string; done: () => void }[]>([]);
  // Page réellement affichée (chemin sans le dossier du site ni « / » final).
  const shown = useRef(clean(pathname));

  // Nouvelle page affichée : les transitions qui l'attendaient peuvent se terminer.
  useEffect(() => {
    shown.current = clean(pathname);
    waiters.current = waiters.current.filter((w) => {
      if (w.target !== shown.current) return true;
      w.done();
      return false;
    });
  }, [pathname]);

  useEffect(() => {
    const doc = document as Document & { startViewTransition?: (cb: () => Promise<void>) => { finished: Promise<void> } };
    if (!doc.startViewTransition || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const root = document.documentElement;
    root.setAttribute("data-vt", "1");

    // Attend que la page visée soit affichée (tout de suite si c'est déjà le cas), 0,9 s au plus.
    const wait = (target: string) =>
      new Promise<void>((resolve) => {
        if (shown.current === target) return resolve();
        waiters.current.push({ target, done: resolve });
        window.setTimeout(resolve, 900); // jamais bloqué si la page ne change pas
      });
    const run = (target: string, navigate: () => void) => {
      doc.startViewTransition!(async () => {
        navigate();
        await wait(target);
      });
    };

    // Liens internes : interceptés avant le composant Link pour animer le changement de page.
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element | null)?.closest?.("a");
      if (!a || a.target || a.hasAttribute("download") || a.closest(".tabbar")) return; // onglets : changement direct
      // Bouton posé dans une vignette cliquable (suivre, épingler, Je l'ai…) : c'est lui qui répond, pas le lien.
      const control = (e.target as Element).closest("button, select, input, label, [role=button]");
      if (control && a.contains(control)) return;
      const url = new URL(a.href, location.href);
      if (url.origin !== location.origin || !url.pathname.startsWith(`${BASE}/`) || /\.\w+$/.test(url.pathname)) return;
      if (url.pathname === location.pathname && url.search === location.search) return;
      e.preventDefault();
      const path = url.pathname.slice(BASE.length) || "/";
      run(clean(path), () => router.push(path + url.search + url.hash));
    };
    // Retour arrière (bouton, souris, geste) : pas de transition. Le routeur affiche déjà la page précédente
    // quand l'événement arrive, l'animation figeait l'écran pour rien ; le léger glissement de PageTransition suffit.
    document.addEventListener("click", onClick, true);
    return () => {
      document.removeEventListener("click", onClick, true);
      root.removeAttribute("data-vt");
    };
  }, [router]);

  return null;
}
