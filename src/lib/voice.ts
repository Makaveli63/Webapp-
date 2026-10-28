"use client";

/** Voix de « Écouter les actus » : choisie dans Réglages, sinon la plus naturelle du téléphone. */
export const VOICE_KEY = "gb-voice";

export interface VoicePrefs {
  /** Identifiant de la voix (iPhone, Android) ou nom (navigateur) ; vide = la plus naturelle */
  voice: string;
  /** Vitesse : 0,85 lente · 1 normale · 1,15 rapide · 1,3 très rapide */
  rate: number;
}

export interface VoiceOption {
  id: string;
  name: string;
  detail: string;
  natural: boolean;
}

export function readVoice(): VoicePrefs {
  try {
    const v = JSON.parse(localStorage.getItem(VOICE_KEY) ?? "{}");
    return { voice: typeof v.voice === "string" ? v.voice : "", rate: typeof v.rate === "number" ? Math.min(1.4, Math.max(0.7, v.rate)) : 1 };
  } catch {
    return { voice: "", rate: 1 };
  }
}

export function saveVoice(p: VoicePrefs) {
  try {
    localStorage.setItem(VOICE_KEY, JSON.stringify(p));
  } catch {
    /* stockage indisponible */
  }
}

// Voix du navigateur les plus naturelles : « Premium », « Améliorée », voix neuronales en ligne.
const NATURAL = /premium|enhanced|am[ée]lior|natural|neural|online|google/i;

export function browserVoices(): VoiceOption[] {
  if (typeof speechSynthesis === "undefined") return [];
  return speechSynthesis
    .getVoices()
    .filter((v) => v.lang.toLowerCase().startsWith("fr"))
    .sort((a, b) => Number(NATURAL.test(b.name)) - Number(NATURAL.test(a.name)) || Number(b.lang === "fr-FR") - Number(a.lang === "fr-FR"))
    .map((v) => ({ id: v.name, name: v.name.replace(/\s*\(.*\)$/, ""), detail: `${NATURAL.test(v.name) ? "Naturelle" : "Standard"} · ${v.lang}`, natural: NATURAL.test(v.name) }));
}

/** Voix du navigateur à utiliser : la choisie, sinon la plus naturelle. */
export function browserVoice(id: string): SpeechSynthesisVoice | undefined {
  const all = speechSynthesis.getVoices();
  const first = browserVoices()[0];
  return all.find((v) => v.name === id) ?? all.find((v) => v.name === first?.id);
}
