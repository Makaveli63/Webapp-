import { MutedGate } from "@/components/app/MutedGate";
import { RemoteImage } from "@/components/ui/RemoteImage";
import { TrailerButton } from "@/components/ui/TrailerButton";
import { themeFor } from "@/lib/themes";
import type { CalendarGame } from "@/types";

const dayLabel = (ymd: string) =>
  new Intl.DateTimeFormat("fr-FR", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" }).format(
    new Date(`${ymd}T12:00:00Z`),
  );

function CalendarCardBody({ game, isToday = false }: { game: CalendarGame; isToday?: boolean }) {
  const content = (
    <>
      <div className="relative aspect-[16/9] w-full">
        <div className="absolute inset-0">
          <RemoteImage src={game.image} alt={game.title} theme={themeFor(game.title)} seed={game.id} className="h-full w-full" />
        </div>
        <span
          className={`absolute left-2 top-2 rounded-md px-2 py-1 text-xs font-bold shadow ${isToday ? "bg-accent text-white" : "bg-black/70 text-white"}`}
        >
          {isToday ? "Aujourd'hui" : dayLabel(game.date)}
        </span>
        {game.video && <TrailerButton video={game.video} title={game.title} className="absolute bottom-2 right-2" />}
      </div>
      <div className="p-3">
        <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-heading">{game.title}</h3>
        {game.platforms.length > 0 && <p className="mt-1 truncate text-xs text-muted">{game.platforms.join(" · ")}</p>}
      </div>
    </>
  );
  const className = "block overflow-hidden rounded-xl glass transition-colors hover:border-accent/60";
  return game.url ? (
    <a href={game.url} target="_blank" rel="noopener noreferrer" className={className}>
      {content}
    </a>
  ) : (
    <div className={className}>{content}</div>
  );
}

/** Masquée si elle concerne une licence « Pas intéressé ». */
export function CalendarCard(props: { game: CalendarGame; isToday?: boolean }) {
  return (
    <MutedGate title={props.game.title}>
      <CalendarCardBody {...props} />
    </MutedGate>
  );
}
