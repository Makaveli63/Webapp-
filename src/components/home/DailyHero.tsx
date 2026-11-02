"use client";

import { ChevronRight, Flame, Puzzle } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { DAILY_KEY, DAILY_MAX_TRIES, dailyNumber, parisDay } from "@/lib/daily";

interface Pick {
  day: string;
  image: string;
  title: string;
}
type Status = { kind: "todo" } | { kind: "playing"; tries: number } | { kind: "won"; tries: number } | { kind: "lost" };

function readJson<T>(key: string, fallback: T): T {
  try {
    return { ...fallback, ...JSON.parse(localStorage.getItem(key) ?? "{}") };
  } catch {
    return fallback;
  }
}

/**
 * Jeu du jour en vedette, en tête de l'accueil : visuel flouté du jeu à deviner, numéro, état de la partie
 * (à jouer, en cours, trouvé, raté) et série en cours. Le nom n'apparaît qu'une fois la partie finie.
 */
export function DailyHero({ picks }: { picks: Pick[] }) {
  const [state, setState] = useState<{ pick: Pick; status: Status; streak: number } | null>(null);

  useEffect(() => {
    const day = parisDay();
    const pick = picks.find((p) => p.day === day);
    if (!pick) return;
    const saved = readJson<{ day: string; guesses: string[]; won: boolean }>(DAILY_KEY, { day: "", guesses: [], won: false });
    const stats = readJson<{ streak: number; lastWin?: string }>(`${DAILY_KEY}-stats`, { streak: 0 });
    const tries = saved.day === day ? saved.guesses.length : 0;
    const status: Status =
      saved.day !== day || !tries ? { kind: "todo" } : saved.won ? { kind: "won", tries } : tries >= DAILY_MAX_TRIES ? { kind: "lost" } : { kind: "playing", tries };
    setState({ pick, status, streak: stats.streak });
  }, [picks]);

  if (!state) return <div className="daily-hero-skeleton glass aspect-[21/9] rounded-3xl sm:aspect-[32/9]" aria-hidden />;
  const { pick, status, streak } = state;
  const done = status.kind === "won" || status.kind === "lost";
  const line =
    status.kind === "todo"
      ? "Devine le jeu caché derrière l'image floue"
      : status.kind === "playing"
        ? `Partie en cours · ${DAILY_MAX_TRIES - status.tries} essai${DAILY_MAX_TRIES - status.tries > 1 ? "s" : ""} restant${DAILY_MAX_TRIES - status.tries > 1 ? "s" : ""}`
        : status.kind === "won"
          ? `Trouvé en ${status.tries} essai${status.tries > 1 ? "s" : ""} : ${pick.title}`
          : `Raté : c'était ${pick.title}`;
  const cta = status.kind === "todo" ? "Jouer" : status.kind === "playing" ? "Continuer" : "Voir le résultat";

  return (
    <Link href="/jeu-du-jour" data-card className="daily-hero group relative block overflow-hidden rounded-3xl" aria-label={`Jeu du jour n°${dailyNumber(pick.day)} : ${line}`}>
      {/* eslint-disable-next-line @next/next/no-img-element -- visuel du jeu (site statique) */}
      <img src={pick.image} alt="" referrerPolicy="no-referrer" className={`daily-hero-img absolute inset-0 size-full object-cover ${done ? "" : "daily-hero-blur"}`} />
      <div className="daily-hero-shade absolute inset-0" aria-hidden />
      <div className="relative flex aspect-[21/9] flex-col justify-end gap-1.5 p-4 text-white sm:aspect-[32/9] sm:p-6">
        <span className="daily-hero-chip inline-flex w-fit items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider">
          <Puzzle className="size-3.5" aria-hidden /> Jeu du jour · n°{dailyNumber(pick.day)}
        </span>
        <p className="text-xl font-extrabold leading-tight sm:text-3xl">{done ? (status.kind === "won" ? "Bien joué ! 🎉" : "À demain !") : "Quel est ce jeu ?"}</p>
        <p className="line-clamp-1 text-sm text-white/85 sm:text-base">{line}</p>
        <div className="mt-1 flex items-center gap-2">
          <span className="inline-flex items-center gap-1 rounded-full bg-white px-4 py-1.5 text-sm font-bold text-black transition-transform group-hover:scale-105">
            {cta} <ChevronRight className="size-4" aria-hidden />
          </span>
          {streak > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-black/40 px-3 py-1.5 text-xs font-semibold backdrop-blur-md">
              <Flame className="size-3.5 text-orange-400" aria-hidden /> Série de {streak}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
