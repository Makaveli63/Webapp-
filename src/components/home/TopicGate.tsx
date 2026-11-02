"use client";

import type { ReactNode } from "react";
import { useHiddenTopics, type TopicId } from "@/lib/topics";

/** Bloc de l'accueil propre à une rubrique (Anime, Comics, Cartes) : retiré si elle est masquée dans « Mes rubriques ». */
export function TopicGate({ topic, children }: { topic: TopicId; children: ReactNode }) {
  const hidden = useHiddenTopics();
  return hidden.includes(topic) ? null : <>{children}</>;
}
