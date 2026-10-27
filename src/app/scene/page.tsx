import { BookOpen, GraduationCap, Radio } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { NewsCard } from "@/components/news/NewsCard";
import { StatusMatrix } from "@/components/scene/StatusMatrix";
import { StatusWidget } from "@/components/scene/StatusWidget";
import { LegalNotice } from "@/components/ui/LegalNotice";
import { firmwareMatrix, STATUS_META } from "@/data/scene-status";
import { getGuides } from "@/lib/content";
import { getArticles, SCENE_TAG } from "@/lib/news";

export const metadata: Metadata = { title: "Scène & Jailbreak" };

export default async function ScenePage() {
  const guides = getGuides();
  const sceneNews = (await getArticles())
    .filter((a) => a.tags.includes(SCENE_TAG) && (a.platforms.includes("PS5") || a.platforms.includes("Switch 2")))
    .slice(0, 9);
  return (
    <div className="space-y-12">
      <header>
        <h1 className="text-3xl font-extrabold text-white">Scène & Jailbreak</h1>
        <p className="mt-2 max-w-2xl text-muted">
          Suivi de l&apos;état de la recherche en sécurité sur PS5 et Switch 2, et explications pédagogiques des notions clés.
        </p>
        <div className="mt-6"><LegalNotice /></div>
      </header>

      <StatusWidget />

      <section aria-labelledby="matrix-title">
        <h2 id="matrix-title" className="text-xl font-bold text-white">Matrice des versions</h2>
        <dl className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-xs text-muted">
          {Object.values(STATUS_META).map((m) => (
            <div key={m.label}><dt className="inline font-semibold text-fg">{m.label}</dt> : <dd className="inline">{m.description}</dd></div>
          ))}
        </dl>
        <div className="mt-5"><StatusMatrix rows={firmwareMatrix} /></div>
      </section>

      <section aria-labelledby="scene-news-title">
        <h2 id="scene-news-title" className="flex items-center gap-2 text-xl font-bold text-white">
          <Radio className="size-5 text-accent-2" aria-hidden /> Dernières infos de la scène
        </h2>
        <p className="mt-1 text-sm text-muted">
          Sélection automatique des articles de la presse francophone qui parlent de hack, homebrew ou failles sur PS5 et Switch 2.
        </p>
        {sceneNews.length ? (
          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {sceneNews.map((a) => <NewsCard key={a.slug} article={a} />)}
          </div>
        ) : (
          <p className="mt-5 text-sm text-muted">Aucun article récent sur le sujet.</p>
        )}
      </section>

      <section aria-labelledby="guides-title">
        <div className="flex items-end justify-between">
          <h2 id="guides-title" className="text-xl font-bold text-white">Guides pédagogiques</h2>
          <Link href="/scene/glossaire" className="flex items-center gap-1 text-sm text-muted hover:text-fg">
            <GraduationCap className="size-4" aria-hidden /> Glossaire
          </Link>
        </div>
        <ul className="mt-5 grid gap-4 md:grid-cols-2">
          {guides.map((g) => (
            <li key={g.slug}>
              <Link href={`/scene/guides/${g.slug}`} className="flex h-full gap-4 rounded-xl border border-border bg-surface p-5 hover:border-accent/60">
                <BookOpen className="size-5 shrink-0 text-accent-2" aria-hidden />
                <div>
                  <p className="font-semibold text-white">{g.title}</p>
                  <p className="mt-1 text-sm text-muted">{g.description}</p>
                  <p className="mt-3 text-xs text-muted">{g.console} · {g.level}</p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
