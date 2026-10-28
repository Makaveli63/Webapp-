"use client";

import { useEffect, useState } from "react";
import { browserVoice, readVoice } from "@/lib/voice";

/**
 * « Écouter les actus » : lecture partagée par toute l'appli. Le mini-lecteur reste affiché sur toutes les pages
 * tant que la lecture n'est pas arrêtée (comme dans Musique ou Podcasts).
 */
export interface SpokenItem {
  title: string;
  text: string;
  /** Page de l'actu (toucher le mini-lecteur l'ouvre) */
  path?: string;
}
export type ListenState = "playing" | "paused" | "stopped";
export type ListenCmd = "pause" | "resume" | "next" | "previous" | "stop";

interface Snapshot {
  items: SpokenItem[];
  index: number;
  state: ListenState;
}

type AppWindow = Window & {
  GamingBaseApp?: { speak?: (json: string) => void; speakControl?: (cmd: string) => void }; // Android
  webkit?: { messageHandlers?: { gamingbase?: { postMessage: (m: unknown) => void } } }; // iPhone
};

const SAVE_KEY = "gb-listen";
let snap: Snapshot = { items: [], index: -1, state: "stopped" };
const subscribers = new Set<(s: Snapshot) => void>();
let browserRun = 0;

function set(next: Partial<Snapshot>) {
  snap = { ...snap, ...next };
  try {
    sessionStorage.setItem(SAVE_KEY, JSON.stringify(snap)); // retrouvé après un rechargement de la page
  } catch {
    /* stockage indisponible */
  }
  subscribers.forEach((f) => f(snap));
}

const native = () => {
  const w = window as AppWindow;
  if (w.GamingBaseApp?.speak) return "android";
  if (w.webkit?.messageHandlers?.gamingbase && navigator.userAgent.includes("GamingBaseApp")) return "ios";
  return null;
};

// Lecture dans le navigateur (site hors appli).
function speakWeb(i: number) {
  speechSynthesis.cancel();
  const run = ++browserRun;
  if (i < 0 || i >= snap.items.length) return set({ items: [], index: -1, state: "stopped" });
  const prefs = readVoice();
  const u = new SpeechSynthesisUtterance(snap.items[i].text);
  u.lang = "fr-FR";
  const voice = browserVoice(prefs.voice);
  if (voice) u.voice = voice;
  u.rate = prefs.rate;
  u.onend = () => run === browserRun && speakWeb(i + 1);
  speechSynthesis.speak(u);
  set({ index: i, state: "playing" });
}

export function startListening(items: SpokenItem[]) {
  if (!items.length) return;
  set({ items, index: 0, state: "playing" });
  const w = window as AppWindow;
  const prefs = readVoice();
  const payload = items.map(({ title, text }) => ({ title, text }));
  const kind = native();
  if (kind === "android") w.GamingBaseApp?.speak?.(JSON.stringify({ items: payload, voice: prefs.voice, rate: prefs.rate }));
  else if (kind === "ios") w.webkit?.messageHandlers?.gamingbase?.postMessage({ speak: payload, speakVoice: prefs.voice, speakRate: prefs.rate });
  else if (typeof speechSynthesis !== "undefined") speakWeb(0);
}

export function controlListening(cmd: ListenCmd) {
  const w = window as AppWindow;
  const kind = native();
  if (kind === "android") return w.GamingBaseApp?.speakControl?.(cmd);
  if (kind === "ios") return w.webkit?.messageHandlers?.gamingbase?.postMessage({ speakControl: cmd });
  if (typeof speechSynthesis === "undefined") return;
  if (cmd === "pause") {
    speechSynthesis.pause();
    set({ state: "paused" });
  } else if (cmd === "resume") {
    speechSynthesis.resume();
    set({ state: "playing" });
  } else if (cmd === "next") speakWeb(snap.index + 1);
  else if (cmd === "previous") speakWeb(Math.max(0, snap.index - 1));
  else speakWeb(-1);
}

let wired = false;
/** Réponses de l'app (actu en cours, pause, fin) ; à brancher une seule fois. */
function wire() {
  if (wired || typeof window === "undefined") return;
  wired = true;
  try {
    const saved = JSON.parse(sessionStorage.getItem(SAVE_KEY) ?? "null") as Snapshot | null;
    // Après un rechargement, l'app continue de lire : le mini-lecteur revient (dans le navigateur, la lecture s'est arrêtée).
    if (saved?.items?.length && saved.state !== "stopped" && native()) snap = saved;
  } catch {
    /* rien */
  }
  window.addEventListener("gb-speak", (e) => {
    const d = (e as CustomEvent<{ index: number; state: string }>).detail;
    if (!d) return;
    const state: ListenState = d.state === "playing" ? "playing" : d.state === "paused" ? "paused" : "stopped";
    // Arrêt : la liste est oubliée (un exemple de voix joué depuis Réglages n'affiche pas l'ancienne actu).
    if (state === "stopped") return set({ items: [], index: -1, state });
    set({ index: d.index >= 0 ? d.index : snap.index, state });
  });
}

export function useListening(): Snapshot {
  const [s, setS] = useState(snap);
  useEffect(() => {
    wire();
    setS(snap);
    subscribers.add(setS);
    return () => {
      subscribers.delete(setS);
    };
  }, []);
  return s;
}
