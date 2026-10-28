"use client";

import { CalendarPlus, ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { gameFollowId } from "@/lib/aliases";
import { useFollows } from "@/lib/follows";
import { usePins } from "@/lib/pins";
import { useTracker } from "@/lib/tracker";

export interface CalendarItem {
  id: string;
  title: string;
  /** AAAA-MM-JJ */
  day: string;
  platforms: string[];
  /** Fichier .ics de la sortie (grosses sorties) */
  ics?: string;
}

interface Event {
  key: string;
  day: string;
  kind: "game" | "anime";
  title: string;
  detail: string;
  href: string;
  time?: string;
  ics?: string;
}

const MONTHS = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];
const pad = (n: number) => String(n).padStart(2, "0");
const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const dayFmt = new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long" });
const timeFmt = new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit" });

function collectionIds(): Set<string> {
  try {
    const c = JSON.parse(localStorage.getItem("gb-collection") ?? "{}");
    return new Set([...(c.owned ?? []), ...(c.wanted ?? [])].map((g: { id?: string; title?: string }) => g.id ?? "").concat(
      [...(c.owned ?? []), ...(c.wanted ?? [])].map((g: { title?: string }) => (g.title ? gameFollowId(g.title) : "")),
    ));
  } catch {
    return new Set();
  }
}

