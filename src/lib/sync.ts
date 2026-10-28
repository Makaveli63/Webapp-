"use client";

import { FOLLOWS_EVENT, FOLLOWS_KEY } from "@/lib/follows";
import { mergePlayers, reloadPlayer, type PlayerState } from "@/lib/player";
import { rpc } from "@/lib/social";
import { cleanTracker, mergeTrackers, TRACKER_EVENT, TRACKER_KEY, type Tracker } from "@/lib/tracker";

/**
 * Synchronisation entre appareils par « code de synchronisation » (16 caractères, sans compte ni email).
 * Données synchronisées : favoris, jeux épinglés, collection, suivi (épisodes, jeux), réglage des notifications,
 * profil joueur (pseudo, XP) et identifiant anonyme de l'appareil.
 * Fusion sans perte : on réunit le contenu des deux appareils (rien n'est effacé par erreur).
 */
const CODE_KEY = "gb-sync-code";
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // sans 0/O ni 1/I, faciles à confondre

type Item = { [k: string]: unknown };
interface Payload {
  v: 1;
  favoris: Item[];
  epingles: string[];
  collection: { owned: Item[]; wanted: Item[] };
  notif?: string | null;
  suivi?: Tracker;
  /** Réglages d'affichage : style, couleur, transparence, thème clair / sombre, couleur du style GamingBase */
  affichage?: Record<string, string>;
  /** Jeux et animes suivis pour les notifications (🔔) */
  suivis?: Item[];
  /** Profil joueur (pseudo, XP, série, succès) */
  joueur?: PlayerState | null;
  /** Identifiant anonyme commun aux appareils liés : même pseudo réservé, mêmes j'aime */
  voter?: string | null;
}

// Clés des réglages d'affichage synchronisés (public/theme.js les lit au chargement de chaque page).
const DISPLAY_KEYS = ["gb-style", "gb-tint", "gb-glass", "gb-theme", "gb-accent"];
const displayLocal = (): Record<string, string> | undefined => {
  const out: Record<string, string> = {};
  try {
    for (const k of DISPLAY_KEYS) {
      const v = localStorage.getItem(k);
      if (v && /^[a-z0-9-]{1,20}$/.test(v)) out[k] = v;
    }
  } catch {
    /* stockage indisponible */
  }
  return Object.keys(out).length ? out : undefined;
};

export function newCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join("");
}

/** « ABCD-EFGH-JKLM-NPQR » pour l'affichage ; accepte espaces, tirets et minuscules à la saisie. */
export const formatCode = (c: string) => c.match(/.{1,4}/g)?.join("-") ?? c;
export const parseCode = (input: string) => input.toUpperCase().replace(/[^A-Z0-9]/g, "");

export function savedCode(): string | null {
  try {
    return localStorage.getItem(CODE_KEY);
  } catch {
    return null;
  }
}

function setSavedCode(code: string | null) {
  try {
    if (code) localStorage.setItem(CODE_KEY, code);
    else localStorage.removeItem(CODE_KEY);
  } catch {
    /* stockage indisponible */
  }
}

const readJson = <T,>(key: string, fallback: T): T => {
  try {
    const v = JSON.parse(localStorage.getItem(key) ?? "null");
    return v ?? fallback;
  } catch {
    return fallback;
  }
};

function local(): Payload {
  const col = readJson<{ owned?: Item[]; wanted?: Item[] }>("gb-collection", {});
  let notif: string | null = null;
  try {
    notif = localStorage.getItem("gb-notif-prefs");
  } catch {
    /* rien */
  }
  return {
    v: 1,
    favoris: readJson<Item[]>("gb-favoris", []),
    epingles: readJson<string[]>("gb-epingles", []),
    collection: { owned: col.owned ?? [], wanted: col.wanted ?? [] },
    notif,
    suivi: cleanTracker(readJson<unknown>(TRACKER_KEY, {})),
    affichage: displayLocal(),
    suivis: readJson<Item[]>(FOLLOWS_KEY, []),
    joueur: readJson<PlayerState | null>("gb-joueur", null),
    voter: rawVoter(),
  };
}

function rawVoter(): string | null {
  try {
    return localStorage.getItem("gb-voter");
  } catch {
    return null;
  }
}

/** Réunion de deux listes d'objets, sans doublon (même identifiant), l'appareil courant en premier. */
function union(a: Item[], b: Item[], id: string): Item[] {
  const seen = new Set<unknown>();
  return [...a, ...b].filter((x) => x && !seen.has(x[id]) && seen.add(x[id]));
}

function merge(mine: Payload, theirs: Partial<Payload> | null): Payload {
  if (!theirs) return mine;
  return {
    v: 1,
    favoris: union(mine.favoris, theirs.favoris ?? [], "slug").slice(0, 300),
    epingles: [...new Set([...mine.epingles, ...(theirs.epingles ?? [])])].slice(0, 50),
    collection: {
      owned: union(mine.collection.owned, theirs.collection?.owned ?? [], "id").slice(0, 500),
      wanted: union(mine.collection.wanted, theirs.collection?.wanted ?? [], "id").slice(0, 500),
    },
    notif: mine.notif ?? theirs.notif ?? null,
    suivi: mergeTrackers(cleanTracker(mine.suivi), cleanTracker(theirs.suivi)),
    // Affichage : le dernier appareil modifié l'emporte (celui-ci s'il a des changements).
    affichage: mine.affichage ?? theirs.affichage,
    suivis: union(mine.suivis ?? [], theirs.suivis ?? [], "id").slice(0, 60),
    joueur: mergePlayers(mine.joueur ?? null, theirs.joueur ?? null),
    // Le premier appareil relié donne son identifiant aux autres.
    voter: theirs.voter ?? mine.voter ?? null,
  };
}

