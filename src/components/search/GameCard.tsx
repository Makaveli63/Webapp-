import Link from "next/link";
import { CollectionButtons } from "@/components/collection/CollectionButtons";
import { RemoteImage } from "@/components/ui/RemoteImage";
import { TrailerButton } from "@/components/ui/TrailerButton";
import { themeFor } from "@/lib/themes";
import type { SearchGame } from "@/types";

const fullDate = (ymd: string) =>
  new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(
    new Date(`${ymd}T12:00:00Z`),
  );

export function GameCard({ game }: { game: SearchGame }) {
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
      </div>
      <div className="p-3">
        <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-heading">{game.title}</h3>
        <p className="mt-1 truncate text-xs text-muted">
          {[game.note, game.date && fullDate(game.date), game.platforms.join(" · ")].filter(Boolean).join(" — ")}
        </p>
        <CollectionButtons game={{ id: game.id, title: game.title, image: game.image }} className="mt-2" />
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
