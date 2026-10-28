"use client";

/**
 * Commentaires et « j'aime » via Supabase (fonctions RPC de supabase/schema.sql).
 * L'URL et la clé « anon » sont publiques par conception : la base n'expose que des fonctions
 * qui filtrent, valident et limitent le débit côté serveur.
 */
// Accepte « https://xxx.supabase.co » comme « https://xxx.supabase.co/rest/v1/ ».
const URL = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").trim().replace(/\/+$/, "").replace(/\/rest\/v1$/, "");
const KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

export const socialEnabled = !!URL && !!KEY;

const ERRORS: Record<string, string> = {
  PROPOS_INTERDITS: "Message refusé : les insultes et propos haineux, racistes ou discriminatoires ne sont pas acceptés.",
  LIENS_INTERDITS: "Les liens ne sont pas autorisés dans les commentaires.",
  TROP_DE_MESSAGES: "Doucement ! Patientez un peu avant de réessayer.",
  PSEUDO_INVALIDE: "Le pseudo doit faire entre 2 et 30 caractères.",
  MESSAGE_INVALIDE: "Le message doit faire entre 2 et 1 000 caractères.",
  TROP_DE_VOTES: "Trop de votes depuis cette connexion pour ce sondage.",
  CODE_INVALIDE: "Code de synchronisation invalide (16 caractères).",
  TROP_DE_REQUETES: "Trop de synchronisations : réessaie dans une heure.",
  DONNEES_INVALIDES: "Données trop volumineuses pour être synchronisées.",
  PSEUDO_PRIS: "Ce pseudo est déjà pris par un autre joueur.",
  PSEUDO_FORMAT: "Le pseudo doit faire 3 à 20 caractères : lettres, chiffres, point, tiret ou _.",
};

/** Fichier SQL qui crée chaque fonction : le message d'erreur indique le bon fichier à exécuter. */
const SQL_FILES: Record<string, string> = {
  track_view: "stats.sql", admin_set_password: "stats.sql", admin_stats: "stats.sql", admin_moderate: "stats.sql",
  admin_set_notifications: "notifications.sql",
  sync_save: "extras.sql", sync_load: "extras.sql",
  toggle_dislike: "dislikes.sql", get_dislikes: "dislikes.sql",
  check_pseudo: "profiles.sql", save_player: "profiles.sql", merge_player: "profiles.sql", get_player: "profiles.sql", get_players: "profiles.sql",
  rate_game: "community.sql", get_game_rating: "community.sql", predict_game: "community.sql", get_predictions: "community.sql",
  get_my_activity: "community.sql", get_author_badges: "community.sql", admin_publish_article: "community.sql",
  admin_delete_article: "community.sql", get_published_articles: "community.sql",
};

export async function rpc<T>(fn: string, args: Record<string, unknown>): Promise<T> {
  const res = await fetch(`${URL}/rest/v1/rpc/${fn}`, {
    method: "POST",
    // Nouvelle clé « publishable » (sb_publishable_…) : en-tête apikey seul ; ancienne clé « anon » (JWT) : aussi en Bearer.
    headers: { apikey: KEY, ...(KEY.startsWith("eyJ") ? { Authorization: `Bearer ${KEY}` } : {}), "Content-Type": "application/json" },
    body: JSON.stringify(args),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const code = Object.keys(ERRORS).find((k) => String(body?.message ?? "").includes(k));
    if (code) throw new Error(ERRORS[code]);
    // Fonction absente de la base : le fichier SQL correspondant n'a pas été exécuté dans Supabase.
    if (body?.code === "PGRST202" || body?.code === "42883") {
      const file = SQL_FILES[fn] ?? "schema.sql";
      throw new Error(`Service pas encore installé : exécute supabase/${file} dans Supabase (SQL Editor).`);
    }
    throw new Error("Service momentanément indisponible, réessayez plus tard.");
  }
  return res.json() as Promise<T>;
}

/** J'aime et je n'aime pas s'excluent : chaque bouton prévient l'autre quand il s'active. */
export type Reaction = { type: "article" | "comment"; id: string; kind: "like" | "dislike" };
const REACTION_EVENT = "gb-reaction";
export function emitReaction(r: Reaction) {
  window.dispatchEvent(new CustomEvent<Reaction>(REACTION_EVENT, { detail: r }));
}
export function onReaction(handler: (r: Reaction) => void): () => void {
  const listener = (e: Event) => handler((e as CustomEvent<Reaction>).detail);
  window.addEventListener(REACTION_EVENT, listener);
  return () => window.removeEventListener(REACTION_EVENT, listener);
}

/** Identifiant anonyme du visiteur (sur cet appareil) : permet de retirer son propre « j'aime ». */
export function voterId(): string {
  try {
    let id = localStorage.getItem("gb-voter");
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem("gb-voter", id);
    }
    return id;
  } catch {
    return "anonyme-" + Math.random().toString(36).slice(2, 12);
  }
}

