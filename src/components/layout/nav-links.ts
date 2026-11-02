import { CalendarDays, Clapperboard, Gamepad2, Gift, House, MessageSquare, Newspaper, Search, BookOpen, Spade, Star, Tag, Trophy } from "lucide-react";
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
  { href: "/comics", label: "Comics", icon: BookOpen, mobile: true, wide: true },
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

/** Onglets possibles de la barre du bas (Réglages → « Ma barre du bas »). Accueil est toujours le premier. */
export const DOCK_CHOICES = ["/actualites", "/tests", "/sorties", "/anime", "/comics", "/tcg", "/jeux-gratuits", "/promos", "/videos", "/classement", "/consoles"] as const;
/** 5 onglets au plus : la limite de la barre de l'iPhone. */
export const DOCK_MAX = 5;

const topicOf = (href: string) => TOPIC_TABS.find(([h]) => h === href)?.[1];

/**
 * Onglets de la barre du bas. Choisis par le visiteur (« Ma barre du bas ») ; sinon Accueil, Sorties et les
 * rubriques affichées (Anime, Comics, Cartes), une rubrique masquée laissant sa place à Tests puis à Gratuits.
 * Une rubrique masquée dans « Mes rubriques » n'a jamais d'onglet.
 */
export function dockLinks(hiddenTopics: readonly string[], custom?: readonly string[] | null) {
  const shown = (h: string) => !hiddenTopics.includes(topicOf(h) ?? "");
  let hrefs: string[];
  if (custom?.length) {
    hrefs = ["/", ...custom.filter((h, i) => (DOCK_CHOICES as readonly string[]).includes(h) && custom.indexOf(h) === i && shown(h))].slice(0, DOCK_MAX);
  } else {
    hrefs = ["/", "/sorties", ...TOPIC_TABS.filter(([, id]) => !hiddenTopics.includes(id)).map(([h]) => h)];
    if (hrefs.length < DOCK_MAX) hrefs.splice(1, 0, "/tests");
    if (hrefs.length < DOCK_MAX) hrefs.push("/jeux-gratuits");
  }
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
