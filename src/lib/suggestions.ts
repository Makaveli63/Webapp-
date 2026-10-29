/** Types et statuts des suggestions (mêmes valeurs que les contraintes de supabase/admin.sql). */
export const SUGGESTION_KINDS = ["Idée", "Bug", "Fonctionnalité"] as const;
export const SUGGESTION_STATUSES = ["En attente", "Validé", "En cours", "Refusé"] as const;
export type SuggestionStatus = (typeof SUGGESTION_STATUSES)[number];

export interface Suggestion {
  id: string;
  pseudo?: string | null;
  body: string;
  kind: string;
  status: SuggestionStatus;
  created_at: string;
  updated_at: string;
}

/** Pastille de statut : couleur + libellé (jamais la couleur seule). */
export const STATUS_STYLES: Record<SuggestionStatus, string> = {
  "En attente": "bg-surface-2 text-muted ring-border",
  Validé: "bg-emerald-500/12 text-emerald-700 ring-emerald-500/30 dark:text-emerald-400",
  "En cours": "bg-sky-500/12 text-sky-700 ring-sky-500/30 dark:text-sky-400",
  Refusé: "bg-red-500/10 text-red-700 ring-red-500/30 dark:text-red-400",
};
