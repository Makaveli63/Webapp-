"use client";

import { Flame, Share2, Trophy } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { aliasesOf } from "@/lib/aliases";
import { award } from "@/lib/player";
import { canon, distance, prepareTitles, suggestTitles } from "@/lib/fuzzy";

export interface DailyCandidate {
  title: string;
  image: string;
  year: string;
  genres: string[];
  platforms: string[];
  slug: string;
}

const MAX_TRIES = 5;
const KEY = "gb-daily";
const START = Date.UTC(2026, 9, 28); // n° 1

/** Jour à Paris (AAAA-MM-JJ) : le jeu change à minuit pour tout le monde. */
const parisDay = () => new Intl.DateTimeFormat("fr-CA", { timeZone: "Europe/Paris" }).format(new Date());

/** Petit hachage stable : même jour + même titre = même nombre, sur tous les appareils. */
function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

interface Saved {
  day: string;
  guesses: string[];
  won: boolean;
}
interface Stats {
  played: number;
  wins: number;
  streak: number;
  best: number;
  lastWin?: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const storageCache = new Map<string, any>();

function read<T>(key: string, fallback: T): T {
  try {
    if (storageCache.has(key)) {
      return { ...fallback, ...storageCache.get(key) };
    }
    const parsed = JSON.parse(localStorage.getItem(key) ?? "{}");
    storageCache.set(key, parsed);
    return { ...fallback, ...parsed };
  } catch {
    return fallback;
  }
}
function write(key: string, value: unknown) {
  try {
    storageCache.set(key, value);
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* stockage indisponible */
  }
}

const yesterday = (day: string) => {
  const d = new Date(`${day}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
};

/** 🧩 « Devine le jeu » : image floue qui se précise, indices, série de jours, résultat à partager. */
export function DailyGame({ candidates }: { candidates: DailyCandidate[] }) {
  const [day, setDay] = useState<string | null>(null);
  const [game, setGame] = useState<Saved | null>(null);
  const [stats, setStats] = useState<Stats>({ played: 0, wins: 0, streak: 0, best: 0 });
  const [input, setInput] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const d = parisDay();
    setDay(d);
    const saved = read<Saved>(KEY, { day: d, guesses: [], won: false });
    setGame(saved.day === d ? saved : { day: d, guesses: [], won: false });
    setStats(read<Stats>(`${KEY}-stats`, { played: 0, wins: 0, streak: 0, best: 0 }));
  }, []);

  const answer = useMemo(() => {
    if (!day || !candidates.length) return null;
    return candidates.reduce((best, c) => (hash(`${day}|${c.title}`) < hash(`${day}|${best.title}`) ? c : best));
  }, [day, candidates]);
  const keys = useMemo(() => (answer ? new Set(aliasesOf(answer.title).map(canon)) : new Set<string>()), [answer]);
  const titles = useMemo(() => prepareTitles(candidates.map((c) => c.title)), [candidates]);
  const number = day ? Math.floor((Date.parse(`${day}T00:00:00Z`) - START) / 86_400_000) + 1 : 0;

  if (!candidates.length) return <p className="mt-6 text-muted">Le jeu du jour arrive à la prochaine mise à jour du site.</p>;
  if (!answer || !game) return <p className="mt-6 text-muted">Chargement du jeu du jour…</p>;

  const tries = game.guesses.length;
  const over = game.won || tries >= MAX_TRIES;
  const blur = over ? 0 : [26, 18, 12, 7, 3][tries];
  const right = (g: string) => {
    const c = canon(g);
    return keys.has(c) || [...keys].some((k) => k.length >= 8 && distance(c, k, 2) <= 2);
  };

  const finish = (won: boolean) => {
    const s = { ...stats, played: stats.played + 1 };
    if (won) {
      s.wins++;
      s.streak = stats.lastWin === yesterday(game.day) ? stats.streak + 1 : 1;
      s.best = Math.max(s.best, s.streak);
      s.lastWin = game.day;
      award("daily", game.day);
    } else s.streak = 0;
    setStats(s);
    write(`${KEY}-stats`, s);
  };

  const guess = (value: string) => {
    const g = value.trim();
    if (!g || over) return;
    const won = right(g);
    const next = { ...game, guesses: [...game.guesses, g], won };
    setGame(next);
    write(KEY, next);
    setInput("");
    if (won || next.guesses.length >= MAX_TRIES) finish(won);
  };
  const submit = (e: FormEvent) => {
    e.preventDefault();
    guess(input);
  };

  const hints = [
    { label: "Année", value: answer.year },
    { label: "Genre", value: answer.genres.join(", ") || "?" },
    { label: "Plateformes", value: answer.platforms.join(" · ") || "?" },
    { label: "Première lettre", value: answer.title.charAt(0).toUpperCase() },
  ].slice(0, over ? 4 : tries);
  const suggestions = input.trim().length >= 2 ? suggestTitles(input, titles, 5) : [];
  const grid = game.guesses.map((g) => (right(g) ? "🟩" : "🟥")).join("") + (game.won ? "" : "⬛".repeat(MAX_TRIES - tries));

  const share = async () => {
    const text = `GamingBase · Jeu du jour n° ${number}\n${grid} ${game.won ? `${tries}/${MAX_TRIES}` : "X/5"}\n🔥 Série : ${stats.streak}`;
    try {
      if (navigator.share) return await navigator.share({ text });
      await navigator.clipboard.writeText(text);
      setCopied(true);
    } catch {
      /* partage annulé */
    }
  };

  return (
    <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <section className="glass rounded-2xl p-4">
        <div className="flex items-center justify-between text-sm">
          <span className="font-semibold text-heading">N° {number}</span>
          <span className="inline-flex items-center gap-1 font-semibold text-heading">
            <Flame className="size-4 text-orange-500" aria-hidden /> Série de {stats.streak} jour{stats.streak > 1 ? "s" : ""}
          </span>
        </div>
        <div className="daily-frame mt-3 overflow-hidden rounded-xl">
          {/* eslint-disable-next-line @next/next/no-img-element -- visuel du jeu (site statique) */}
          <img src={answer.image} alt={over ? answer.title : "Jeu à deviner"} referrerPolicy="no-referrer" className={`daily-img aspect-[16/9] w-full object-cover daily-blur-${blur}`} />
        </div>
        <div className="mt-3 flex gap-1.5" aria-label={`${tries} essai${tries > 1 ? "s" : ""} sur ${MAX_TRIES}`}>
          {Array.from({ length: MAX_TRIES }, (_, i) => (
            <span key={i} className={`h-1.5 flex-1 rounded-full ${i < tries ? (right(game.guesses[i]) ? "bg-emerald-500" : "bg-rose-500") : "bg-surface-2"}`} />
          ))}
        </div>

        {over ? (
          <div className="mt-4 text-center">
            <p className="text-lg font-bold text-heading">{game.won ? `Bravo, trouvé en ${tries} essai${tries > 1 ? "s" : ""} !` : "Raté pour aujourd'hui"}</p>
            <p className="mt-1 text-muted">
              C&apos;était{" "}
              <Link href={`/jeux/${answer.slug}/`} className="font-semibold text-accent underline underline-offset-2">
                {answer.title}
              </Link>
              . Nouveau jeu demain à minuit.
            </p>
            <button type="button" onClick={share} className="mt-3 inline-flex items-center gap-2 rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-white">
              <Share2 className="size-4" aria-hidden /> {copied ? "Résultat copié" : "Partager mon résultat"}
            </button>
          </div>
        ) : (
          <form onSubmit={submit} className="relative mt-4">
            <input
              id="daily-guess"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Le nom du jeu…"
              autoComplete="off"
              enterKeyHint="send"
              aria-label="Ta réponse"
              className="w-full rounded-xl border border-border bg-surface py-3 pl-4 pr-28 text-base focus:border-accent focus:outline-none"
            />
            <button type="submit" className="absolute right-1.5 top-1.5 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white">
              Valider
            </button>
            {suggestions.length > 0 && (
              <ul className="glass-strong absolute inset-x-0 top-full z-20 mt-1 overflow-hidden rounded-xl">
                {suggestions.map((s) => (
                  <li key={s}>
                    <button type="button" onClick={() => guess(s)} className="w-full px-4 py-2.5 text-left text-sm text-heading hover:bg-surface-2">
                      {s}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </form>
        )}

        {game.guesses.length > 0 && !game.won && (
          <ul className="mt-3 flex flex-wrap gap-1.5">
            {game.guesses.map((g, i) => (
              <li key={i} className="rounded-full bg-rose-500/15 px-2.5 py-1 text-xs font-semibold text-rose-600 line-through dark:text-rose-400">
                {g}
              </li>
            ))}
          </ul>
        )}
      </section>

      <aside className="grid content-start gap-4">
        <section className="glass rounded-2xl p-4">
          <h2 className="font-bold text-heading">Indices</h2>
          {hints.length ? (
            <dl className="mt-2 grid gap-1 text-sm">
              {hints.map((h) => (
                <div key={h.label} className="flex justify-between gap-3">
                  <dt className="text-muted">{h.label}</dt>
                  <dd className="text-right font-semibold text-heading">{h.value}</dd>
                </div>
              ))}
            </dl>
          ) : (
            <p className="mt-2 text-sm text-muted">Un indice se débloque à chaque essai raté.</p>
          )}
        </section>
        <section className="glass rounded-2xl p-4">
          <h2 className="flex items-center gap-2 font-bold text-heading">
            <Trophy className="size-4 text-accent" aria-hidden /> Mes stats
          </h2>
          <dl className="mt-2 grid grid-cols-3 gap-2 text-center">
            {[
              ["Parties", stats.played],
              ["Gagnées", stats.played ? `${Math.round((stats.wins / stats.played) * 100)} %` : "–"],
              ["Record", stats.best],
            ].map(([k, v]) => (
              <div key={k as string} className="flex flex-col-reverse rounded-xl bg-surface-2 p-2">
                <dt className="text-[11px] text-muted">{k}</dt>
                <dd className="text-lg font-extrabold text-heading">{v}</dd>
              </div>
            ))}
          </dl>
        </section>
      </aside>
    </div>
  );
}
