// Modèles de données de l'application (typage strict).

export type Platform = "PC" | "PS5" | "Switch 2" | "Xbox" | "Mobile" | "Multi";

export const PLATFORMS: readonly Platform[] = [
  "PC",
  "PS5",
  "Switch 2",
  "Xbox",
  "Mobile",
  "Multi",
] as const;

export interface Article {
  slug: string;
  title: string;
  excerpt: string;
  /** Contenu Markdown */
  content: string;
  platforms: Platform[];
  tags: string[];
  author: string;
  /** Date ISO 8601 */
  publishedAt: string;
  source: { name: string; url?: string };
  /** true si l'article provient d'un flux RSS externe */
  external?: boolean;
}

export type Console = "PS5" | "Switch 2";

/** Niveau d'avancement de la scène pour une plage de firmwares. */
export type ExploitStatus =
  | "aucun" // aucune vulnérabilité publique connue
  | "recherche" // recherches / annonces sans publication
  | "poc" // preuve de concept publiée
  | "homebrew"; // outils homebrew publics et documentés

export type VulnerabilityKind =
  | "webkit"
  | "kernel"
  | "hyperviseur"
  | "bootrom"
  | "materiel"
  | "inconnu";

export interface FirmwareStatus {
  id: string;
  console: Console;
  /** Plage de firmware concernée, ex. "≤ 4.51" */
  firmwareRange: string;
  vulnerability: {
    kind: VulnerabilityKind;
    label: string;
  };
  status: ExploitStatus;
  /** Description de l'outillage disponible (pas de lien de téléchargement). */
  tooling: string;
  /** Slug du guide pédagogique associé */
  guideSlug?: string;
  updatedAt: string;
  notes?: string;
}

export interface ConsoleSummary {
  console: Console;
  latestFirmware: string;
  headline: string;
  status: ExploitStatus;
  updatedAt: string;
}

export interface Guide {
  slug: string;
  title: string;
  description: string;
  console: Console | "Général";
  level: "Débutant" | "Intermédiaire" | "Avancé";
  tags: string[];
  updatedAt: string;
  content: string;
}

export interface GlossaryTerm {
  slug: string;
  term: string;
  short: string;
  content: string;
}
