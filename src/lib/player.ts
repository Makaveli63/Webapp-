/**
 * Profil joueur : pseudo, avatar, XP et niveau, séries de jours et succès.
 * Tout est gardé sur l'appareil ; le pseudo et l'XP sont envoyés au serveur (pseudo unique, niveau visible
 * dans les commentaires) quand le service est installé (supabase/profiles.sql).
 */
import { rpc, savePseudo, socialEnabled, voterId } from "./social";

const KEY = "gb-joueur";
const EVENT = "gb-joueur";

export type XpAction = "read" | "daily" | "comment" | "follow" | "visit";

/** Gains d'XP, avec leur limite (par jour, ou une seule fois par contenu). */
export const XP_RULES: Record<XpAction, { xp: number; label: string; note?: string; perDay?: number }> = {
  read: { xp: 5, label: "Lire une actu", note: "10 par jour maximum", perDay: 10 },
  daily: { xp: 15, label: "Trouver le jeu du jour", perDay: 1 },
  comment: { xp: 20, label: "Commenter un article", note: "5 par jour maximum", perDay: 5 },
  follow: { xp: 5, label: "Suivre un jeu ou un anime", note: "une fois par jeu" },
  visit: { xp: 10, label: "Revenir chaque jour", perDay: 1 },
};
/** Bonus de série : tous les 7 jours d'affilée. */
export const STREAK_BONUS = 50;

export const TITLES = [
  { from: 1, name: "Novice" },
  { from: 5, name: "Joueur" },
  { from: 10, name: "Habitué" },
  { from: 20, name: "Vétéran" },
  { from: 35, name: "Expert" },
  { from: 50, name: "Légende" },
] as const;

export const BADGES = [
  { id: "streak7", label: "7 jours", hint: "Revenir 7 jours de suite" },
  { id: "comment1", label: "1er avis", hint: "Publier un premier commentaire" },
  { id: "reads50", label: "Lecteur", hint: "Lire 50 actus" },
  { id: "anime10", label: "Otaku", hint: "Lire 10 actus anime" },
  { id: "daily10", label: "Détective", hint: "Trouver 10 jeux du jour" },
  { id: "level50", label: "Légende", hint: "Atteindre le niveau 50" },
] as const;
export type BadgeId = (typeof BADGES)[number]["id"];

export interface PlayerState {
  pseudo: string;
  avatar: number;
  xp: number;
  /** Jour (AAAA-MM-JJ, heure de Paris) → nombre de gains par action ce jour-là (seul le jour courant est gardé) */
  today: { day: string; counts: Partial<Record<XpAction, number>> };
  streak: { last: string; days: number };
  /** Contenus déjà comptés (« read:slug », « follow:id ») : pas d'XP deux fois pour la même chose */
  seen: string[];
  stats: { reads: number; anime: number; comments: number; dailies: number; follows: number };
  badges: BadgeId[];
}

const EMPTY: PlayerState = {
  pseudo: "",
  avatar: 0,
  xp: 0,
  today: { day: "", counts: {} },
  streak: { last: "", days: 0 },
  seen: [],
  stats: { reads: 0, anime: 0, comments: 0, dailies: 0, follows: 0 },
  badges: [],
};

const parisDay = (d = new Date()) => new Intl.DateTimeFormat("fr-CA", { timeZone: "Europe/Paris" }).format(d);
const dayBefore = (day: string) => parisDay(new Date(Date.parse(`${day}T12:00:00Z`) - 86_400_000));

/** XP nécessaire pour passer du niveau n au suivant : 100, 150, 200… */
const need = (level: number) => 100 + 50 * (level - 1);

export function levelOf(xp: number) {
  let level = 1;
  let rest = Math.max(0, xp);
  while (rest >= need(level)) {
    rest -= need(level);
    level++;
  }
  return { level, into: rest, need: need(level) };
}
export const titleOf = (level: number) => [...TITLES].reverse().find((t) => level >= t.from)!.name;

let cache: PlayerState | null = null;
export function readPlayer(): PlayerState {
  if (cache) return cache;
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? "null") as Partial<PlayerState> | null;
    cache = raw ? { ...EMPTY, ...raw, stats: { ...EMPTY.stats, ...raw.stats } } : { ...EMPTY };
  } catch {
    cache = { ...EMPTY };
  }
  return cache;
}
function write(next: PlayerState) {
  cache = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* stockage plein ou bloqué : le profil vit le temps de la visite */
  }
}

