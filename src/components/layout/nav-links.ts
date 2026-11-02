import { CalendarDays, Clapperboard, Gamepad2, Gift, House, MessageSquare, Newspaper, Search, Spade, Star, Tag, Trophy, Zap } from "lucide-react";
import { FlowerIcon } from "@/components/ui/FlowerIcon";

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
  { href: "/anime", label: "Anime", icon: FlowerIcon, mobile: true },
  { href: "/comics", label: "Comics", icon: Zap, mobile: true, wide: true },
  { href: "/tcg", label: "Cartes", icon: Spade, mobile: true, wide: true },
  { href: "/jeux-gratuits", label: "Gratuits", icon: Gift, mobile: false },
  { href: "/promos", label: "Promos", icon: Tag, mobile: false },
  { href: "/videos", label: "Vidéos", icon: Clapperboard, mobile: false, wide: true },
  { href: "/classement", label: "Classement", icon: Trophy, mobile: false, wide: true },
  { href: "/suggestions", label: "Suggestions", icon: MessageSquare, mobile: false, wide: true },
] as const;

/** Rubriques à part qui ont un onglet, avec leur identifiant de « Mes rubriques » (src/lib/topics.ts). */
const TOPIC_TABS = [
  ["/anime", "Anime"],
  ["/comics", "Comics"],
  ["/tcg", "TCG"],
] as const;

/**
 * Onglets de la barre du bas (5, la limite de l'iPhone) : Accueil, Sorties et les rubriques affichées
 * (Anime, Comics, Cartes). Une rubrique masquée laisse sa place à Tests, puis à Gratuits.
 */
export function dockLinks(hiddenTopics: readonly string[]) {
  const hrefs: string[] = ["/", "/sorties", ...TOPIC_TABS.filter(([, id]) => !hiddenTopics.includes(id)).map(([h]) => h)];
  if (hrefs.length < 5) hrefs.splice(1, 0, "/tests");
  if (hrefs.length < 5) hrefs.push("/jeux-gratuits");
  return hrefs.map((h) => NAV_LINKS.find((l) => l.href === h)!);
}

export const SEARCH_LINK = { href: "/recherche", label: "Recherche", icon: Search } as const;

/** Lien actif : celui dont le préfixe correspond le mieux au chemin (les pages d'article restent dans « Actus »). */
export function activeHref(pathname: string): string | undefined {
  return [...NAV_LINKS, SEARCH_LINK]
    .map((l) => l.href as string)
    .filter((h) => (h === "/" ? pathname === "/" : pathname.startsWith(h)))
    .sort((a, b) => b.length - a.length)[0];
}
