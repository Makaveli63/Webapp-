"use client";

import { WifiOff } from "lucide-react";
import { useEffect, useState } from "react";
import { loadSearchIndex } from "@/lib/search-index";

const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
const LAST_KEY = "gb-offline-at";

/**
 * Lecture hors connexion : installe le service worker, puis enregistre en arrière-plan les pages
 * principales et les 25 derniers articles (au plus toutes les 3 h, jamais en mode « économie de données »).
 * Affiche un bandeau discret quand il n'y a plus de réseau.
 */
export function OfflineSupport() {
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    const update = () => setOffline(!navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register(`${BASE}/sw.js`, { scope: `${BASE}/` })
        .then(async (reg) => {
          const conn = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
          let last = 0;
          try {
            last = Number(localStorage.getItem(LAST_KEY) ?? 0);
          } catch {
            /* rien */
          }
          if (!navigator.onLine || conn?.saveData || Date.now() - last < 3 * 3600_000) return;
          await navigator.serviceWorker.ready;
          const index = await loadSearchIndex().catch(() => null);
          const pages = ["/", "/actualites/", "/tests/", "/sorties/", "/jeux-gratuits/", "/promos/", "/favoris/", "/collection/"];
          const articles = (index?.articles ?? []).slice(0, 25).map((a) => `/actualites/${a.slug}/`);
          (reg.active ?? navigator.serviceWorker.controller)?.postMessage({
            type: "precache",
            paths: [...pages, ...articles].map((p) => `${BASE}${p}`),
          });
          try {
            localStorage.setItem(LAST_KEY, String(Date.now()));
          } catch {
            /* rien */
          }
        })
        .catch(() => {});
    }
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  if (!offline) return null;
  return (
    <div role="status" className="glass fixed inset-x-3 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-50 flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm text-heading shadow-lg md:bottom-4 md:left-auto md:right-4 md:w-auto">
      <WifiOff className="size-4 text-accent" aria-hidden /> Hors connexion : tu lis les articles enregistrés.
    </div>
  );
}