/** Calendrier du mois avec seulement ce que tu suis : sorties (violet) et épisodes (rose). */
export function MyCalendar({ releases }: { releases: CalendarItem[] }) {
  const follows = useFollows();
  const pins = usePins();
  const tracker = useTracker();
  const [owned, setOwned] = useState<Set<string> | null>(null);
  const [month, setMonth] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [selected, setSelected] = useState<string | null>(null);
  useEffect(() => {
    const load = () => setOwned(collectionIds());
    load();
    window.addEventListener("gb-collection-change", load);
    return () => window.removeEventListener("gb-collection-change", load);
  }, []);

  const events = useMemo(() => {
    if (!follows || !pins || !tracker || !owned) return null;
    const followed = new Set(follows.map((f) => f.id));
    const out: Event[] = [];
    for (const r of releases) {
      const fid = gameFollowId(r.title);
      const why = followed.has(fid) ? "🔔 Suivi" : pins.includes(r.id) ? "📌 Épinglé" : owned.has(`sortie-${r.id}`) || owned.has(r.id) || owned.has(fid) ? "🎮 Ma bibliothèque" : null;
      if (!why) continue;
      out.push({ key: `g-${r.id}`, day: r.day, kind: "game", title: r.title, detail: [why, r.platforms.join(" · ")].filter(Boolean).join(" · "), href: `/jeux/${fid.slice(4)}/`, ics: r.ics });
    }
    // Épisodes : prochain épisode connu des animes suivis (🔔) ou cochés dans le suivi.
    const anime = new Map<string, { title: string; next?: { episode: number; at: string }; href: string }>();
    for (const f of follows) if (f.kind === "anime") anime.set(f.id, { title: f.title, next: f.next, href: f.href });
    for (const a of Object.values(tracker.anime)) if (!anime.has(a.id)) anime.set(a.id, { title: a.title, next: a.next, href: `/anime/fiche?id=${a.id.replace(/^anilist-/, "")}` });
    for (const [id, a] of anime) {
      if (!a.next) continue;
      const at = new Date(a.next.at);
      out.push({ key: `a-${id}-${a.next.episode}`, day: ymd(at), kind: "anime", title: a.title, detail: `Épisode ${a.next.episode}`, time: timeFmt.format(at), href: a.href });
    }
    return out.sort((x, y) => x.day.localeCompare(y.day) || (x.time ?? "").localeCompare(y.time ?? ""));
  }, [follows, pins, tracker, owned, releases]);

  const today = ymd(new Date());
  const prefix = `${month.getFullYear()}-${pad(month.getMonth() + 1)}-`;
  const inMonth = (events ?? []).filter((e) => e.day.startsWith(prefix));
  const byDay = new Map<string, Event[]>();
  for (const e of inMonth) byDay.set(e.day, [...(byDay.get(e.day) ?? []), e]);
  const days = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const offset = (month.getDay() + 6) % 7; // lundi en premier
  const shown = selected ? inMonth.filter((e) => e.day === selected) : inMonth;
  const move = (delta: number) => {
    setSelected(null);
    setMonth((m) => new Date(m.getFullYear(), m.getMonth() + delta, 1));
  };

  return (
    <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)]">
      <section aria-label="Calendrier" className="glass rounded-2xl p-4">
        <div className="flex items-center justify-between">
          <button type="button" onClick={() => move(-1)} aria-label="Mois précédent" className="rounded-full p-2 text-muted hover:text-fg">
            <ChevronLeft className="size-5" />
          </button>
          <h2 className="font-bold text-heading">
            {MONTHS[month.getMonth()]} {month.getFullYear()}
          </h2>
          <button type="button" onClick={() => move(1)} aria-label="Mois suivant" className="rounded-full p-2 text-muted hover:text-fg">
            <ChevronRight className="size-5" />
          </button>
        </div>
        <div className="mt-3 grid grid-cols-7 gap-1 text-center text-xs">
          {["L", "M", "M", "J", "V", "S", "D"].map((d, i) => (
            <span key={i} className="pb-1 font-semibold text-muted">
              {d}
            </span>
          ))}
          {Array.from({ length: offset }, (_, i) => (
            <span key={`x${i}`} />
          ))}
          {Array.from({ length: days }, (_, i) => {
            const day = `${prefix}${pad(i + 1)}`;
            const list = byDay.get(day) ?? [];
            const active = selected === day;
            return (
              <button
                key={day}
                type="button"
                aria-pressed={active}
                aria-label={`${i + 1}${list.length ? ` : ${list.length} événement${list.length > 1 ? "s" : ""}` : ""}`}
                onClick={() => setSelected(active ? null : day)}
                className={`relative flex aspect-square flex-col items-center justify-center rounded-xl text-sm font-semibold transition-colors ${
                  active ? "bg-accent text-white" : day === today ? "ring-2 ring-inset ring-accent text-heading" : list.length ? "bg-surface-2 text-heading" : "text-muted"
                }`}
              >
                {i + 1}
                {list.length > 0 && (
                  <span className="absolute bottom-1 flex gap-0.5">
                    {list.some((e) => e.kind === "game") && <span className={`size-1.5 rounded-full ${active ? "bg-white" : "bg-accent"}`} />}
                    {list.some((e) => e.kind === "anime") && <span className="size-1.5 rounded-full bg-pink-500" />}
                  </span>
                )}
              </button>
            );
          })}
        </div>
        <p className="mt-3 flex gap-4 text-xs text-muted">
          <span className="flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-accent" /> Sortie de jeu
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-pink-500" /> Épisode d&apos;anime
          </span>
        </p>
      </section>

      <section aria-label="Événements">
        <h2 className="font-bold text-heading">{selected ? dayFmt.format(new Date(`${selected}T12:00:00`)) : `En ${MONTHS[month.getMonth()].toLowerCase()}`}</h2>
        {events === null ? (
          <p className="mt-3 text-sm text-muted">Chargement…</p>
        ) : shown.length === 0 ? (
          <p className="mt-3 text-sm text-muted">
            Rien de prévu. Suis des jeux et des animes avec la cloche 🔔, épingle des sorties 📌 ou ajoute des jeux à{" "}
            <Link href="/collection" className="font-semibold text-accent underline underline-offset-2">
              Ma bibliothèque
            </Link>
            .
          </p>
        ) : (
          <ul className="mt-3 grid gap-2">
            {shown.map((e) => (
              <li key={e.key} className="glass flex items-center gap-3 rounded-xl p-3">
                <span className={`w-1 self-stretch rounded-full ${e.kind === "game" ? "bg-accent" : "bg-pink-500"}`} aria-hidden />
                <Link href={e.href} className="min-w-0 flex-1">
                  <span className="block truncate font-semibold text-heading">{e.title}</span>
                  <span className="block truncate text-xs text-muted">
                    {dayFmt.format(new Date(`${e.day}T12:00:00`))}
                    {e.time ? ` à ${e.time}` : ""} · {e.detail}
                  </span>
                </Link>
                {e.ics && (
                  <a href={e.ics} aria-label={`Ajouter ${e.title} au calendrier du téléphone`} className="rounded-full bg-accent p-2 text-white">
                    <CalendarPlus className="size-4" aria-hidden />
                  </a>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
