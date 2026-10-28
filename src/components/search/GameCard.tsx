import { MutedGate } from "@/components/app/MutedGate";
import Link from "next/link";
import { FollowButton } from "@/components/app/FollowButton";
import { CollectionButtons } from "@/components/collection/CollectionButtons";
import { AnimeFollow } from "@/components/tracker/AnimeFollow";
import { EpisodeTracker } from "@/components/tracker/EpisodeTracker";
import { GameProgress } from "@/components/tracker/GameProgress";
import { RemoteImage } from "@/components/ui/RemoteImage";
import { TrailerButton } from "@/components/ui/TrailerButton";
import { gameFollowId } from "@/lib/aliases";
import { themeFor } from "@/lib/themes";
import type { SearchGame } from "@/types";

const fullDate = (ymd: string) =>
  new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(
    new Date(`${ymd}T12:00:00Z`),
  );

function GameCardBody({ game }: { game: SearchGame }) {
  const body = (
    <>
      <div className="relative aspect-[16/9] w-full">
        <div className="absolute inset-0">
          <RemoteImage src={game.image} alt={game.title} theme={themeFor(game.title)} seed={game.id} className="h-full w-full" />
        </div>
        {typeof game.rating === "number" && (
          <span className="absolute left-2 top-2 rounded-md bg-emerald-600 px-1.5 py-0.5 text-xs font-bold text-white" title="Note Metacritic">
            {game.rating}
          </span>
        )}
        {game.video && <TrailerButton video={game.video} title={game.title} className="absolute bottom-2 right-2" />}
        <FollowButton
          compact
          className="!absolute right-2 top-2"
          item={
            game.anime || game.id.startsWith("anilist-")
              ? { id: game.id, kind: "anime", title: game.title, href: `/anime/fiche?id=${game.id.replace(/^anilist-/, "")}`, next: game.anime?.next }
              : { id: gameFollowId(game.title), kind: "game", title: game.title, href: game.url?.startsWith("/") ? game.url : `/recherche?q=${encodeURIComponent(game.title)}` }
          }
          titles={[game.aka]}
        />
      </div>
      <div className="p-3">
        <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-heading">{game.title}</h3>
        {(game.date || game.note) && <p className="mt-1 line-clamp-2 text-xs text-muted">{[game.date && fullDate(game.date), game.note].filter(Boolean).join(" · ")}</p>}
        {game.platforms.length > 0 && <p className="mt-0.5 truncate text-xs font-medium text-fg">{game.platforms.join(" · ")}</p>}
        {game.anime ? (
          <span className="mt-2 flex flex-wrap items-center gap-1.5">
            <EpisodeTracker anime={{ id: game.id, title: game.title, image: game.image, ...game.anime }} />
            <AnimeFollow anime={{ id: game.id, title: game.title, image: game.image, ...game.anime }} compact />
          </span>
        ) : (
          <>
            <CollectionButtons game={{ id: game.id, title: game.title, image: game.image }} className="mt-2" />
            <GameProgress game={game} className="mt-1.5" />
          </>
        )}
      </div>
    </>
  );
  const className = "block overflow-hidden rounded-xl glass transition-colors hover:border-accent/60";
  if (!game.url) return <div className={className}>{body}</div>;
  return game.url.startsWith("/") ? (
    <Link href={game.url} className={className}>
      {body}
    </Link>
  ) : (
    <a href={game.url} target="_blank" rel="noopener noreferrer" className={className}>
      {body}
    </a>
  );
}

/** Masquée si elle concerne une licence « Pas intéressé ». */
export function GameCard(props: { game: SearchGame }) {
  return (
    <MutedGate title={props.game.title}>
      <GameCardBody {...props} />
    </MutedGate>
  );
}
