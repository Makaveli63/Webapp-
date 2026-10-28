"use client";

import { useEffect } from "react";
import { nextEpisodes } from "@/lib/anilist";
import { FOLLOWS_EVENT, readFollows, updateNext } from "@/lib/follows";
import { inApp, PREFS_EVENT, sendPrefs } from "@/lib/notif-prefs";

/**
 * Tient l'app au courant des jeux et animes suivis (🔔), sur toutes les pages : réglages envoyés au
 * chargement et à chaque changement, prochains épisodes des animes suivis rafraîchis depuis AniList.
 */
export function NotifBridge() {
  useEffect(() => {
    if (!inApp()) return;
    const send = () => sendPrefs();
    send();
    const controller = new AbortController();
    const anime = readFollows().filter((f) => f.kind === "anime");
    const ids = anime.map((f) => Number(f.id.replace(/^anilist-/, ""))).filter((n) => Number.isInteger(n) && n > 0);
    nextEpisodes(ids, controller.signal)
      .then((media) => {
        const next = new Map(
          media.map((m) => [
            `anilist-${m.id}`,
            m.nextAiringEpisode ? { episode: m.nextAiringEpisode.episode, at: new Date(m.nextAiringEpisode.airingAt * 1000).toISOString() } : undefined,
          ]),
        );
        updateNext(next); // déclenche un nouvel envoi si un épisode a changé
      })
      .catch(() => {
        /* hors connexion : les dates connues restent */
      });
    for (const e of [FOLLOWS_EVENT, PREFS_EVENT, "gb-collection-change", "gb-spoiler-change"]) window.addEventListener(e, send);
    return () => {
      controller.abort();
      for (const e of [FOLLOWS_EVENT, PREFS_EVENT, "gb-collection-change", "gb-spoiler-change"]) window.removeEventListener(e, send);
    };
  }, []);
  return null;
}
