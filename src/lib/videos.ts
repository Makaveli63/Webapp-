import "server-only";
import { getCalendar } from "@/lib/calendar";
import { getArticles } from "@/lib/news";
import { getUpcomingReleases } from "@/lib/releases";
import type { Video } from "@/types";

export interface VideoItem {
  id: string;
  title: string;
  video: Video;
  subtitle?: string;
  /** Page interne liée (article, sorties) */
  path?: string;
}

const key = (v: Video) => v.youtube ?? v.mp4 ?? "";

/** Toutes les vidéos du site, sans doublons : grosses sorties, calendrier, actus. */
export async function getVideos() {
  const seen = new Set<string>();
  const unique = (items: VideoItem[]) => items.filter((i) => key(i.video) && !seen.has(key(i.video)) && seen.add(key(i.video)));

  const releases = unique(
    getUpcomingReleases()
      .map((r) => ({ r, video: r.video ?? (r.youtube ? { youtube: r.youtube } : undefined) }))
      .filter((x): x is { r: (typeof x)["r"]; video: Video } => !!x.video)
      .map(({ r, video }) => ({ id: `r-${r.id}`, title: r.title, video, subtitle: "Grosse sortie attendue", path: "/sorties" })),
  );
  const calendar = unique(
    getCalendar()
      .games.filter((g) => g.video)
      .slice(0, 24)
      .map((g) => ({ id: `c-${g.id}`, title: g.title, video: g.video!, subtitle: `Sortie : ${g.date.split("-").reverse().join("/")}` })),
  );
  const news = unique(
    (await getArticles())
      .filter((a) => a.video)
      .slice(0, 24)
      .map((a) => ({ id: `a-${a.slug}`, title: a.title, video: a.video!, subtitle: a.source.name, path: `/actualites/${a.slug}` })),
  );
  return { releases, calendar, news };
}
