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
  /** Résumé original rédigé automatiquement (IA) à partir de la source */
  aiSummary?: string;
  /** true si l'article provient d'un flux RSS externe */
  external?: boolean;
}
