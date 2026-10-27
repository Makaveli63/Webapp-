import { Gamepad2, House, Newspaper, Search, Star } from "lucide-react";

export const NAV_LINKS = [
  { href: "/", label: "Accueil", icon: House },
  { href: "/actualites", label: "Actus", icon: Newspaper },
  { href: "/tests", label: "Tests", icon: Star },
  { href: "/consoles", label: "Consoles", icon: Gamepad2 },
] as const;

export const SEARCH_LINK = { href: "/recherche", label: "Recherche", icon: Search } as const;

/** Lien actif : celui dont le préfixe correspond le mieux au chemin (les pages d'article restent dans « Actus »). */
export function activeHref(pathname: string): string | undefined {
  return [...NAV_LINKS, SEARCH_LINK]
    .map((l) => l.href as string)
    .filter((h) => (h === "/" ? pathname === "/" : pathname.startsWith(h)))
    .sort((a, b) => b.length - a.length)[0];
}
