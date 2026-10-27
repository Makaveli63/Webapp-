"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { favoriteTopicsGlow, usePageGlow, usePageImage } from "@/lib/background";

/** Couleurs propres à chaque onglet / catégorie. */
const SECTION_GLOW: [string, readonly [string, string, string]][] = [
  ["/actualites", ["#2563eb", "#22d3ee", "#6246ea"]],
  ["/tests", ["#f59e0b", "#ef476f", "#6246ea"]],
  ["/consoles", ["#10b981", "#22d3ee", "#2563eb"]],
  ["/sorties", ["#ff6a88", "#f59e0b", "#8a3ffc"]],
  ["/jeux-gratuits", ["#10b981", "#ffd166", "#22d3ee"]],
  ["/recherche", ["#22d3ee", "#6246ea", "#2563eb"]],
  ["/favoris", ["#8b5cf6", "#ff6a88", "#22d3ee"]],
  ["/anime", ["#ff4f9a", "#8b5cf6", "#ffb3d1"]],
];
const DEFAULT_GLOW = ["#6246ea", "#22d3ee", "#ff6a88"] as const;

/**
 * Fond d'écran dynamique : halos flous animés dont les couleurs suivent la page (jeu de l'article lu),
 * l'onglet, et sur l'accueil les sujets les plus consultés. Couleurs appliquées via CSSOM (compatible CSP).
 */
export function DynamicBackground() {
  const pathname = usePathname();
  const pageGlow = usePageGlow();
  const image = usePageImage();
  // Image affichée seulement une fois chargée (fondu), oubliée si elle ne se charge pas.
  const [loaded, setLoaded] = useState<string | null>(null);

  useEffect(() => {
    const glow =
      pageGlow ??
      SECTION_GLOW.find(([prefix]) => pathname.startsWith(prefix))?.[1] ??
      (pathname === "/" ? favoriteTopicsGlow() : null) ??
      DEFAULT_GLOW;
    const style = document.documentElement.style;
    style.setProperty("--dyn-a", glow[0]);
    style.setProperty("--dyn-b", glow[1]);
    style.setProperty("--dyn-c", glow[2]);
  }, [pathname, pageGlow]);

  return (
    <div className="dyn-bg" aria-hidden="true">
      <div className="dyn-blob dyn-blob-a" />
      <div className="dyn-blob dyn-blob-b" />
      <div className="dyn-blob dyn-blob-c" />
      {image && (
        // Image du jeu de l'article, très floutée, sous les cartes en verre.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={image}
          src={image}
          alt=""
          decoding="async"
          referrerPolicy="no-referrer"
          onLoad={() => setLoaded(image)}
          onError={() => setLoaded(null)}
          className={`dyn-photo ${loaded === image ? "dyn-photo-on" : ""}`}
        />
      )}
    </div>
  );
}
