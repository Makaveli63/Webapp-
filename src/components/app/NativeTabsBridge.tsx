"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

type AppWindow = Window & {
  gbNavigate?: (path: string) => void;
  webkit?: { messageHandlers?: { gamingbase?: { postMessage: (m: unknown) => void } } };
};

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
    try {
      (window as AppWindow).webkit?.messageHandlers?.gamingbase?.postMessage({ route: pathname });
    } catch {
      /* hors application */
    }
  }, [pathname]);

  return null;
}
