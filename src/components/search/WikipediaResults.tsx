"use client";

import { ExternalLink } from "lucide-react";
import { useEffect, useState } from "react";

interface WikiPage {
  pageid: number;
  title: string;
  extract?: string;
  fullurl?: string;
  thumbnail?: { source: string };
  index?: number;
}

/** Recherche en direct sur Wikipédia (français), limitée aux articles qui parlent de jeu vidéo. */
export function WikipediaResults({ query }: { query: string }) {
  const [pages, setPages] = useState<WikiPage[] | null>(null);

  useEffect(() => {
    if (!query) return;
    const controller = new AbortController();
    const params = new URLSearchParams({
      action: "query",
      format: "json",
      origin: "*",
      generator: "search",
      gsrsearch: `${query} jeu vidéo`,
      gsrlimit: "8",
      prop: "pageimages|extracts|info",
      inprop: "url",
      exintro: "1",
      explaintext: "1",
      exsentences: "2",
      piprop: "thumbnail",
      pithumbsize: "400",
    });
    setPages(null);
    fetch(`https://fr.wikipedia.org/w/api.php?${params}`, { signal: controller.signal })
      .then((r) => r.json())
      .then((data) => {
        const all = Object.values((data?.query?.pages ?? {}) as Record<string, WikiPage>);
        setPages(
          all
            .filter((p) => /jeux? vidéo|video game/i.test(p.extract ?? ""))
            .sort((a, b) => (a.index ?? 0) - (b.index ?? 0))
            .slice(0, 6),
        );
      })
      .catch((err) => {
        if (err?.name !== "AbortError") setPages([]);
      });
    return () => controller.abort();
  }, [query]);

  if (!query) return null;
  return (
    <section className="mt-10">
      <h2 className="text-lg font-bold text-heading">Sur Wikipédia</h2>
      {pages === null ? (
        <p className="mt-3 text-sm text-muted">Recherche en cours…</p>
      ) : pages.length === 0 ? (
        <p className="mt-3 text-sm text-muted">Aucun résultat sur Wikipédia.</p>
      ) : (
        <ul className="mt-4 grid gap-3 sm:grid-cols-2">
          {pages.map((p) => (
            <li key={p.pageid}>
              <a
                href={p.fullurl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex gap-3 rounded-xl glass p-3 hover:border-accent/60"
              >
                {p.thumbnail && (
                  // eslint-disable-next-line @next/next/no-img-element -- site statique
                  <img src={p.thumbnail.source} alt="" loading="lazy" referrerPolicy="no-referrer" className="size-20 shrink-0 rounded-lg object-cover" />
                )}
                <span className="min-w-0">
                  <span className="flex items-center gap-1 font-semibold text-heading">
                    {p.title} <ExternalLink className="size-3 shrink-0 text-muted" aria-hidden />
                  </span>
                  <span className="mt-1 line-clamp-3 text-sm text-muted">{p.extract}</span>
                </span>
              </a>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-3 text-xs text-muted">Résumés : Wikipédia, licence CC BY-SA.</p>
    </section>
  );
}
