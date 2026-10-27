import type { Metadata } from "next";
import Link from "next/link";
import { VideoPlayer } from "@/components/ui/VideoPlayer";
import { getVideos, type VideoItem } from "@/lib/videos";

export const metadata: Metadata = {
  title: "Vidéos et bandes-annonces",
  description: "Les dernières bandes-annonces des jeux attendus et les vidéos de l'actu jeu vidéo.",
};

function Grid({ id, title, items }: { id: string; title: string; items: VideoItem[] }) {
  if (!items.length) return null;
  return (
    <section aria-labelledby={id}>
      <h2 id={id} className="text-xl font-bold text-heading">{title}</h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((v) => (
          <article key={v.id} className="glass overflow-hidden rounded-xl">
            <VideoPlayer video={v.video} title={v.title} className="rounded-none" />
            <div className="p-3">
              <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-heading">
                {v.path ? (
                  <Link href={v.path} className="hover:underline">
                    {v.title}
                  </Link>
                ) : (
                  v.title
                )}
              </h3>
              {v.subtitle && <p className="mt-0.5 text-xs text-muted">{v.subtitle}</p>}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

export default async function VideosPage() {
  const { releases, calendar, news } = await getVideos();
  const empty = !releases.length && !calendar.length && !news.length;
  return (
    <div className="space-y-10">
      <header>
        <h1 className="text-2xl font-extrabold text-heading sm:text-3xl">Vidéos</h1>
        <p className="mt-2 text-muted">
          Bandes-annonces et vidéos de l&apos;actu. Elles ne se chargent qu&apos;au clic (YouTube sans cookie avant la lecture) ; touche le
          bouton plein écran pour en profiter.
        </p>
      </header>
      {empty && <p className="text-muted">Aucune vidéo pour l&apos;instant.</p>}
      <Grid id="v-releases" title="Les jeux les plus attendus" items={releases} />
      <Grid id="v-news" title="Dans l'actu" items={news} />
      <Grid id="v-calendar" title="Bandes-annonces des prochaines sorties" items={calendar} />
    </div>
  );
}