export type XpEvent = { gain: number; label: string; level: number; leveledUp: boolean; badge?: string; quiet?: boolean };
export function onPlayer(handler: (e: XpEvent | null) => void): () => void {
  const listener = (e: Event) => handler((e as CustomEvent<XpEvent | null>).detail);
  window.addEventListener(EVENT, listener);
  return () => window.removeEventListener(EVENT, listener);
}
const emit = (detail: XpEvent | null) => window.dispatchEvent(new CustomEvent(EVENT, { detail }));

// Envoi au serveur regroupé : plusieurs gains rapprochés = une seule requête.
let syncTimer = 0;
function scheduleSync() {
  if (!socialEnabled || !readPlayer().pseudo) return;
  window.clearTimeout(syncTimer);
  syncTimer = window.setTimeout(() => {
    const p = readPlayer();
    rpc<{ xp: number }>("save_player", { p_voter: voterId(), p_pseudo: p.pseudo, p_avatar: p.avatar, p_xp: p.xp })
      .then((r) => r && r.xp > readPlayer().xp && write({ ...readPlayer(), xp: r.xp }))
      .catch(() => {}); // service absent ou hors ligne : réessayé au prochain gain
  }, 3000);
}

function unlock(state: PlayerState): BadgeId | undefined {
  const s = state.stats;
  const earned: Record<BadgeId, boolean> = {
    streak7: state.streak.days >= 7,
    comment1: s.comments >= 1,
    reads50: s.reads >= 50,
    anime10: s.anime >= 10,
    daily10: s.dailies >= 10,
    level50: levelOf(state.xp).level >= 50,
  };
  const fresh = BADGES.find((b) => earned[b.id] && !state.badges.includes(b.id));
  if (fresh) state.badges = [...state.badges, fresh.id];
  return fresh?.id;
}

/**
 * Gagne de l'XP pour une action (sans effet si la limite du jour est atteinte ou le contenu déjà compté).
 * key : identifiant du contenu (article, jeu suivi) ; anime : actu de la rubrique Anime ;
 * quiet : pas d'île (une autre bulle s'affiche déjà au même endroit), sauf pour un niveau ou un succès.
 */
export function award(action: XpAction, key?: string, opts: { anime?: boolean; quiet?: boolean } = {}): number {
  const now = parisDay();
  const state: PlayerState = structuredClone(readPlayer());
  if (state.today.day !== now) state.today = { day: now, counts: {} };
  const rule = XP_RULES[action];
  const done = state.today.counts[action] ?? 0;
  if (rule.perDay && done >= rule.perDay) return 0;
  const seenKey = key ? `${action}:${key}` : "";
  if (seenKey && state.seen.includes(seenKey)) return 0;

  const before = levelOf(state.xp).level;
  let gain = rule.xp;
  let label = rule.label;
  state.today.counts[action] = done + 1;
  if (seenKey) state.seen = [...state.seen.slice(-499), seenKey];
  if (action === "read") {
    state.stats.reads++;
    if (opts.anime) state.stats.anime++;
  }
  if (action === "comment") state.stats.comments++;
  if (action === "daily") state.stats.dailies++;
  if (action === "follow") state.stats.follows++;
  if (action === "visit") {
    // Série : hier → +1 jour ; sinon elle repart à 1.
    state.streak = { last: now, days: state.streak.last === dayBefore(now) ? state.streak.days + 1 : 1 };
    if (state.streak.days % 7 === 0) {
      gain += STREAK_BONUS;
      label = `${state.streak.days} jours de suite`;
    }
  }
  state.xp += gain;
  const badgeId = unlock(state);
  write(state);
  const level = levelOf(state.xp).level;
  emit({ gain, label, level, leveledUp: level > before, badge: badgeId && BADGES.find((b) => b.id === badgeId)!.label, quiet: opts.quiet });
  scheduleSync();
  return gain;
}

/** Profil réécrit par la synchronisation entre appareils : on le relit et l'affichage suit. */
export function reloadPlayer() {
  cache = null;
  emit(null);
}

