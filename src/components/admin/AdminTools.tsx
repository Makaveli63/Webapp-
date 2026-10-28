"use client";

import { CalendarPlus, Laptop, Rss, ThumbsDown, Trash2, Users } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from "react";
import { PlayerAvatar } from "@/components/player/PlayerAvatar";
import { RoleBadge } from "@/components/player/RoleBadge";
import { levelOf, roleOf, titleOf } from "@/lib/player";
import { ADMIN_ERRORS, rpc, timeAgo, voterId } from "@/lib/social";
import { PLATFORMS } from "@/types";

const nf = new Intl.NumberFormat("fr-FR");
const day = (iso: string) => new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", year: "numeric", timeZone: "Europe/Paris" }).format(new Date(iso));
const field = "w-full rounded-lg border border-border bg-bg px-3 py-2 text-base focus:border-accent focus:outline-none md:text-sm";
const message = (res: unknown) => (typeof res === "string" ? (ADMIN_ERRORS[res] ?? res) : "Réponse inattendue du serveur.");

/** Libellé lisible de cet appareil, enregistré à la connexion (« iPhone · appli », « Mac · Safari »…). */
export function deviceLabel(): string {
  const ua = navigator.userAgent;
  const ipad = /iPad/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
  const device = ipad ? "iPad" : /iPhone/.test(ua) ? "iPhone" : /Android/.test(ua) ? (/Mobile/.test(ua) ? "Android" : "Tablette Android") : /Mac/.test(ua) ? "Mac" : /Windows/.test(ua) ? "PC Windows" : /Linux/.test(ua) ? "Linux" : "Appareil";
  if (ua.includes("GamingBaseApp")) return `${device} · appli`;
  const browser = /Edg\//.test(ua) ? "Edge" : /Firefox\//.test(ua) ? "Firefox" : /Chrome\//.test(ua) ? "Chrome" : /Safari\//.test(ua) ? "Safari" : "navigateur";
  return `${device} · ${browser}`;
}

function Panel({ icon, title, hint, children }: { icon: ReactNode; title: string; hint?: string; children: ReactNode }) {
  return (
    <section className="rounded-xl glass p-4">
      <h2 className="flex items-center gap-2 font-semibold text-heading">
        {icon}
        {title}
      </h2>
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
      <div className="mt-3">{children}</div>
    </section>
  );
}

/** Appareils connectés en admin ; « Oublier » retire l'onglet Admin et le mot de passe enregistré de cet appareil. */
export function AdminDevices({ password }: { password: string }) {
  const [list, setList] = useState<{ voter: string; label: string; first_seen: string; last_seen: string }[] | null>(null);
  const [error, setError] = useState("");
  const me = typeof window !== "undefined" ? voterId() : "";

  const load = useCallback(() => {
    rpc<typeof list | { error: string }>("admin_list_devices", { p_password: password })
      .then((r) => (Array.isArray(r) ? setList(r) : setError(message((r as { error?: string })?.error))))
      .catch((e) => setError((e as Error).message));
  }, [password]);
  useEffect(load, [load]);

  const forget = async (voter: string, label: string) => {
    if (!confirm(`Oublier « ${label} » ? Il perdra l'onglet Admin et son mot de passe enregistré.`)) return;
    const res = await rpc<string>("admin_forget_device", { p_password: password, p_voter: voter }).catch((e) => (e as Error).message);
    if (res !== "ok") return setError(message(res));
    load();
  };

  return (
    <Panel icon={<Laptop className="size-4 text-accent" aria-hidden />} title="Appareils connectés en admin" hint="Chaque appareil où tu t'es connecté au tableau de bord.">
      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      {list === null && !error && <p className="text-sm text-muted">Chargement…</p>}
      {list && (
        <ul className="divide-y divide-border">
          {list.map((d) => (
            <li key={d.voter} className="flex items-center gap-3 py-2 text-sm">
              <span className="min-w-0 flex-1">
                <span className="font-semibold text-heading">{d.label}</span>
                {d.voter === me && <span className="ml-2 rounded-full bg-emerald-600/15 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">Cet appareil</span>}
                <span className="block text-xs text-muted">
                  Vu {timeAgo(d.last_seen)} · ajouté le {day(d.first_seen)}
                </span>
              </span>
              <button type="button" onClick={() => forget(d.voter, d.label)} className="shrink-0 rounded-full px-3 py-1 text-xs font-semibold text-red-600 ring-1 ring-red-500/40 hover:bg-red-500/10 dark:text-red-400">
                Oublier
              </button>
            </li>
          ))}
          {list.length === 0 && <li className="py-2 text-sm text-muted">Aucun appareil.</li>}
        </ul>
      )}
    </Panel>
  );
}

