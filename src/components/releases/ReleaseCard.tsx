import { ExternalLink } from "lucide-react";
import { PlatformBadge } from "@/components/ui/Badge";
import { Countdown } from "@/components/ui/Countdown";
import { Cover } from "@/components/ui/Cover";
import { formatDate } from "@/lib/format";
import { THEMES, themeFor, type ThemeId } from "@/lib/themes";
import type { Release } from "@/types";

export function ReleaseCard({ release }: { release: Release & { at: string } }) {
  const theme = release.theme && release.theme in THEMES ? THEMES[release.theme as ThemeId] : themeFor(release.title, release.platforms);
  return (
    <article className="flex h-full flex-col overflow-hidden rounded-xl border border-border bg-surface">
      {/* Décor propre à chaque jeu : forêt et épée pour Zelda, coucher de soleil pour GTA… */}
      <Cover theme={theme} seed={release.id} className="aspect-[16/9] w-full">
        <div className="flex flex-wrap gap-1.5">
          {release.platforms.map((p) => (
            <PlatformBadge key={p} platform={p} />
          ))}
        </div>
        <h3 className="mt-2 text-xl font-extrabold leading-tight text-white drop-shadow">{release.title}</h3>
        {release.subtitle && <p className="text-sm text-white/80">{release.subtitle}</p>}
      </Cover>
      <div className="flex flex-1 flex-col p-4 sm:p-5">
        <p className="text-sm text-muted">Sortie le {formatDate(release.at)}</p>
        <div className="mt-3">
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
          className="mt-auto inline-flex items-center gap-1 pt-4 text-xs text-muted underline underline-offset-2 hover:text-fg"
        >
          Source de la date <ExternalLink className="size-3" aria-hidden />
        </a>
      </div>
    </article>
  );
}