/** Réunion de deux profils (appareils liés) : rien n'est perdu, on garde le plus avancé de chaque côté. */
export function mergePlayers(a: Partial<PlayerState> | null, b: Partial<PlayerState> | null): PlayerState | null {
  if (!a && !b) return null;
  const x: PlayerState = { ...EMPTY, ...a, stats: { ...EMPTY.stats, ...a?.stats } };
  const y: PlayerState = { ...EMPTY, ...b, stats: { ...EMPTY.stats, ...b?.stats } };
  // Pseudo et avatar : ceux du profil qui a le plus d'XP (ou le seul qui en a un).
  const lead = !x.pseudo ? y : !y.pseudo ? x : y.xp > x.xp ? y : x;
  const stats = Object.fromEntries(Object.keys(EMPTY.stats).map((k) => [k, Math.max(x.stats[k as keyof PlayerState["stats"]], y.stats[k as keyof PlayerState["stats"]])])) as PlayerState["stats"];
  const streak = x.streak.last === y.streak.last ? (x.streak.days >= y.streak.days ? x.streak : y.streak) : x.streak.last > y.streak.last ? x.streak : y.streak;
  const today =
    x.today.day === y.today.day
      ? { day: x.today.day, counts: Object.fromEntries(Object.keys(XP_RULES).map((k) => [k, Math.max(x.today.counts[k as XpAction] ?? 0, y.today.counts[k as XpAction] ?? 0)])) }
      : x.today.day > y.today.day ? x.today : y.today;
  return {
    pseudo: lead.pseudo,
    avatar: lead.avatar,
    xp: Math.max(x.xp, y.xp),
    today,
    streak,
    seen: [...new Set([...x.seen, ...y.seen])].slice(-500),
    stats,
    badges: [...new Set([...x.badges, ...y.badges])],
  };
}

/** Vérifie qu'un pseudo est libre : 'ok' ou le code d'erreur (PSEUDO_PRIS, PSEUDO_FORMAT…). */
export async function checkPseudo(pseudo: string): Promise<string> {
  if (!/^[\p{L}\p{N}_.-]{3,20}$/u.test(pseudo.trim())) return "PSEUDO_FORMAT";
  if (!socialEnabled) return "ok";
  return rpc<string>("check_pseudo", { p_pseudo: pseudo.trim(), p_voter: voterId() }).catch(() => "ok");
}

/**
 * Crée ou modifie le profil. Le serveur réserve le pseudo ; s'il n'est pas encore installé, le profil reste
 * sur l'appareil (le pseudo sera réservé dès que le service répondra).
 */
export async function savePlayer(pseudo: string, avatar: number): Promise<void> {
  const clean = pseudo.trim();
  if (socialEnabled) {
    try {
      const r = await rpc<{ xp: number }>("save_player", { p_voter: voterId(), p_pseudo: clean, p_avatar: avatar, p_xp: readPlayer().xp });
      if (r && r.xp > readPlayer().xp) write({ ...readPlayer(), xp: r.xp });
    } catch (err) {
      if (!/pas encore installé|indisponible/.test((err as Error).message)) throw err; // pseudo pris, grossier…
    }
  }
  write({ ...readPlayer(), pseudo: clean, avatar });
  savePseudo(clean); // même nom dans les commentaires
  emit(null);
}

/** Niveau des auteurs de commentaires (clé : pseudo en minuscules). */
export async function playersLevels(pseudos: string[]): Promise<Record<string, { xp: number; avatar: number }>> {
  if (!socialEnabled || !pseudos.length) return {};
  return rpc<Record<string, { xp: number; avatar: number }>>("get_players", { p_pseudos: [...new Set(pseudos)] }).catch(() => ({}));
}

/** Profil enregistré sur le serveur pour cet appareil (après un nettoyage du stockage du site). */
export async function restorePlayer(): Promise<void> {
  if (!socialEnabled || readPlayer().pseudo) return;
  const r = await rpc<{ pseudo: string; avatar: number; xp: number } | null>("get_player", { p_voter: voterId() }).catch(() => null);
  if (r?.pseudo) {
    write({ ...readPlayer(), pseudo: r.pseudo, avatar: r.avatar, xp: Math.max(r.xp, readPlayer().xp) });
    emit(null);
  }
}