interface Community {
  error?: string;
  players: { total: number; week: number; list: { pseudo: string; avatar: number; xp: number; role?: string | null; created_at: string; updated_at: string }[] };
  dislikes: { total: number; top: { slug: string; n: number }[] };
}

/** Joueurs inscrits (pseudos) et articles les moins aimés. */
export function AdminCommunity({ password, titles }: { password: string; titles: Record<string, string> }) {
  const [data, setData] = useState<Community | null>(null);
  const [error, setError] = useState("");
  const [all, setAll] = useState(false);
  const load = useCallback(() => {
    rpc<Community>("admin_community", { p_password: password })
      .then((r) => (r?.error ? setError(message(r.error)) : setData(r)))
      .catch((e) => setError((e as Error).message));
  }, [password]);
  useEffect(load, [load]);

  // Badge « Soutien » : ajouté ou retiré d'un toucher (visible à côté du pseudo dans les commentaires et le profil).
  const toggleSupport = async (pseudo: string, on: boolean) => {
    const res = await rpc<string>("admin_set_role", { p_password: password, p_pseudo: pseudo, p_role: on ? "Soutien" : null }).catch((e) => (e as Error).message);
    if (res !== "ok") return setError(message(res));
    load();
  };

  const players = data?.players.list ?? [];
  return (
    <>
      <Panel icon={<Users className="size-4 text-accent" aria-hidden />} title="Joueurs inscrits" hint="Profils de joueur créés (pseudo réservé), du plus récent au plus ancien.">
        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
        {data && (
          <>
            <p className="text-sm text-muted">
              <span className="text-2xl font-bold text-heading tabular-nums">{nf.format(data.players.total)}</span> inscrit{data.players.total > 1 ? "s" : ""} · {nf.format(data.players.week)} cette semaine
            </p>
            <ul className="mt-3 divide-y divide-border">
              {players.slice(0, all ? 300 : 12).map((p) => {
                const level = levelOf(p.xp).level;
                return (
                  <li key={p.pseudo} className="flex items-center gap-3 py-2 text-sm">
                    <PlayerAvatar avatar={p.avatar} className="size-8" iconClass="size-4" />
                    <span className="min-w-0 flex-1">
                      <span className="font-semibold text-heading">{p.pseudo}</span> <RoleBadge pseudo={p.pseudo} role={p.role} />
                      <span className="block text-xs text-muted">
                        Niveau {level} ({titleOf(level)}) · {nf.format(p.xp)} XP · inscrit le {day(p.created_at)} · actif {timeAgo(p.updated_at)}
                      </span>
                    </span>
                    {!roleOf(p.pseudo) && (
                      <button
                        type="button"
                        aria-pressed={p.role === "Soutien"}
                        onClick={() => toggleSupport(p.pseudo, p.role !== "Soutien")}
                        className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset ${p.role === "Soutien" ? "role-badge-support ring-transparent" : "text-muted ring-border hover:text-fg"}`}
                      >
                        {p.role === "Soutien" ? "Soutien ✓" : "+ Soutien"}
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
            {players.length > 12 && !all && (
              <button type="button" onClick={() => setAll(true)} className="mt-2 rounded-full glass-pill px-3 py-1.5 text-xs font-semibold text-heading ring-1 ring-inset ring-border">
                Voir les {nf.format(players.length)} joueurs
              </button>
            )}
          </>
        )}
      </Panel>
      {data && data.dislikes.total > 0 && (
        <Panel icon={<ThumbsDown className="size-4 text-muted" aria-hidden />} title="Articles les moins aimés" hint={`${nf.format(data.dislikes.total)} « je n'aime pas » au total.`}>
          <ol className="space-y-1.5 text-sm">
            {data.dislikes.top.map((d, i) => (
              <li key={d.slug} className="flex items-baseline gap-3">
                <span className="w-5 shrink-0 text-right tabular-nums text-muted">{i + 1}.</span>
                <Link href={`/actualites/${d.slug}`} className="min-w-0 flex-1 truncate text-fg hover:underline">
                  {titles[d.slug] ?? d.slug}
                </Link>
                <span className="shrink-0 font-semibold tabular-nums text-heading">{d.n} 👎</span>
              </li>
            ))}
          </ol>
        </Panel>
      )}
    </>
  );
}

/** Sources d'actus ajoutées à la main (flux RSS), lues à chaque mise à jour du site. */
export function AdminSources({ password }: { password: string }) {
  const [list, setList] = useState<{ id: string; name: string; url: string; category: string | null }[] | null>(null);
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [anime, setAnime] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState("");
  const load = useCallback(() => {
    rpc<typeof list>("get_sources", {})
      .then((r) => setList(Array.isArray(r) ? r : []))
      .catch((e) => setError((e as Error).message));
  }, []);
  useEffect(load, [load]);

  const add = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setDone("");
    const res = await rpc<string>("admin_add_source", { p_password: password, p_name: name.trim(), p_url: url.trim(), p_category: anime ? "Anime" : null }).catch(
      (err) => (err as Error).message,
    );
    if (res !== "ok") return setError(message(res));
    setDone(`« ${name.trim()} » ajoutée : ses articles arriveront à la prochaine mise à jour (moins d'une heure).`);
    setName("");
    setUrl("");
    setAnime(false);
    load();
  };
  const remove = async (id: string, label: string) => {
    if (!confirm(`Retirer la source « ${label} » ?`)) return;
    const res = await rpc<string>("admin_delete_source", { p_password: password, p_id: id }).catch((err) => (err as Error).message);
    if (res !== "ok") return setError(message(res));
    load();
  };

  return (
    <Panel
      icon={<Rss className="size-4 text-accent" aria-hidden />}
      title="Mes sources d'actus"
      hint="Ajoute le flux RSS d'un site (souvent son adresse suivie de /feed/ ou /rss). Seuls un résumé, un court extrait et le lien sont affichés, comme pour les autres sources."
    >
      <form onSubmit={add} className="grid gap-2 sm:grid-cols-[1fr_2fr_auto]">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nom (ex. Rockstar Mag)" maxLength={60} required aria-label="Nom de la source" className={field} />
        <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://exemple.fr/feed/" type="url" required aria-label="Adresse du flux RSS" className={field} />
        <button type="submit" className="rounded-full bg-accent px-4 py-2 text-sm font-semibold text-white hover:opacity-90">
          Ajouter
        </button>
        <label className="flex items-center gap-2 text-xs text-muted sm:col-span-3">
          <input type="checkbox" checked={anime} onChange={(e) => setAnime(e.target.checked)} className="size-4 accent-[var(--accent)]" /> Source d&apos;actus anime (rubrique Anime)
        </label>
      </form>
      {error && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>}
      {done && <p className="mt-2 text-sm text-emerald-700 dark:text-emerald-400">{done}</p>}
      {list && list.length > 0 && (
        <ul className="mt-3 divide-y divide-border">
          {list.map((s) => (
            <li key={s.id} className="flex items-center gap-3 py-2 text-sm">
              <span className="min-w-0 flex-1">
                <span className="font-semibold text-heading">{s.name}</span>
                {s.category === "Anime" && <span className="ml-2 text-xs text-pink-600 dark:text-pink-400">Anime</span>}
                <span className="block truncate text-xs text-muted">{s.url}</span>
              </span>
              <button type="button" onClick={() => remove(s.id, s.name)} aria-label={`Retirer ${s.name}`} className="shrink-0 rounded-full p-2 text-muted hover:bg-red-500/10 hover:text-red-600">
                <Trash2 className="size-4" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

/** Grosses sorties ajoutées à la main (compte à rebours, île, notifications « sort demain »). */
export function AdminReleases({ password }: { password: string }) {
  const [list, setList] = useState<{ id: string; title: string; date: string; platforms: string[] }[] | null>(null);
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [platforms, setPlatforms] = useState<string[]>([]);
  const [image, setImage] = useState("");
  const [source, setSource] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState("");
  const load = useCallback(() => {
    rpc<typeof list>("get_admin_releases", {})
      .then((r) => setList(Array.isArray(r) ? r : []))
      .catch((e) => setError((e as Error).message));
  }, []);
  useEffect(load, [load]);

  const add = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setDone("");
    const res = await rpc<string>("admin_add_release", {
      p_password: password,
      p_title: title.trim(),
      p_date: date,
      p_platforms: platforms,
      p_image: image.trim() || null,
      p_source: source.trim() || null,
    }).catch((err) => (err as Error).message);
    if (res !== "ok") return setError(message(res));
    setDone(`« ${title.trim()} » ajouté : son compte à rebours apparaîtra à la prochaine mise à jour (moins d'une heure).`);
    setTitle("");
    setDate("");
    setPlatforms([]);
    setImage("");
    setSource("");
    load();
  };
  const remove = async (id: string, label: string) => {
    if (!confirm(`Retirer « ${label} » des grosses sorties ?`)) return;
    const res = await rpc<string>("admin_delete_release", { p_password: password, p_id: id }).catch((err) => (err as Error).message);
    if (res !== "ok") return setError(message(res));
    load();
  };

  return (
    <Panel
      icon={<CalendarPlus className="size-4 text-accent" aria-hidden />}
      title="Mes grosses sorties"
      hint="Un jeu très attendu qui manque ? Ajoute-le avec sa date officielle : compte à rebours, île et notification « sort demain » suivront."
    >
      <form onSubmit={add} className="grid gap-2 sm:grid-cols-2">
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Titre du jeu" maxLength={120} required aria-label="Titre du jeu" className={field} />
        <input value={date} onChange={(e) => setDate(e.target.value)} type="date" required aria-label="Date de sortie" className={field} />
        <input value={image} onChange={(e) => setImage(e.target.value)} type="url" placeholder="Image (https://…, facultatif)" aria-label="Image" className={field} />
        <input value={source} onChange={(e) => setSource(e.target.value)} type="url" placeholder="Source de la date (https://…, facultatif)" aria-label="Source de la date" className={field} />
        <div className="flex flex-wrap gap-1.5 sm:col-span-2" role="group" aria-label="Plateformes">
          {PLATFORMS.map((p) => (
            <button
              key={p}
              type="button"
              aria-pressed={platforms.includes(p)}
              onClick={() => setPlatforms((cur) => (cur.includes(p) ? cur.filter((x) => x !== p) : [...cur, p]))}
              className={`rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset ${platforms.includes(p) ? "bg-accent text-white ring-accent" : "glass-pill text-heading ring-border"}`}
            >
              {p}
            </button>
          ))}
        </div>
        <button type="submit" className="justify-self-start rounded-full bg-accent px-4 py-2 text-sm font-semibold text-white hover:opacity-90">
          Ajouter la sortie
        </button>
      </form>
      {error && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>}
      {done && <p className="mt-2 text-sm text-emerald-700 dark:text-emerald-400">{done}</p>}
      {list && list.length > 0 && (
        <ul className="mt-3 divide-y divide-border">
          {list.map((r) => (
            <li key={r.id} className="flex items-center gap-3 py-2 text-sm">
              <span className="min-w-0 flex-1">
                <span className="font-semibold text-heading">{r.title}</span>
                <span className="block text-xs text-muted">
                  {day(`${r.date}T12:00:00Z`)}
                  {r.platforms.length ? ` · ${r.platforms.join(", ")}` : ""}
                </span>
              </span>
              <button type="button" onClick={() => remove(r.id, r.title)} aria-label={`Retirer ${r.title}`} className="shrink-0 rounded-full p-2 text-muted hover:bg-red-500/10 hover:text-red-600">
                <Trash2 className="size-4" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
