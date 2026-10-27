import { CalendarDays, Gamepad2, Gift, House, Newspaper, Search, Star } from "lucide-react";

/** mobile : présent dans la barre d'onglets (5 au maximum) ; Consoles reste accessible via les filtres d'Actus. */
export const NAV_LINKS = [
  { href: "/", label: "Accueil", icon: House, mobile: true },
  { href: "/actualites", label: "Actus", icon: Newspaper, mobile: true },
  { href: "/tests", label: "Tests", icon: Star, mobile: true },
  { href: "/consoles", label: "Consoles", icon: Gamepad2, mobile: false },
  { href: "/sorties", label: "Sorties", icon: CalendarDays, mobile: true },
  { href: "/jeux-gratuits", label: "Gratuits", icon: Gift, mobile: true },
] as const;

export const SEARCH_LINK = { href: "/recherche", label: "Recherche", icon: Search } as const;

/** Lien actif : celui dont le préfixe correspond le mieux au chemin (les pages d'article restent dans « Actus »). */
export function activeHref(pathname: string): string | undefined {
  return [...NAV_LINKS, SEARCH_LINK]
    .map((l) => l.href as string)
    .filter((h) => (h === "/" ? pathname === "/" : pathname.startsWith(h)))
    .sort((a, b) => b.length - a.length)[0];
}
