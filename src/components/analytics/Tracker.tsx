"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { rpc, socialEnabled } from "@/lib/social";

/**
 * Mesure d'audience sans cookie : une ligne par page vue (chemin, provenance, type d'appareil),
 * rien d'autre. Désactivée si le navigateur demande à ne pas être suivi (Do Not Track / GPC).
 */
export function Tracker() {
  const pathname = usePathname();
  const first = useRef(true);

  useEffect(() => {
    if (!socialEnabled || pathname.startsWith("/admin")) return;
    const nav = navigator as Navigator & { globalPrivacyControl?: boolean };
    if (nav.doNotTrack === "1" || nav.globalPrivacyControl) return;

    // Provenance : uniquement à l'arrivée sur le site, et seulement le nom de domaine du site d'origine.
    let source: string | null = null;
    if (first.current && document.referrer) {
      try {
        const host = new URL(document.referrer).hostname.replace(/^www\./, "");
        if (host !== location.hostname) source = host;
      } catch {
        /* provenance illisible */
      }
    }
    first.current = false;
    const width = window.innerWidth;
    const device = width < 640 ? "mobile" : width < 1024 ? "tablette" : "ordinateur";
    rpc("track_view", { p_path: pathname, p_source: source, p_device: device }).catch(() => {});
  }, [pathname]);

  return null;
}
