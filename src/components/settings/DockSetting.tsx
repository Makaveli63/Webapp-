"use client";

import { ChevronDown, ChevronUp, Lock, Plus, RefreshCw, X } from "lucide-react";
import { useEffect, useState } from "react";
import { DOCK_CHOICES, DOCK_MAX, dockLinks, NAV_LINKS } from "@/components/layout/nav-links";
import { useDock, writeDock } from "@/lib/dock";
import { useHiddenTopics, type TopicId } from "@/lib/topics";

const TOPIC_OF: Record<string, TopicId> = { "/anime": "Anime", "/comics": "Comics", "/tcg": "TCG" };
const link = (href: string) => NAV_LINKS.find((l) => l.href === href)!;

/**
 * Réglages → « Ma barre du bas » : choisir les onglets (5 au plus, Accueil compris) et leur ordre.
 * Même barre sur le site, l'appli iPhone et l'appli Android.
 */
export function DockSetting() {
  const hidden = useHiddenTopics();
  const custom = useDock();
  // Onglets actuels hors Accueil (la barre par défaut tant que rien n'est choisi).
  const current = dockLinks(hidden, custom).map((l) => l.href).filter((h) => h !== "/");
  const full = current.length >= DOCK_MAX - 1;
  // Ancienne appli iPhone : sa barre native est figée, elle ne suit pas encore ce réglage.
  const [oldApp, setOldApp] = useState(false);
  useEffect(() => {
    const root = document.documentElement;
    setOldApp(root.hasAttribute("data-native-tabs") && !root.hasAttribute("data-native-dock"));
  }, []);

  const save = (list: string[]) => writeDock(list);
  const move = (i: number, d: -1 | 1) => {
    const next = [...current];
    [next[i], next[i + d]] = [next[i + d], next[i]];
    save(next);
  };
  const remove = (href: string) => save(current.filter((h) => h !== href));
  const add = (href: string) => !full && save([...current, href]);

  const btn = "flex size-9 items-center justify-center rounded-full text-muted hover:bg-surface-2 hover:text-heading disabled:opacity-30";
  return (
    <section className="glass rounded-xl p-4">
      <h2 className="font-semibold text-heading">Ma barre du bas</h2>
      <p className="text-sm text-muted">Choisis tes onglets et leur ordre ({DOCK_MAX} au plus, Accueil compris).</p>
      {oldApp && (
        <p className="mt-3 flex items-start gap-2 rounded-lg bg-amber-500/12 p-3 text-sm text-amber-900 ring-1 ring-inset ring-amber-500/30 dark:text-amber-200">
          <RefreshCw className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span>
            La barre du bas de ton appli vient de l&apos;iPhone et cette version ne suit pas encore ce réglage. Mets à jour GamingBase dans
            AltStore (onglet « Mes apps », puis « Mettre à jour »), puis rouvre l&apos;appli.
          </span>
        </p>
      )}

      {/* Aperçu */}
      <div className="mt-3 flex justify-around rounded-2xl bg-surface-2 px-2 py-2" aria-hidden>
        {["/", ...current].map((h) => {
          const { label, icon: Icon } = link(h);
          return (
            <span key={h} className="flex min-w-0 flex-col items-center gap-0.5 text-[10px] font-semibold text-heading">
              <Icon className="size-5" aria-hidden />
              <span className="truncate">{label}</span>
            </span>
          );
        })}
      </div>

      <ol className="mt-3 divide-y divide-border">
        <li className="flex items-center gap-3 py-2 text-sm">
          <House />
          <span className="flex-1 font-semibold text-heading">Accueil</span>
          <Lock className="mr-2.5 size-4 text-muted" aria-label="Toujours en premier" />
        </li>
        {current.map((h, i) => {
          const { label, icon: Icon } = link(h);
          return (
            <li key={h} className="flex items-center gap-3 py-1.5 text-sm">
              <Icon className="size-5 shrink-0 text-accent" aria-hidden />
              <span className="flex-1 font-semibold text-heading">{label}</span>
              <button type="button" onClick={() => move(i, -1)} disabled={i === 0} aria-label={`Monter ${label}`} className={btn} data-feedback="tap">
                <ChevronUp className="size-4" aria-hidden />
              </button>
              <button type="button" onClick={() => move(i, 1)} disabled={i === current.length - 1} aria-label={`Descendre ${label}`} className={btn} data-feedback="tap">
                <ChevronDown className="size-4" aria-hidden />
              </button>
              <button type="button" onClick={() => remove(h)} disabled={current.length <= 1} aria-label={`Retirer ${label}`} className={btn} data-feedback="off">
                <X className="size-4" aria-hidden />
              </button>
            </li>
          );
        })}
      </ol>

      <p className="mt-3 text-xs font-semibold uppercase tracking-wider text-muted">{full ? `Barre complète : retire un onglet pour en ajouter un` : "Ajouter"}</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {DOCK_CHOICES.filter((h) => !current.includes(h)).map((h) => {
          const { label, icon: Icon } = link(h);
          const masked = !!TOPIC_OF[h] && hidden.includes(TOPIC_OF[h]);
          return (
            <button
              key={h}
              type="button"
              onClick={() => add(h)}
              disabled={full || masked}
              title={masked ? "Rubrique masquée dans « Mes rubriques »" : undefined}
              data-feedback="on"
              className="inline-flex items-center gap-1.5 rounded-full glass-pill px-3 py-1.5 text-sm font-semibold text-heading ring-1 ring-inset ring-border hover:ring-accent disabled:opacity-40"
            >
              <Plus className="size-3.5" aria-hidden />
              <Icon className="size-4" aria-hidden />
              {label}
              {masked && <span className="text-xs font-normal text-muted">(masquée)</span>}
            </button>
          );
        })}
      </div>

      {custom && (
        <button type="button" onClick={() => writeDock(null)} className="mt-3 text-sm text-muted underline underline-offset-2 hover:text-fg">
          Revenir à la barre par défaut
        </button>
      )}
    </section>
  );
}

function House() {
  const { icon: Icon } = link("/");
  return <Icon className="size-5 shrink-0 text-accent" aria-hidden />;
}