export function savedPseudo(): string {
  try {
    return localStorage.getItem("gb-pseudo") ?? "";
  } catch {
    return "";
  }
}

export function savePseudo(p: string) {
  try {
    localStorage.setItem("gb-pseudo", p);
  } catch {
    /* ignoré */
  }
}

/** « il y a 5 min », « il y a 2 h », « 3 nov. » */
export function timeAgo(iso: string): string {
  const min = Math.floor((Date.now() - Date.parse(iso)) / 60_000);
  if (min < 1) return "à l'instant";
  if (min < 60) return `il y a ${min} min`;
  if (min < 1440) return `il y a ${Math.floor(min / 60)} h`;
  return new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short" }).format(new Date(iso));
}

/**
 * Session administrateur : le mot de passe saisi sur /admin/ reste dans l'onglet (sessionStorage),
 * jamais sur le disque ; il permet aussi de modérer directement sous les articles.
 */
export const ADMIN_SESSION_KEY = "gb-admin";

export function adminPassword(): string {
  try {
    return sessionStorage.getItem(ADMIN_SESSION_KEY) ?? "";
  } catch {
    return "";
  }
}

export function clearAdminSession() {
  try {
    sessionStorage.removeItem(ADMIN_SESSION_KEY);
  } catch {
    // stockage indisponible : rien à effacer
  }
}

export const ADMIN_ERRORS: Record<string, string> = {
  ACCES_REFUSE: "Mot de passe incorrect.",
  TROP_DE_TENTATIVES: "Trop de tentatives : réessayez dans 15 minutes.",
  ARTICLE_INVALIDE: "Article refusé : vérifie le titre, le texte, l'image (https://) et la note (ex. 16/20).",
  MOT_DE_PASSE_NON_DEFINI:
    "Aucun mot de passe enregistré : dans Supabase (SQL Editor), lance select public.admin_set_password('…');",
};

/**
 * Appareil de l'administrateur : simple repère (pas un secret) posé après une connexion réussie,
 * pour afficher l'onglet « Admin » sur ses appareils seulement. Sans mot de passe, il ne donne accès à rien.
 */
const ADMIN_DEVICE_KEY = "gb-admin-appareil";
const ADMIN_DEVICE_EVENT = "gb-admin-appareil";

export function setAdminDevice(on: boolean) {
  try {
    if (on) localStorage.setItem(ADMIN_DEVICE_KEY, "1");
    else localStorage.removeItem(ADMIN_DEVICE_KEY);
    window.dispatchEvent(new Event(ADMIN_DEVICE_EVENT));
  } catch {
    // stockage indisponible (navigation privée) : l'onglet reste simplement masqué
  }
}

export function isAdminDevice(): boolean {
  try {
    return localStorage.getItem(ADMIN_DEVICE_KEY) === "1";
  } catch {
    return false;
  }
}

export function onAdminDeviceChange(listener: () => void): () => void {
  window.addEventListener(ADMIN_DEVICE_EVENT, listener);
  window.addEventListener("storage", listener);
  return () => {
    window.removeEventListener(ADMIN_DEVICE_EVENT, listener);
    window.removeEventListener("storage", listener);
  };
}
