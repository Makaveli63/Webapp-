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
    throw new Error(code ? ERRORS[code] : "Service momentanément indisponible, réessayez plus tard.");
  }
  return res.json() as Promise<T>;
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
