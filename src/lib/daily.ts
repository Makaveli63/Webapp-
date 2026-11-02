/** Jeu du jour : choix du jeu (le même pour tout le monde), commun à la page du jeu et à la carte de l'accueil. */
export interface DailyCandidate {
  title: string;
  image: string;
  year: string;
  genres: string[];
  platforms: string[];
  slug: string;
  /** Note de la presse (Metacritic, via RAWG) */
  rating?: number;
  /** Durée de vie moyenne, en heures */
  playtime?: number;
}

export const DAILY_KEY = "gb-daily";
export const DAILY_MAX_TRIES = 6;
const START = Date.UTC(2026, 9, 28); // n° 1

/** Jour à Paris (AAAA-MM-JJ) : le jeu change à minuit pour tout le monde. */
export const parisDay = (d = new Date()) => new Intl.DateTimeFormat("fr-CA", { timeZone: "Europe/Paris" }).format(d);

/** Petit hachage stable : même jour + même titre = même nombre, sur tous les appareils. */
export function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

export function dailyAnswer<T extends { title: string }>(candidates: T[], day: string): T | null {
  if (!candidates.length) return null;
  return candidates.reduce((best, c) => (hash(`${day}|${c.title}`) < hash(`${day}|${best.title}`) ? c : best));
}

export const dailyNumber = (day: string) => Math.floor((Date.parse(`${day}T00:00:00Z`) - START) / 86_400_000) + 1;
