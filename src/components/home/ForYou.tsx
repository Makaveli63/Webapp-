"use client";

import { Bell, Sparkles } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { RemoteImage } from "@/components/ui/RemoteImage";
import { aliasesOf } from "@/lib/aliases";
import { useFollows } from "@/lib/follows";
import { canon } from "@/lib/fuzzy";
import { readPrefs } from "@/lib/notif-prefs";
import { themeFor } from "@/lib/themes";
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
    return out.sort((x, y) => y.score - x.score).slice(0, 10);
  }, [follows, tracker, extra, articles]);

  if (!picks) return null;
  const hasSignals = !!(follows?.length || Object.keys(tracker?.anime ?? {}).length || Object.keys(tracker?.games ?? {}).length || extra?.games.length);

  return (
    <section aria-labelledby="foryou-title">
      <h2 id="foryou-title" className="flex items-center gap-2 text-xl font-bold text-heading">
        <Sparkles className="size-5 text-accent" aria-hidden /> Pour toi
      </h2>
      <p className="mt-0.5 text-sm text-muted">Selon tes suivis, ta bibliothèque et tes plateformes</p>
      {picks.length > 0 ? (
        <ul className="scroll-row -mx-4 mt-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
          {picks.map(({ article, reason }) => (
            <li key={article.slug} className="w-[78%] shrink-0 snap-start sm:w-72">
              <Link href={`/actualites/${article.slug}`} className="glass group flex h-full flex-col overflow-hidden rounded-2xl">
                <div className="relative">
                  <RemoteImage
                    src={article.image}
                    alt=""
                    theme={themeFor(`${article.title} ${article.tags.join(" ")}`, article.platforms)}
                    seed={article.slug}
                    className="aspect-[16/9] w-full"
                  />
                  <span className="foryou-reason absolute left-2.5 top-2.5 max-w-[85%] truncate rounded-full px-2.5 py-1 text-[11px] font-semibold text-white">{reason}</span>
                </div>
                <div className="flex flex-1 flex-col p-3.5">
                  <h3 className="line-clamp-3 text-[15px] font-semibold leading-snug text-heading">{article.title}</h3>
                  <p className="mt-auto pt-2 text-xs text-muted">
                    {article.source.name} · {ago(article.publishedAt)}
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <div className="glass mt-4 flex items-start gap-3 rounded-2xl p-4">
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

/** « il y a 2 h », « hier », « il y a 3 j » */
function ago(iso: string): string {
  const h = Math.max(0, (Date.now() - Date.parse(iso)) / 3_600_000);
  if (h < 1) return "à l'instant";
  if (h < 24) return `il y a ${Math.floor(h)} h`;
  if (h < 48) return "hier";
  return `il y a ${Math.floor(h / 24)} j`;
}
