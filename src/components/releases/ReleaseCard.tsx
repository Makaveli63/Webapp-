import { ExternalLink } from "lucide-react";
import { PlatformBadge } from "@/components/ui/Badge";
import { Countdown } from "@/components/ui/Countdown";
import { formatDate } from "@/lib/format";
import type { Release } from "@/types";

export function ReleaseCard({ release }: { release: Release & { at: string } }) {
  return (
    <article className="flex flex-col rounded-xl border border-border bg-surface p-4 sm:p-5">
      <div className="flex flex-wrap gap-1.5">
        {release.platforms.map((p) => (
          <PlatformBadge key={p} platform={p} />
        ))}
      </div>
      <h3 className="mt-2.5 text-lg font-bold leading-snug text-heading">{release.title}</h3>
      {release.subtitle && <p className="text-sm text-muted">{release.subtitle}</p>}
      <p className="mt-1 text-sm text-muted">Sortie le {formatDate(release.at)}</p>
      <div className="mt-4">
        <Countdown
          target={release.at}
          fallback={`Sortie le ${formatDate(release.at)}`}
          doneLabel="🎉 Disponible !"
          variant="blocks"
        />
      </div>
      <a
        href={release.source}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-4 inline-flex items-center gap-1 text-xs text-muted underline underline-offset-2 hover:text-fg"
      >
        Source de la date <ExternalLink className="size-3" aria-hidden />
      </a>
    </article>
  );
}
