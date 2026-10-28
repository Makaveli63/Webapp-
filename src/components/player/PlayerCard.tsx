"use client";

import { Check, Pencil } from "lucide-react";
import { useEffect, useState, useSyncExternalStore, type FormEvent } from "react";
import { BADGES, checkPseudo, levelOf, onPlayer, readPlayer, savePlayer, STREAK_BONUS, titleOf, XP_RULES, type PlayerState } from "@/lib/player";
import { AVATARS, BADGE_ICONS, PlayerAvatar } from "./PlayerAvatar";
import { RoleBadge } from "./RoleBadge";

const MESSAGES: Record<string, string> = {
  PSEUDO_PRIS: "Ce pseudo est déjà pris.",
  PSEUDO_FORMAT: "3 à 20 caractères : lettres, chiffres, point, tiret ou _.",
  PROPOS_INTERDITS: "Ce pseudo n'est pas accepté.",
};
const nf = new Intl.NumberFormat("fr-FR");

// Profil lu dans le stockage de l'appareil ; mis à jour à chaque gain d'XP.
const subscribe = (cb: () => void) => onPlayer(cb);
const EMPTY_SNAPSHOT = { pseudo: "", avatar: 0, xp: 0 } as PlayerState;
function usePlayer(): PlayerState | null {
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);
  const state = useSyncExternalStore(subscribe, readPlayer, () => EMPTY_SNAPSHOT);
  return ready ? state : null;
}

/** Carte « profil joueur » de Mon espace : création du pseudo, puis niveau, série, gains d'XP et succès. */
export function PlayerCard() {
  const player = usePlayer();
  const [editing, setEditing] = useState(false);
  if (!player) return <div className="glass h-40 rounded-2xl" aria-hidden />;
  if (!player.pseudo || editing) return <CreateProfile player={player} onDone={() => setEditing(false)} canCancel={!!player.pseudo} />;
  return <Profile player={player} onEdit={() => setEditing(true)} />;
}

