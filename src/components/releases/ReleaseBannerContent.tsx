"use client";

import { ChevronDown, Hourglass, Pin } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { PlatformBadge } from "@/components/ui/Badge";
import { Countdown } from "@/components/ui/Countdown";
import { RemoteImage } from "@/components/ui/RemoteImage";
import { pinnedFirst, usePins } from "@/lib/pins";
import { themeFor } from "@/lib/themes";
import type { Release } from "@/types";

const dateLabel = (iso: string) =>
  new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Paris" }).format(new Date(iso));

type Item = Release & { at: string; href: string };

/**
 * Bandeau du jeu épinglé (sinon la prochaine grosse sortie). Touché, il s'agrandit comme une « île » :
 * visuel, plateformes, compte à rebours détaillé et lien vers la fiche du jeu.
 */
export function ReleaseBannerContent({ releases }: { releases: Item[] }) {
  const pins = usePins();
  const [next] = pinnedFirst(releases, pins);
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const collapsed = useRef<DOMRect | null>(null);
  const anim = useRef<Animation | null>(null);
  const pinned = !!pins?.includes(next.id);
  const Icon = pinned ? Pin : Hourglass;

  // Style Capsule : l'île grandit et rétrécit en continu (largeur, hauteur, arrondi), mesurée avant et après.
  const toggle = useCallback(
    (wanted?: boolean) => {
      const el = box.current;
      const target = wanted ?? !open;
      if (target === open) return;
      const smooth =
        el && document.documentElement.dataset.style === "capsule" && !matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (!el || !smooth) {
        setOpen(target);
        return;
      }
      anim.current?.cancel();
      const from = el.getBoundingClientRect();
      const frame = (r: DOMRect, radius: number) => ({ width: `${r.width}px`, height: `${r.height}px`, borderRadius: `${radius}px` });
      if (target) {
        collapsed.current = from;
        flushSync(() => setOpen(true));
        const to = el.getBoundingClientRect();
        anim.current = el.animate([frame(from, from.height / 2), frame(to, 30)], {
          duration: 460,
          easing: "cubic-bezier(.2, .9, .25, 1.12)",
        });
      } else {
        const to = collapsed.current ?? from;
        anim.current = el.animate([frame(from, 30), frame(to, to.height / 2)], { duration: 320, easing: "cubic-bezier(.4, 0, .2, 1)" });
        anim.current.onfinish = () => setOpen(false);
      }
    },
    [open],
  );

  // Se referme en touchant ailleurs ou avec Échap.
  useEffect(() => {
    if (!open) return;
    const close = (e: Event) => {
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !box.current?.contains(e.target as Node)) toggle(false);
    };
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", close);
    };
  }, [open, toggle]);

  return (
    <div ref={box} className="island" data-open={open ? "1" : undefined}>
      <button
        type="button"
        onClick={() => toggle()}
        aria-expanded={open}
        className="island-bar mx-auto flex w-full max-w-6xl items-center gap-2 px-4 py-2 text-left text-sm"
      >
        <Icon className="size-4 shrink-0 text-accent" fill={pinned ? "currentColor" : "none"} aria-hidden />
        {/* Le nom peut être tronqué, jamais le compte à rebours. */}
        <span className="min-w-0 truncate font-semibold text-heading">{next.short ?? next.title}</span>
        <span className="shrink-0 font-semibold text-accent">
          <Countdown target={next.at} fallback={`le ${dateLabel(next.at)}`} doneLabel="disponible !" />
        </span>
        <ChevronDown className={`island-chevron ml-auto size-4 shrink-0 text-muted transition-transform ${open ? "rotate-180" : ""}`} aria-hidden />
      </button>
      <div className="island-panel grid transition-[grid-template-rows] duration-300 ease-out" data-open={open ? "1" : undefined}>
        <div className="overflow-hidden">
          <div className="mx-auto flex max-w-6xl gap-3 px-4 pb-3 pt-1">
            <Link href={next.href} className="relative aspect-[3/4] w-24 shrink-0 overflow-hidden rounded-xl">
              <RemoteImage src={next.image} alt={next.title} theme={themeFor(next.title, next.platforms)} seed={next.id} className="h-full w-full" />
            </Link>
            <div className="min-w-0 flex-1">
              <p className="line-clamp-2 font-bold text-heading">{next.title}</p>
              {next.subtitle && <p className="text-xs text-muted">{next.subtitle}</p>}
              <div className="mt-1 flex flex-wrap gap-1">
                {next.platforms.map((p) => (
                  <PlatformBadge key={p} platform={p} />
                ))}
              </div>
              <p className="mt-1.5 text-xs text-muted">Sortie le {dateLabel(next.at)}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <Link href={next.href} className="rounded-full bg-accent px-3 py-1.5 text-xs font-semibold text-white">
                  Voir la fiche
                </Link>
                <Link href="/sorties" className="island-ghost rounded-full px-3 py-1.5 text-xs font-semibold text-heading ring-1 ring-inset ring-border">
                  Toutes les sorties
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
