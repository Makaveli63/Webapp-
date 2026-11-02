"use client";

/**
 * Micro-interactions : petit retour haptique et son discret au toucher (j'aime, suivre, épingler, cartes).
 * Réglable dans Réglages → « Sons et vibrations ». Rien n'est joué sans geste de l'utilisateur.
 *
 * Haptique : applis iPhone et Android (moteur natif), Safari iOS 18+ (interrupteur système caché),
 * navigateurs Android (vibration). Son : synthétisé (aucun fichier), très court et bas ; sur iPhone,
 * il suit le bouton silencieux et ne coupe pas la musique en cours.
 */
export type FeedbackKind = "tap" | "on" | "off" | "success";
export interface FeedbackPrefs {
  sound: boolean;
  haptics: boolean;
}
const KEY = "gb-feedback";
export const FEEDBACK_EVENT = "gb-feedback-change";
export const DEFAULTS_FEEDBACK: FeedbackPrefs = { sound: true, haptics: true };
const DEFAULTS = DEFAULTS_FEEDBACK;

let cache: FeedbackPrefs | null = null;
export function readFeedback(): FeedbackPrefs {
  if (cache) return cache;
  try {
    cache = { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) ?? "{}") };
  } catch {
    cache = DEFAULTS;
  }
  return cache!;
}
export function writeFeedback(p: FeedbackPrefs) {
  cache = p;
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    /* stockage indisponible */
  }
  window.dispatchEvent(new Event(FEEDBACK_EVENT));
}

type AppWindow = Window & {
  GamingBaseApp?: { haptic?: (kind: string) => void }; // Android
  webkit?: { messageHandlers?: { gamingbase?: { postMessage: (m: unknown) => void } } }; // iPhone
};

let iosSwitch: HTMLLabelElement | null = null;
/** Safari iOS 18+ : basculer un interrupteur système (caché) déclenche le moteur haptique de l'iPhone. */
function iosHaptic() {
  if (!iosSwitch) {
    iosSwitch = document.createElement("label");
    iosSwitch.className = "fb-ios-switch";
    iosSwitch.setAttribute("aria-hidden", "true");
    const input = document.createElement("input");
    input.type = "checkbox";
    input.setAttribute("switch", "");
    input.tabIndex = -1;
    iosSwitch.appendChild(input);
    document.body.appendChild(iosSwitch);
  }
  iosSwitch.click();
}

function haptic(kind: FeedbackKind) {
  const w = window as AppWindow;
  try {
    if (w.GamingBaseApp?.haptic) return w.GamingBaseApp.haptic(kind);
    if (navigator.userAgent.includes("GamingBaseApp") && w.webkit?.messageHandlers?.gamingbase) {
      return w.webkit.messageHandlers.gamingbase.postMessage({ haptic: kind });
    }
  } catch {
    /* ancienne version de l'appli */
  }
  if (typeof navigator.vibrate === "function") {
    navigator.vibrate(kind === "success" ? [12, 60, 18] : kind === "on" ? 12 : 7);
    return;
  }
  if (/iPhone|iPad/.test(navigator.userAgent) || (/Macintosh/.test(navigator.userAgent) && navigator.maxTouchPoints > 1)) iosHaptic();
}

let audio: AudioContext | null = null;
/** Petites notes synthétisées : « tic » pour un toucher, deux notes montantes pour activer, descendantes pour retirer. */
function sound(kind: FeedbackKind) {
  try {
    const nav = navigator as Navigator & { audioSession?: { type: string } };
    if (nav.audioSession && nav.audioSession.type !== "ambient") nav.audioSession.type = "ambient"; // bouton silencieux respecté
    audio ??= new AudioContext();
    if (audio.state === "suspended") void audio.resume();
    const notes = kind === "tap" ? [1650] : kind === "on" ? [880, 1320] : kind === "off" ? [1100, 740] : [784, 1047, 1568];
    const t0 = audio.currentTime + 0.005;
    notes.forEach((f, i) => {
      const osc = audio!.createOscillator();
      const gain = audio!.createGain();
      const t = t0 + i * 0.055;
      osc.type = "sine";
      osc.frequency.setValueAtTime(f, t);
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(kind === "tap" ? 0.025 : 0.04, t + 0.006);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + (kind === "tap" ? 0.035 : 0.09));
      osc.connect(gain).connect(audio!.destination);
      osc.start(t);
      osc.stop(t + 0.12);
    });
  } catch {
    /* audio indisponible */
  }
}

/** Retour au toucher, selon les réglages. À appeler dans le geste de l'utilisateur. */
export function feedback(kind: FeedbackKind = "tap") {
  if (typeof window === "undefined") return;
  const p = readFeedback();
  if (p.haptics) haptic(kind);
  if (p.sound) sound(kind);
}

/** Vibration seule (glisser sur la barre d'onglets, tirer pour actualiser), si les vibrations sont activées. */
export function hapticOnly(kind: FeedbackKind = "tap") {
  if (typeof window !== "undefined" && readFeedback().haptics) haptic(kind);
}