function CreateProfile({ player, onDone, canCancel }: { player: PlayerState; onDone: () => void; canCancel: boolean }) {
  const [pseudo, setPseudo] = useState(player.pseudo);
  const [avatar, setAvatar] = useState(player.avatar);
  const [status, setStatus] = useState<string>(""); // "", "ok" ou un code d'erreur
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Disponibilité vérifiée pendant la saisie (petite pause pour ne pas interroger à chaque lettre).
  useEffect(() => {
    const value = pseudo.trim();
    if (!value || value === player.pseudo) return setStatus(value ? "ok" : "");
    const t = window.setTimeout(() => checkPseudo(value).then(setStatus), 350);
    return () => window.clearTimeout(t);
  }, [pseudo, player.pseudo]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      await savePlayer(pseudo, avatar);
      onDone();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const level = levelOf(player.xp).level;
  return (
    <form onSubmit={submit} className="glass rounded-2xl p-4 sm:p-5">
      <div className="flex items-center gap-4">
        <PlayerAvatar avatar={avatar} className="size-16 ring-4 ring-accent/30" iconClass="size-8" />
        <div className="min-w-0">
          <h2 className="text-lg font-bold text-heading">{canCancel ? "Modifier mon profil" : "Crée ton profil de joueur"}</h2>
          <p className="text-sm text-muted">
            {player.xp > 0 ? `Tu as déjà ${nf.format(player.xp)} XP (niveau ${level}) : ils sont gardés.` : "Ton pseudo et ton niveau apparaîtront dans les commentaires."}
          </p>
        </div>
      </div>

      <label htmlFor="player-pseudo" className="mt-4 block text-xs font-semibold uppercase tracking-wide text-muted">
        Pseudo
      </label>
      <div className="mt-1.5 flex items-center gap-2 rounded-xl border border-border bg-bg px-3 focus-within:border-accent">
        <input
          id="player-pseudo"
          value={pseudo}
          onChange={(e) => setPseudo(e.target.value)}
          maxLength={20}
          autoComplete="nickname"
          placeholder="Ex. Kenji_RPG"
          className="min-w-0 flex-1 bg-transparent py-2.5 text-base focus:outline-none"
        />
        {status === "ok" && pseudo.trim() && (
          <span className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
            <Check className="size-3.5" aria-hidden /> Disponible
          </span>
        )}
      </div>
      <p className={`mt-1.5 text-xs ${status && status !== "ok" ? "text-red-600 dark:text-red-400" : "text-muted"}`}>
        {status && status !== "ok" ? MESSAGES[status] ?? status : "3 à 20 caractères. Personne d'autre ne pourra le prendre."}
      </p>

      <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-muted">Avatar</p>
      <div role="radiogroup" aria-label="Avatar" className="mt-2 flex flex-wrap gap-2.5">
        {AVATARS.map((a, i) => (
          <button
            key={a.name}
            type="button"
            role="radio"
            aria-checked={avatar === i}
            aria-label={a.name}
            onClick={() => setAvatar(i)}
            className={`rounded-full transition-transform ${avatar === i ? "scale-110 ring-2 ring-accent ring-offset-2 ring-offset-[var(--surface)]" : "opacity-80 hover:opacity-100"}`}
          >
            <PlayerAvatar avatar={i} className="size-10" iconClass="size-5" />
          </button>
        ))}
      </div>

      {error && <p className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</p>}
      <div className="mt-5 flex flex-wrap items-center gap-2">
        <button
          type="submit"
          disabled={saving || status !== "ok"}
          className="rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
        >
          {saving ? "Enregistrement…" : canCancel ? "Enregistrer" : `Commencer au niveau ${level}`}
        </button>
        {canCancel && (
          <button type="button" onClick={onDone} className="rounded-full px-4 py-2.5 text-sm font-semibold text-muted hover:text-fg">
            Annuler
          </button>
        )}
      </div>
    </form>
  );
}

function Profile({ player, onEdit }: { player: PlayerState; onEdit: () => void }) {
  const { level, into, need } = levelOf(player.xp);
  const progress = into / need;
  const R = 42;
  const C = 2 * Math.PI * R;
  const rules = Object.values(XP_RULES);
  return (
    <section aria-labelledby="player-title" className="glass rounded-2xl p-4 sm:p-5">
      <div className="flex items-center gap-4">
        <div className="relative size-24 shrink-0 sm:size-28" role="img" aria-label={`Niveau ${level}, ${into} XP sur ${need} pour le niveau ${level + 1}`}>
          <svg viewBox="0 0 100 100" className="level-ring size-full -rotate-90">
            <circle cx="50" cy="50" r={R} fill="none" stroke="var(--border)" strokeWidth="10" />
            <circle cx="50" cy="50" r={R} fill="none" stroke="var(--accent)" strokeWidth="10" strokeLinecap="round" strokeDasharray={C} strokeDashoffset={C * (1 - progress)} />
          </svg>
          <span className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted">Niveau</span>
            <span className="text-3xl font-extrabold leading-none text-heading tabular-nums">{level}</span>
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <PlayerAvatar avatar={player.avatar} className="size-7" iconClass="size-4" />
            <h2 id="player-title" className="truncate text-xl font-bold text-heading">{player.pseudo}</h2>
          </div>
          <span className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <RoleBadge pseudo={player.pseudo} role={player.role} className="text-xs" />
            <span className="inline-flex rounded-full bg-accent/12 px-2.5 py-0.5 text-xs font-semibold text-accent">{titleOf(level)}</span>
          </span>
          <p className="mt-1.5 text-sm text-muted tabular-nums">
            {nf.format(into)} / {nf.format(need)} XP avant le niveau {level + 1}
          </p>
        </div>
        <button type="button" onClick={onEdit} aria-label="Modifier mon profil" className="self-start rounded-full p-2 text-muted hover:bg-surface-2 hover:text-fg">
          <Pencil className="size-4" aria-hidden />
        </button>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2">
        {(
          [
            [player.streak.days, player.streak.days > 1 ? "jours de suite" : "jour de suite"],
            [player.stats.reads, "actus lues"],
            [player.badges.length, `succès sur ${BADGES.length}`],
          ] as const
        ).map(([n, label]) => (
          <div key={label} className="rounded-xl bg-surface-2 px-3 py-2">
            <p className="text-lg font-bold text-heading tabular-nums">{nf.format(n)}</p>
            <p className="text-xs text-muted">{label}</p>
          </div>
        ))}
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">Gagner de l&apos;XP</h3>
          <ul className="mt-2 divide-y divide-border rounded-xl bg-surface-2">
            {rules.map((r) => (
              <li key={r.label} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                <span className="min-w-0">
                  <span className="text-fg">{r.label}</span>
                  {r.note && <span className="block text-xs text-muted">{r.note}</span>}
                </span>
                <span className="shrink-0 font-bold text-accent tabular-nums">+{r.xp}</span>
              </li>
            ))}
            <li className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
              <span className="text-fg">Bonus tous les 7 jours de suite</span>
              <span className="shrink-0 font-bold text-accent tabular-nums">+{STREAK_BONUS}</span>
            </li>
          </ul>
        </div>
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">Succès</h3>
          <ul className="mt-2 grid grid-cols-3 gap-2">
            {BADGES.map((b) => {
              const got = player.badges.includes(b.id);
              const { Icon, color } = BADGE_ICONS[b.id];
              return (
                <li key={b.id} title={b.hint} className={`flex flex-col items-center gap-1 rounded-xl bg-surface-2 px-2 py-3 text-center ${got ? "" : "opacity-40"}`}>
                  <Icon className={`size-6 ${got ? color : "text-muted"}`} aria-hidden />
                  <span className="text-xs font-semibold text-heading">{b.label}</span>
                  <span className="text-[10px] leading-tight text-muted">{got ? "Obtenu" : b.hint}</span>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </section>
  );
}
