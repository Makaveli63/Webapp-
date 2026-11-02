"use client";

import { useEffect, useState } from "react";
import type { Category } from "@/types";

/**
 * « Mes rubriques » : les rubriques à part (Anime, Comics, Cartes) affichées ou masquées, comme les consoles.
 * Masquée = absente de l'accueil (raccourci, section, « Pour toi »). Gardé sur l'appareil et synchronisé.
 */
export type TopicId = Extract<Category, "Anime" | "Comics" | "TCG">;
export const TOPICS_KEY = "gb-rubriques-masquees";
export const TOPICS_EVENT = "gb-rubriques-change";
export const TOPIC_IDS: readonly TopicId[] = ["Anime", "Comics", "TCG"];

export function readHiddenTopics(): TopicId[] {
  try {
    const list = JSON.parse(localStorage.getItem(TOPICS_KEY) ?? "[]");
    return Array.isArray(list) ? TOPIC_IDS.filter((t) => list.includes(t)) : [];
  } catch {
    return [];
  }
}

export function setTopicShown(id: TopicId, shown: boolean) {
  const hidden = readHiddenTopics().filter((t) => t !== id);
  try {
    localStorage.setItem(TOPICS_KEY, JSON.stringify(shown ? hidden : [...hidden, id]));
  } catch {
    /* stockage indisponible */
  }
  window.dispatchEvent(new Event(TOPICS_EVENT));
}

/** Rubriques masquées ; vide pendant l'affichage initial (page identique pour tout le monde). */
export function useHiddenTopics(): TopicId[] {
  const [list, setList] = useState<TopicId[]>([]);
  useEffect(() => {
    const load = () => setList(readHiddenTopics());
    load();
    window.addEventListener(TOPICS_EVENT, load);
    window.addEventListener("storage", load);
    return () => {
      window.removeEventListener(TOPICS_EVENT, load);
      window.removeEventListener("storage", load);
    };
  }, []);
  return list;
}

export const topicHidden = (category: Category, hidden: readonly string[]) => hidden.includes(category);
