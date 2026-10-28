import { CalendarPlus, ExternalLink } from "lucide-react";
import Link from "next/link";
import { CollectionButtons } from "@/components/collection/CollectionButtons";
import { PlatformBadge } from "@/components/ui/Badge";
import { Countdown } from "@/components/ui/Countdown";
import { RemoteImage } from "@/components/ui/RemoteImage";
import { TrailerButton } from "@/components/ui/TrailerButton";
import { PinButton } from "./PinButton";
import { FollowButton } from "@/components/app/FollowButton";
import { gameFollowId } from "@/lib/aliases";
import { formatDate } from "@/lib/format";
import { titleKey } from "@/lib/text";
import { THEMES, themeFor, type ThemeId } from "@/lib/themes";
import type { Release } from "@/types";

const gameSlug = (title: string) => titleKey(title).replace(/\s+/g, "-").slice(0, 80);

/** Carte d'une grosse sortie ; compacte sur l'accueil. Toucher l'image ou le titre ouvre la fiche du jeu. */
export function ReleaseCard({ release, pinned = false, compact = false }: { release: Release & { at: string }; pinned?: boolean; compact?: boolean }) {
  const theme = release.theme && release.theme in THEMES ? THEMES[release.theme as ThemeId] : themeFor(release.title, release.platforms);
  return (
    <article className="flex h-full flex-col overflow-hidden rounded-xl glass">
      {/* Visuel officiel du jeu ; à défaut, décor propre au jeu (forêt et épée pour Zelda…) */}
      <div className={`relative w-full ${compact ? "aspect-[16/8]" : "aspect-[16/9]"}`}>
        <div className="absolute inset-0">
          <RemoteImage src={release.image} alt={release.title} theme={theme} seed={release.id} className="h-full w-full" />
        </div>
        <div className="absolute right-3 top-3 z-10 flex items-center gap-2">
          {release.video && <TrailerButton video={release.video} title={release.title} />}
          <FollowButton compact item={{ id: gameFollowId(release.title), kind: "game", title: release.title, href: `/jeux/${gameSlug(release.title)}/` }} titles={[release.short]} />
          <PinButton id={release.id} title={release.title} />
        </div>
        {pinned && (
          <span className="absolute left-3 top-3 z-10 rounded-md bg-accent px-2 py-0.5 text-xs font-bold text-white">Épinglé</span>
        )}
        <div className={`relative flex h-full flex-col justify-end bg-gradient-to-t from-black/80 via-black/25 to-transparent ${compact ? "p-3" : "p-4"}`}>
          <div className="flex flex-wrap gap-1.5">
            {release.platforms.map((p) => (
              <PlatformBadge key={p} platform={p} />
            ))}
          </div>
          <h3 className={`mt-2 font-extrabold leading-tight text-white drop-shadow ${compact ? "text-lg" : "text-xl"}`}>
            {/* Lien étiré sur toute l'image : les boutons (épingle, bande-annonce) restent au-dessus. */}
            <Link href={`/jeux/${gameSlug(release.title)}`} className="after:absolute after:inset-0 hover:underline">
              {release.title}
            </Link>
          </h3>
          {release.subtitle && <p className="text-sm text-white/80">{release.subtitle}</p>}
        </div>
      </div>
      {compact ? (
        <div className="flex flex-1 flex-col gap-2.5 p-3">
          <p className="text-sm">
            <span className="text-muted">{formatDate(release.at)} · </span>
            <span className="font-semibold text-accent">
              <Countdown target={release.at} fallback="" doneLabel="disponible !" />
            </span>
          </p>
          <div className="flex items-center gap-1.5">
            <a
              href={`${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/calendrier/${release.id}.ics`}
              aria-label="Ajouter au calendrier"
              title="Ajouter au calendrier"
              className="inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-accent text-white hover:opacity-90"
            >
              <CalendarPlus className="size-3.5" aria-hidden />
            </a>
            <CollectionButtons game={{ id: `sortie-${release.id}`, title: release.short ?? release.title, image: release.image }} />
          </div>
        </div>
      ) : (
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
          <div className="mt-4 flex flex-wrap items-center gap-2">
            {/* Fichier .ics : le téléphone propose d'ajouter la sortie (avec un rappel la veille) à son calendrier */}
            <a
              href={`${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/calendrier/${release.id}.ics`}
              className="inline-flex items-center gap-1.5 rounded-full bg-accent px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90"
            >
              <CalendarPlus className="size-3.5" aria-hidden /> Ajouter au calendrier
            </a>
            <CollectionButtons game={{ id: `sortie-${release.id}`, title: release.short ?? release.title, image: release.image }} />
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
      )}
    </article>
  );
}
