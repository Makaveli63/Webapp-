"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

type AppWindow = Window & {
  gbNavigate?: (path: string) => void;
  webkit?: { messageHandlers?: { gamingbase?: { postMessage: (m: unknown) => void } } };
};

function send(message: Record<string, unknown>) {
  try {
    (window as AppWindow).webkit?.messageHandlers?.gamingbase?.postMessage(message);
  } catch {
    /* hors application */
  }
}

/**
 * Lien avec la vraie barre d'onglets de l'app iPhone (Liquid Glass d'iOS) :
 * l'app ouvre les onglets par window.gbNavigate (sans recharger la page), le site lui signale la page affichée.
 */
export function NativeTabsBridge() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const w = window as AppWindow;
    w.gbNavigate = (path: string) => router.push(path);
    return () => {
      delete w.gbNavigate;
    };
  }, [router]);

  useEffect(() => {
    send({ route: pathname });
  }, [pathname]);

  // La barre d'onglets de l'app attend la fin de l'animation d'ouverture ; elle prend la couleur du site.
  useEffect(() => {
    const accent = () => send({ accent: getComputedStyle(document.documentElement).getPropertyValue("--accent").trim() });
    accent();
    window.addEventListener("gb-theme-change", accent);
    const splashOn = document.documentElement.getAttribute("data-splash") !== "off" && !matchMedia("(prefers-reduced-motion: reduce)").matches;
    const timer = window.setTimeout(() => send({ tabsReady: true }), splashOn ? 2000 : 0);
    return () => {
      window.removeEventListener("gb-theme-change", accent);
      window.clearTimeout(timer);
    };
  }, []);

  return null;
}
