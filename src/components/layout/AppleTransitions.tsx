"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

/**
 * Transitions entre les pages façon iOS (API View Transitions du navigateur) :
 * la nouvelle page arrive par la droite par-dessus l'ancienne, qui recule un peu et s'assombrit ;
 * au retour, l'inverse. En-tête, île et barre d'onglets restent en place.
 * Navigateur sans cette API ou animations réduites : navigation normale.
 */
export function AppleTransitions() {
  const router = useRouter();
  const pathname = usePathname();
  const waiters = useRef<(() => void)[]>([]);

  // Nouvelle page affichée : la transition peut se terminer.
  useEffect(() => {
    waiters.current.splice(0).forEach((done) => done());
  }, [pathname]);

  useEffect(() => {
    const doc = document as Document & { startViewTransition?: (cb: () => Promise<void>) => { finished: Promise<void> } };
    if (!doc.startViewTransition || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const root = document.documentElement;
    root.setAttribute("data-vt", "1");

    const wait = () =>
      new Promise<void>((resolve) => {
        waiters.current.push(resolve);
        window.setTimeout(resolve, 1500); // jamais bloqué si la page ne change pas
      });
    const run = (back: boolean, navigate: () => void) => {
      root.classList.toggle("vt-back", back);
      const t = doc.startViewTransition!(async () => {
        navigate();
        await wait();
      });
      t.finished.finally(() => root.classList.remove("vt-back"));
    };

    // Liens internes : interceptés avant le composant Link pour animer le changement de page.
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element | null)?.closest?.("a");
      if (!a || a.target || a.hasAttribute("download") || a.closest(".tabbar")) return; // onglets : changement direct
      const url = new URL(a.href, location.href);
      if (url.origin !== location.origin || !url.pathname.startsWith(`${BASE}/`) || /\.\w+$/.test(url.pathname)) return;
      if (url.pathname === location.pathname && url.search === location.search) return;
      e.preventDefault();
      const path = url.pathname.slice(BASE.length) || "/";
      run(false, () => router.push(path + url.search + url.hash));
    };
    // Retour : dans l'app iPhone, le balayage natif anime déjà le retour.
    const iosApp = /GamingBaseApp\/iOS/.test(navigator.userAgent);
    const onPop = () => {
      if (!iosApp) run(true, () => {});
    };
    document.addEventListener("click", onClick, true);
    window.addEventListener("popstate", onPop, true);
    return () => {
      document.removeEventListener("click", onClick, true);
      window.removeEventListener("popstate", onPop, true);
      root.removeAttribute("data-vt");
    };
  }, [router]);

  return null;
}
