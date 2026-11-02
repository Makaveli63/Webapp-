"use client";

import { BookOpen, Spade } from "lucide-react";
import type { ComponentType } from "react";
import { FlowerIcon } from "@/components/ui/FlowerIcon";
import { setTopicShown, useHiddenTopics, type TopicId } from "@/lib/topics";

export const TOPIC_META: Record<TopicId, { label: string; hint: string; Icon: ComponentType<{ className?: string; "aria-hidden"?: boolean }> }> = {
  Anime: { label: "Anime", hint: "Actus, épisodes et sorties", Icon: FlowerIcon },
  Comics: { label: "Comics", hint: "DC, Marvel, films et séries", Icon: BookOpen },
  TCG: { label: "Cartes", hint: "Pokémon, Magic, Yu-Gi-Oh!, Lorcana…", Icon: Spade },
};

/** Réglages : « Mes rubriques », afficher ou masquer Anime, Comics et Cartes sur l'accueil. */
export function TopicsSetting() {
  const hidden = useHiddenTopics();
  return (
    <section className="glass space-y-4 rounded-xl p-4">
      <div>
        <h2 className="font-semibold text-heading">Mes rubriques</h2>
        <p className="text-sm text-muted">Masquées, elles disparaissent de l&apos;accueil, de la barre du bas et de « Pour toi ». Leurs pages restent accessibles.</p>
      </div>
      {(Object.keys(TOPIC_META) as TopicId[]).map((id) => {
        const { label, hint, Icon } = TOPIC_META[id];
        const on = !hidden.includes(id);
        return (
          <div key={id} className="flex items-center gap-3">
            <span className={`topic-icon topic-icon-${id.toLowerCase()} flex size-9 shrink-0 items-center justify-center rounded-xl ${on ? "" : "opacity-40 grayscale"}`}>
              <Icon className="size-5" aria-hidden />
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-heading">{label}</p>
              <p className="text-sm text-muted">{hint}</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={on}
              aria-label={`Afficher la rubrique ${label}`}
              onClick={() => setTopicShown(id, !on)}
              className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors ${on ? "bg-accent" : "bg-surface-2 ring-1 ring-inset ring-border"}`}
            >
              <span className={`inline-block size-5 rounded-full bg-white shadow transition-transform ${on ? "translate-x-6" : "translate-x-1"}`} />
            </button>
          </div>
        );
      })}
    </section>
  );
}
