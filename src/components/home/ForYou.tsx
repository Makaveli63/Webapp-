"use client";

import { Bell, Sparkles } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { NewsCard } from "@/components/news/NewsCard";
import { aliasesOf } from "@/lib/aliases";
import { useFollows } from "@/lib/follows";
import { canon } from "@/lib/fuzzy";
import { readPrefs } from "@/lib/notif-prefs";
import { useTracker } from "@/lib/tracker";
import type { Article } from "@/types";

interface Signal {
  /** Écritures du titre, forme canon (« gta 6 ») */
  keys: string[];
  reason: string;
  weight: number;
}

const keysOf = (...titles: (string | undefined)[]) =>
  [...new Set(aliasesOf(...titles).map((t) => canon(t)))].filter((k) => k.replace(/ /g, "").length >= 4);

function collection(): { title: string }[] {
  try {
    const c = JSON.parse(localStorage.getItem("gb-collection") ?? "{}");
    return [...(c.owned ?? []), ...(c.wanted ?? [])].filter((g) => typeof g?.title === "string");
  } catch {
    return [];
  }
}

/**
 * « Pour toi » : les actus qui parlent de ce que tu suis (🔔), de ta bibliothèque et de tes plateformes,
 * avec la raison affichée sur chaque carte. Calculé sur l'appareil, rien n'est envoyé.
 */
export function ForYou({ articles }: { articles: Article[] }) {
  const follows = useFollows();
  const tracker = useTracker();
  const [extra, setExtra] = useState<{ games: { title: string }[]; platforms: string[] } | null>(null);
  useEffect(() => {
    const load = () => setExtra({ games: collection(), platforms: readPrefs().platforms });
    load();
    window.addEventListener("gb-collection-change", load);
    window.addEventListener("gb-notif-prefs-change", load);
    return () => {
      window.removeEventListener("gb-collection-change", load);
      window.removeEventListener("gb-notif-prefs-change", load);
    };
  }, []);

  const picks = useMemo(() => {
    if (!follows || !tracker || !extra) return null;
    const signals: Signal[] = [
      ...follows.map((f) => ({ keys: keysOf(f.title, ...f.aliases), reason: `🔔 ${f.title} · suivi`, weight: 3 })),
      ...Object.values(tracker.anime).map((a) => ({ keys: keysOf(a.title), reason: `▶️ ${a.title} · dans ton suivi`, weight: 2 })),
      ...[...Object.values(tracker.games), ...extra.games].map((g) => ({ keys: keysOf(g.title), reason: "🎮 Dans ta bibliothèque", weight: 2 })),
    ];
    const out: { article: Article; reason: string; score: number }[] = [];
    for (const a of articles) {
      const hay = ` ${canon(`${a.title} ${a.tags.join(" ")}`)} `;
      let best: { reason: string; score: number } | null = null;
      for (const s of signals) {
        if (s.keys.some((k) => hay.includes(` ${k} `)) && (!best || s.weight > best.score)) best = { reason: s.reason, score: s.weight };
      }
      // Plateformes choisies (notifications) : seulement en complément.
      if (!best && extra.platforms.length && a.category !== "Anime" && a.platforms.some((p) => extra.platforms.includes(p))) {
        best = { reason: `🎯 Sur ${a.platforms.find((p) => extra.platforms.includes(p))}`, score: 1 };
      }
      if (best) out.push({ article: a, ...best });
    }
    // Les plus pertinentes d'abord, puis les plus récentes (la liste arrive déjà triée par date).
    return out.sort((x, y) => y.score - x.score).slice(0, 6);
  }, [follows, tracker, extra, articles]);

  if (!picks) return null;
  const hasSignals = !!(follows?.length || Object.keys(tracker?.anime ?? {}).length || Object.keys(tracker?.games ?? {}).length || extra?.games.length);

  return (
    <section aria-labelledby="foryou-title">
      <div className="flex items-end justify-between gap-4">
        <h2 id="foryou-title" className="flex items-center gap-2 text-xl font-bold text-heading">
          <Sparkles className="size-5 text-accent" aria-hidden /> Pour toi
        </h2>
        {picks.length > 0 && <span className="text-xs text-muted">Selon tes suivis, ta bibliothèque et tes plateformes</span>}
      </div>
      {picks.length > 0 ? (
        <div className="mt-4 grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
          {picks.map(({ article, reason }) => (
            <div key={article.slug} className="flex flex-col gap-1.5">
              <span className="truncate px-1 text-xs font-bold text-accent">{reason}</span>
              <NewsCard article={article} />
            </div>
          ))}
        </div>
      ) : (
        <div className="glass mt-4 flex items-start gap-3 rounded-xl p-4">
          <Bell className="mt-0.5 size-5 shrink-0 text-accent" aria-hidden />
          <p className="text-sm text-muted">
            {hasSignals ? "Rien de neuf sur tes jeux et animes pour l'instant." : "Touche la cloche 🔔 sur un jeu ou un anime pour voir ici toutes ses actus."}{" "}
            <Link href="/recherche" className="font-semibold text-accent underline underline-offset-2">
              Chercher un jeu ou un anime
            </Link>
          </p>
        </div>
      )}
    </section>
  );
}
