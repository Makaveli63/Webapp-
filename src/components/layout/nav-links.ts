import { CalendarDays, Clapperboard, Gamepad2, Gift, House, Newspaper, Search, Sparkles, Star, Tag, Trophy } from "lucide-react";

/**
 * mobile : présent dans la barre d'onglets (6 au maximum) ; les autres sont sur l'accueil et dans le pied de page.
 * wide : affiché dans l'en-tête seulement sur grand écran ; "never" : jamais dans l'en-tête (filtres d'Actus, pied de page).
 */
export const NAV_LINKS = [
  { href: "/", label: "Accueil", icon: House, mobile: true },
  { href: "/actualites", label: "Actus", icon: Newspaper, mobile: false },
  { href: "/tests", label: "Tests", icon: Star, mobile: true },
  { href: "/consoles", label: "Consoles", icon: Gamepad2, mobile: false, wide: "never" },
  { href: "/sorties", label: "Sorties", icon: CalendarDays, mobile: true },
  { href: "/anime", label: "Anime", icon: Sparkles, mobile: true },
  { href: "/jeux-gratuits", label: "Gratuits", icon: Gift, mobile: true },
  { href: "/promos", label: "Promos", icon: Tag, mobile: false },
  { href: "/videos", label: "Vidéos", icon: Clapperboard, mobile: false, wide: true },
  { href: "/classement", label: "Classement", icon: Trophy, mobile: false, wide: true },
] as const;

export const SEARCH_LINK = { href: "/recherche", label: "Recherche", icon: Search } as const;

/** Lien actif : celui dont le préfixe correspond le mieux au chemin (les pages d'article restent dans « Actus »). */
export function activeHref(pathname: string): string | undefined {
  return [...NAV_LINKS, SEARCH_LINK]
    .map((l) => l.href as string)
    .filter((h) => (h === "/" ? pathname === "/" : pathname.startsWith(h)))
    .sort((a, b) => b.length - a.length)[0];
}