function apply(p: Payload) {
  try {
    localStorage.setItem("gb-favoris", JSON.stringify(p.favoris));
    localStorage.setItem("gb-epingles", JSON.stringify(p.epingles));
    // Un jeu possédé n'est plus « voulu ».
    const owned = new Set(p.collection.owned.map((g) => g.id));
    localStorage.setItem("gb-collection", JSON.stringify({ owned: p.collection.owned, wanted: p.collection.wanted.filter((g) => !owned.has(g.id)) }));
    if (p.notif) localStorage.setItem("gb-notif-prefs", p.notif);
    if (p.suivi) localStorage.setItem(TRACKER_KEY, JSON.stringify(cleanTracker(p.suivi)));
    if (Array.isArray(p.suivis)) localStorage.setItem(FOLLOWS_KEY, JSON.stringify(p.suivis.filter((f) => f && typeof f.id === "string").slice(0, 60)));
    if (p.joueur) localStorage.setItem("gb-joueur", JSON.stringify(p.joueur));
    const before = rawVoter();
    if (p.voter && /^[\w-]{8,64}$/.test(p.voter) && p.voter !== before) {
      localStorage.setItem("gb-voter", p.voter);
      // Profil enregistré sous l'ancien identifiant de cet appareil : rattaché au nouveau.
      if (before) rpc("merge_player", { p_old: before, p_new: p.voter }).catch(() => {});
    }
    for (const [k, v] of Object.entries(p.affichage ?? {})) {
      if (DISPLAY_KEYS.includes(k) && typeof v === "string" && /^[a-z0-9-]{1,20}$/.test(v)) localStorage.setItem(k, v);
    }
  } catch {
    /* stockage indisponible */
  }
  for (const e of ["gb-favoris-change", "gb-epingles-change", "gb-collection-change", "gb-notif-prefs-change", TRACKER_EVENT, "gb-theme-change", FOLLOWS_EVENT]) {
    window.dispatchEvent(new Event(e));
  }
  reloadPlayer();
}

// ---------- Versions : une suppression faite sur un appareil doit se propager ----------
// Chaque envoi porte un numéro de version (rev). Si la version distante est celle qu'on a déjà vue,
// l'autre appareil n'a rien changé : on envoie l'état local tel quel (suppressions comprises).
// Sinon, et seulement si on a aussi des changements, on fusionne les deux.
const META_KEY = "gb-sync-meta";
const CHANGE_EVENTS = ["gb-favoris-change", "gb-epingles-change", "gb-collection-change", "gb-notif-prefs-change", TRACKER_EVENT, "gb-theme-change", FOLLOWS_EVENT, "gb-joueur"];
let applying = false;

interface Meta {
  rev?: string;
  dirty?: boolean;
}

const meta = (): Meta => readJson<Meta>(META_KEY, {});
const setMeta = (m: Meta) => {
  try {
    localStorage.setItem(META_KEY, JSON.stringify(m));
  } catch {
    /* stockage indisponible */
  }
};
const newRev = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

async function save(code: string, p: Payload) {
  const rev = newRev();
  await rpc<string>("sync_save", { p_code: code, p_data: { ...p, rev } });
  setMeta({ rev, dirty: false });
}

/** Synchronise maintenant (au démarrage, après un changement, au retour sur l'app). */
export async function syncNow(code = savedCode()): Promise<void> {
  if (!code) return;
  const m = meta();
  const remote = await rpc<(Partial<Payload> & { rev?: string }) | null>("sync_load", { p_code: code });
  if (!remote) return save(code, local());
  if (remote.rev === m.rev) {
    if (m.dirty) await save(code, local());
    return;
  }
  // L'autre appareil a changé quelque chose.
  // Un envoi sans « suivi » (ancienne version du site) ne doit pas effacer le suivi de cet appareil.
  const next = m.dirty ? merge(local(), remote) : merge({ ...EMPTY_PAYLOAD, suivi: remote.suivi ? undefined : local().suivi }, remote);
  applying = true;
  apply(next);
  applying = false;
  if (m.dirty) await save(code, next);
  else setMeta({ rev: remote.rev, dirty: false });
}

const EMPTY_PAYLOAD: Payload = { v: 1, favoris: [], epingles: [], collection: { owned: [], wanted: [] }, notif: null, suivi: { anime: {}, games: {}, log: {} } };

/** Relie cet appareil à un code (nouveau, ou saisi depuis un autre appareil) : on réunit les deux. */
export async function linkDevice(code: string) {
  setMeta({ dirty: true });
  await syncNow(code);
  setSavedCode(code);
}

export function unlinkDevice() {
  setSavedCode(null);
  setMeta({});
}

/** À appeler une fois (layout) : suit les changements locaux et synchronise en arrière-plan. */
export function startAutoSync(onError?: (e: Error) => void): () => void {
  let timer: number | undefined;
  let last = 0;
  const run = () => {
    last = Date.now();
    syncNow().catch((e) => onError?.(e as Error));
  };
  const changed = () => {
    if (applying || !savedCode()) return;
    setMeta({ ...meta(), dirty: true });
    window.clearTimeout(timer);
    timer = window.setTimeout(run, 2500);
  };
  const visible = () => {
    if (document.visibilityState === "visible" && Date.now() - last > 60_000) run();
  };
  CHANGE_EVENTS.forEach((e) => window.addEventListener(e, changed));
  document.addEventListener("visibilitychange", visible);
  if (savedCode()) run();
  return () => {
    window.clearTimeout(timer);
    CHANGE_EVENTS.forEach((e) => window.removeEventListener(e, changed));
    document.removeEventListener("visibilitychange", visible);
  };
}
