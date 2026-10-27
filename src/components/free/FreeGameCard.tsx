import { ExternalLink, Gift } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { RemoteImage } from "@/components/ui/RemoteImage";
import { formatDayTime } from "@/lib/format";
import { themeFor } from "@/lib/themes";
import type { FreeGame } from "@/types";

export function FreeGameCard({ game }: { game: FreeGame }) {
  const upcoming = game.status === "upcoming";
  return (
    <article className="flex flex-col overflow-hidden rounded-xl border border-border bg-surface">
      <RemoteImage
        src={game.image}
        alt={game.title}
        theme={themeFor(game.title, ["PC"])}
        seed={game.id}
        className="aspect-[16/9] w-full"
      />
      <div className="flex flex-1 flex-col p-4 sm:p-5">
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge className="bg-surface-2 text-fg ring-border">{game.store}</Badge>
          {upcoming ? (
            <Badge className="bg-sky-500/15 text-sky-700 ring-sky-500/30 dark:text-sky-300">Bientôt</Badge>
          ) : (
            <Badge className="bg-emerald-500/15 text-emerald-700 ring-emerald-500/30 dark:text-emerald-300">
              Gratuit
            </Badge>
          )}
        </div>
        <h3 className="mt-2.5 text-base font-semibold leading-snug text-heading sm:text-lg">{game.title}</h3>
        <p className="mt-1 text-sm text-muted">
          {game.worth && (
            <>
              <s>{game.worth}</s> → <span className="font-semibold text-fg">0 €</span>
              {" · "}
            </>
          )}
          {upcoming && game.startDate
            ? `Gratuit à partir du ${formatDayTime(game.startDate)}`
            : game.endDate
              ? `Jusqu'au ${formatDayTime(game.endDate)}`
              : "Durée limitée"}
        </p>
        {game.url && !upcoming && (
          <a
            href={game.url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-flex items-center justify-center gap-1.5 rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90"
          >
            <Gift className="size-4" aria-hidden /> Récupérer sur {game.store}
            <ExternalLink className="size-3.5" aria-hidden />
          </a>
        )}
      </div>
    </article>
  );
}
