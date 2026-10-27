// Modèles de données de l'application (typage strict).

export type Platform = "PC" | "PS5" | "Switch 2" | "Xbox" | "Mobile" | "Multi";

export const PLATFORMS: readonly Platform[] = ["PC", "PS5", "Switch 2", "Xbox", "Mobile", "Multi"] as const;

/** Rubrique de l'article, détectée automatiquement à partir du titre. */
export type Category = "Actu" | "Test" | "Console";

export const CATEGORIES: Record<Category, { label: string; href: string }> = {
  Actu: { label: "Actus", href: "/actualites" },
  Test: { label: "Tests", href: "/tests" },
  Console: { label: "Consoles", href: "/consoles" },
};

export interface Article {
  slug: string;
  title: string;
  excerpt: string;
  /** Markdown pour les articles locaux, texte brut (extrait de l'éditeur) pour les articles RSS */
  content: string;
  category: Category;
  platforms: Platform[];
  tags: string[];
  author: string;
  /** Date ISO 8601 */
  publishedAt: string;
  source: { name: string; url?: string };
  /** Image d'illustration fournie par le média dans son flux RSS (affichée depuis son site, créditée) */
  image?: string;
  /** Résumé original rédigé automatiquement (IA) à partir de la source */
  aiSummary?: string;
  /** true si l'article provient d'un flux RSS externe */
  external?: boolean;
}

/** Jeu offert sur une boutique (Epic Games, Steam, GOG…). */
export interface FreeGame {
  id: string;
  title: string;
  store: string;
  url?: string;
  /** "now" : gratuit en ce moment ; "upcoming" : gratuit à partir de startDate */
  status: "now" | "upcoming";
  startDate?: string;
  endDate?: string;
  /** Prix habituel, ex. "19,99 €" */
  worth?: string;
  platforms?: string;
  /** Visuel officiel fourni par la boutique */
  image?: string;
}

export interface FreeGamesData {
  updatedAt?: string;
  epicAvailable: boolean;
  othersAvailable: boolean;
  games: FreeGame[];
}

/** Grosse sortie attendue, affichée avec un compte à rebours. */
export interface Release {
  id: string;
  title: string;
  /** Nom court pour le bandeau, ex. « GTA VI » */
  short?: string;
  subtitle?: string;
  /** Date de sortie (AAAA-MM-JJ), à minuit heure de Paris */
  date: string;
  platforms: Platform[];
  /** Décor du jeu (clé de THEMES dans lib/themes.ts) ; à défaut, déduit du titre */
  theme?: string;
  /** Annonce officielle ou article de presse confirmant la date */
  source: string;
  /** Visuel officiel (facultatif) ; sinon récupéré sur la page source au build */
  image?: string;
}

/** Jeu du calendrier des sorties (semaine / mois). */
export interface CalendarGame {
  id: string;
  title: string;
  /** Date de sortie AAAA-MM-JJ */
  date: string;
  platforms: string[];
  image?: string;
  url?: string;
}

export interface CalendarData {
  updatedAt?: string;
  source?: "RAWG" | "Steam";
  games: CalendarGame[];
  /** Visuels des grosses sorties (id de releases.json → URL) */
  releaseImages: Record<string, string>;
}
