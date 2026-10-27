// Modèles de données de l'application (typage strict).

/** Vidéo (bande-annonce, extrait) : identifiant YouTube ou fichier MP4/WebM en HTTPS. */
export interface Video {
  youtube?: string;
  mp4?: string;
  poster?: string;
}

export type Platform = "PC" | "PS5" | "Switch 2" | "Xbox" | "Mobile" | "Multi";

export const PLATFORMS: readonly Platform[] = ["PC", "PS5", "Switch 2", "Xbox", "Mobile", "Multi"] as const;

/** Rubrique de l'article, détectée automatiquement à partir du titre. */
export type Category = "Actu" | "Test" | "Console" | "Anime";

export const CATEGORIES: Record<Category, { label: string; href: string }> = {
  Actu: { label: "Actus", href: "/actualites" },
  Test: { label: "Tests", href: "/tests" },
  Console: { label: "Consoles", href: "/consoles" },
  Anime: { label: "Anime", href: "/anime" },
};

export interface Article {
  slug: string;
  title: string;
  excerpt: string;
  /** Markdown pour les articles locaux, texte brut (extrait de l'éditeur) pour les articles RSS */
  content: string;
  category: Category;
  /** Note du test donnée par le média (ex. « 8/10 »), si elle est indiquée */
  score?: string;
  platforms: Platform[];
  tags: string[];
  author: string;
  /** Date ISO 8601 */
  publishedAt: string;
  source: { name: string; url?: string };
  /** Image d'illustration fournie par le média dans son flux RSS (affichée depuis son site, créditée) */
  image?: string;
  /** Crédit d'une image qui ne vient pas du média (photo libre de la console, Wikimedia Commons) */
  imageCredit?: string;
  /** Vidéo intégrée par le média dans l'article (YouTube) ou jointe au flux */
  video?: Video;
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
  /** Identifiant YouTube de la bande-annonce officielle (vérifié au build via YouTube) */
  youtube?: string;
  /** Bande-annonce retenue au build (YouTube vérifié, sinon RAWG) */
  video?: Video;
}

/** Jeu du calendrier des sorties (semaine / mois). */
export interface CalendarGame {
  id: string;
  title: string;
  /** Date de sortie AAAA-MM-JJ */
  date: string;
  /** Note Metacritic (base de jeux RAWG) */
  rating?: number;
  platforms: string[];
  image?: string;
  url?: string;
  /** Bande-annonce (Steam ou RAWG) */
  video?: Video;
}

export interface CalendarData {
  updatedAt?: string;
  source?: "RAWG" | "Steam";
  games: CalendarGame[];
  /** Visuels des grosses sorties (id de releases.json → URL) */
  releaseImages: Record<string, string>;
  /** Bandes-annonces des grosses sorties (id de releases.json → vidéo) */
  releaseVideos: Record<string, Video>;
  /** Photos libres des consoles (thème → photo), pour les articles sans image */
  consolePhotos: Record<string, { url: string; credit: string; page: string }>;
  /** Jeux populaires (RAWG) pour la recherche ; date facultative */
  database: (Omit<CalendarGame, "date"> & { date?: string; playtime?: number; genres?: string[] })[];
}

/** Jeu affiché dans la recherche (base RAWG, calendrier, sorties, jeux gratuits). */
export interface SearchGame {
  id: string;
  title: string;
  date?: string;
  platforms: string[];
  image?: string;
  /** Lien externe (fiche RAWG, Steam, boutique) ou page interne commençant par « / » */
  url?: string;
  rating?: number;
  video?: Video;
  note?: string;
  /** Temps de jeu moyen (heures, joueurs RAWG) */
  playtime?: number;
  genres?: string[];
  /** Autre titre (ex. titre japonais d'un anime), aussi cherché */
  aka?: string;
  /** Anime : nombre d'épisodes et prochain épisode (suivi des épisodes vus) */
  anime?: { total?: number; duration?: number; next?: { episode: number; at: string } };
}

export interface SearchIndex {
  articles: Article[];
  games: SearchGame[];
  /** Mots connus et leur fréquence, pour corriger les fautes de frappe */
  vocab: Record<string, number>;
}

/** Jeu en promotion (boutique Steam, prix en euros). */
export interface Deal {
  id: string;
  title: string;
  store: string;
  discount: number;
  price?: string;
  oldPrice?: string;
  image?: string;
  url: string;
  until?: string;
}

export interface DealsData {
  updatedAt?: string;
  steam: Deal[];
}

/** Anime (AniList) : en cours de diffusion ou à venir. */
export interface Anime {
  id: string;
  title: string;
  /** Titre japonais romanisé, si différent */
  original?: string;
  image?: string;
  banner?: string;
  format?: string;
  episodes?: number;
  /** Durée d'un épisode en minutes */
  duration?: number;
  /** Prochain épisode (date ISO) */
  next?: { episode: number; at: string };
  /** Date de début AAAA-MM-JJ */
  start?: string;
  genres: string[];
  /** Note moyenne AniList sur 100 */
  score?: number;
  url?: string;
  /** Plateformes de streaming officielles */
  streaming: { site: string; url: string }[];
  /** Bande-annonce YouTube */
  trailer?: string;
}

export interface AnimeData {
  updatedAt?: string;
  airing: Anime[];
  upcoming: Anime[];
}
