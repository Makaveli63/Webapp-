import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { VideoPlayer } from "@/components/ui/VideoPlayer";
import { getVideos } from "@/lib/videos";

export async function VideosTeaser() {
  const { releases, news, calendar } = await getVideos();
  const items = [...releases, ...news, ...calendar].slice(0, 3);
  if (!items.length) return null;
  return (
    <section aria-labelledby="videos-teaser">
      <div className="flex items-end justify-between gap-4">
        <h2 id="videos-teaser" className="text-xl font-bold text-heading sm:text-2xl">Vidéos</h2>
        <Link href="/videos" className="inline-flex items-center gap-1 text-sm font-semibold text-accent hover:underline">
          Toutes les vidéos <ArrowRight className="size-4" aria-hidden />
        </Link>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
        {items.map((v) => (
          <article key={v.id} className="glass overflow-hidden rounded-xl">
            <VideoPlayer video={v.video} title={v.title} className="rounded-none" />
            <p className="line-clamp-2 p-3 text-sm font-semibold text-heading">{v.title}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
