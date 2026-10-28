"use client";

import { useEffect } from "react";
import { nextEpisodes } from "@/lib/anilist";
import { FOLLOWS_EVENT, readFollows, updateNext } from "@/lib/follows";
import { inApp, PREFS_EVENT, sendPrefs } from "@/lib/notif-prefs";
import { readTracker, setEpisodes, TRACKER_EVENT } from "@/lib/tracker";

/**
 * Tient l'app au courant des jeux et animes suivis (🔔), sur toutes les pages : réglages envoyés au
 * chargement et à chaque changement, prochains épisodes des animes suivis rafraîchis depuis AniList.
 */
export function NotifBridge() {
  useEffect(() => {
    if (!inApp()) return;
    const send = () => sendPrefs();
    send();
    // Épisodes cochés depuis le widget « Mes épisodes » : l'app les transmet, ils rejoignent le suivi.
    const w = window as Window & {
      gbMarkEpisodes?: (list: { id: string; episode: number }[]) => boolean;
      GamingBaseApp?: { takePendingEpisodes?: () => string };
      webkit?: { messageHandlers?: { gamingbase?: { postMessage: (m: unknown) => void } } };
    };
    w.gbMarkEpisodes = (list) => {
      const t = readTracker();
      for (const { id, episode } of Array.isArray(list) ? list.slice(0, 100) : []) {
        const a = t.anime[id];
        if (!a || !Number.isInteger(episode) || episode < 1 || episode > 2000) continue;
        setEpisodes(a, [...a.seen, episode]);
        a.seen = [...a.seen, episode];
      }
      return true;
    };
    const pull = () => {
      if (document.visibilityState !== "visible") return;
      try {
        const json = w.GamingBaseApp?.takePendingEpisodes?.();
        if (json) w.gbMarkEpisodes?.(JSON.parse(json));
        w.webkit?.messageHandlers?.gamingbase?.postMessage({ pendingEpisodes: true });
      } catch {
        /* ancienne version de l'app */
      }
    };
    pull();
    document.addEventListener("visibilitychange", pull);
    window.addEventListener(TRACKER_EVENT, send); // le widget suit les épisodes cochés
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
    for (const e of [FOLLOWS_EVENT, PREFS_EVENT, "gb-collection-change", "gb-spoiler-change", "gb-masques-change"]) window.addEventListener(e, send);
    return () => {
      controller.abort();
      document.removeEventListener("visibilitychange", pull);
      window.removeEventListener(TRACKER_EVENT, send);
      for (const e of [FOLLOWS_EVENT, PREFS_EVENT, "gb-collection-change", "gb-spoiler-change", "gb-masques-change"]) window.removeEventListener(e, send);
    };
  }, []);
  return null;
}
