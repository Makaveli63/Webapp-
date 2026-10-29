"use client";

/**
 * Notifications web via OneSignal (site sur ordinateur, Android, et iPhone quand le site est ajouté
 * à l'écran d'accueil). Les applications Android et iPhone gardent leurs propres notifications.
 * Le SDK n'est chargé qu'à la demande, depuis les Réglages : aucun script tiers pour les autres visiteurs.
 *
 * Ciblage : un seul tag « gb » = « plateformes|options », par ex. « pc+ps5|as »
 * (plateformes : pc, ps5, switch2, xbox ou « all » ; options : a = anime, d = jeu du jour, s = grosses sorties).
 * scripts/send-push.mjs lit le même format.
 */
const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
export const ONESIGNAL_APP_ID = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID || "a643844e-4e4c-4653-8d05-0dd407d79f8f";
// OneSignal n'accepte que l'adresse déclarée dans son tableau de bord.
const PUSH_ORIGIN = process.env.NEXT_PUBLIC_PUSH_ORIGIN || "https://makaveli63.github.io";
const SDK = "https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js";
export const PUSH_KEY = "gb-push";
export const PUSH_PREFS_KEY = "gb-push-prefs";

export const PUSH_PLATFORMS = [
  ["PS5", "ps5"],
  ["Switch 2", "switch2"],
  ["Xbox", "xbox"],
  ["PC", "pc"],
] as const;

export interface PushPrefs {
  platforms: string[]; // codes (ps5…) ; vide = toutes
  anime: boolean;
  daily: boolean;
  releases: boolean;
}
export const DEFAULT_PUSH_PREFS: PushPrefs = { platforms: [], anime: true, daily: true, releases: true };

export function pushTag(p: PushPrefs): string {
  const plats = PUSH_PLATFORMS.map(([, code]) => code).filter((c) => p.platforms.includes(c)).sort();
  const flags = `${p.anime ? "a" : ""}${p.daily ? "d" : ""}${p.releases ? "s" : ""}`;
  return `${plats.length ? plats.join("+") : "all"}|${flags || "-"}`;
}

interface OneSignalApi {
  init: (o: Record<string, unknown>) => Promise<void>;
  Notifications: { permission: boolean; requestPermission: () => Promise<void> };
  User: { addTag: (k: string, v: string) => void; PushSubscription: { optedIn?: boolean; optIn: () => Promise<void>; optOut: () => Promise<void> } };
}
type PushWindow = Window & { OneSignalDeferred?: ((os: OneSignalApi) => void)[] };

export type PushSupport = "ok" | "ios-home-screen" | "unsupported";
export function pushSupport(): PushSupport {
  if (typeof window === "undefined" || navigator.userAgent.includes("GamingBaseApp") || location.origin !== PUSH_ORIGIN) return "unsupported";
  if ("serviceWorker" in navigator && "PushManager" in window && "Notification" in window) return "ok";
  // iPhone / iPad : les notifications web n'existent que pour un site ajouté à l'écran d'accueil (iOS 16.4+).
  const ios = /iPhone|iPad/.test(navigator.userAgent) || (/Macintosh/.test(navigator.userAgent) && navigator.maxTouchPoints > 1);
  return ios ? "ios-home-screen" : "unsupported";
}

let sdk: Promise<OneSignalApi> | null = null;
let initialized: Promise<void> | null = null;
/** Charge le SDK et l'initialise une seule fois par page (un second init est refusé par OneSignal). */
export function loadOneSignal(): Promise<OneSignalApi> {
  sdk ??= new Promise<OneSignalApi>((resolve, reject) => {
    const w = window as PushWindow;
    w.OneSignalDeferred = w.OneSignalDeferred || [];
    w.OneSignalDeferred.push((OneSignal) => resolve(OneSignal));
    const s = document.createElement("script");
    s.src = SDK;
    s.defer = true;
    s.onerror = () => {
      sdk = null;
      s.remove();
      reject(new Error("Service de notifications injoignable (bloqueur de pubs ?)."));
    };
    document.head.appendChild(s);
  });
  return sdk.then(async (OneSignal) => {
    initialized ??= OneSignal.init({
      appId: ONESIGNAL_APP_ID,
      // Service worker dans son dossier (public/push/onesignal/), comme réglé dans OneSignal.
      serviceWorkerPath: `${BASE}/push/onesignal/OneSignalSDKWorker.js`.replace(/^\//, ""),
      serviceWorkerParam: { scope: `${BASE}/push/onesignal/` },
    }).catch((err: Error) => {
      if (/already initialized/i.test(err?.message ?? "")) return;
      initialized = null;
      throw err;
    });
    await initialized;
    return OneSignal;
  });
}

/** Étape en cours dans le message d'erreur (« Timeout » seul ne dit pas où ça bloque). */
async function step<T>(label: string, run: () => Promise<T>): Promise<T> {
  try {
    return await run();
  } catch (err) {
    throw new Error(`${label} : ${(err as Error)?.message || String(err)}`);
  }
}

export function readPushPrefs(): PushPrefs {
  try {
    return { ...DEFAULT_PUSH_PREFS, ...JSON.parse(localStorage.getItem(PUSH_PREFS_KEY) ?? "{}") };
  } catch {
    return DEFAULT_PUSH_PREFS;
  }
}
export function pushOn(): boolean {
  try {
    return localStorage.getItem(PUSH_KEY) === "1";
  } catch {
    return false;
  }
}
function remember(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* stockage indisponible */
  }
}

/** Demande l'autorisation (au toucher de l'interrupteur), puis abonne cet appareil. */
export async function enablePush(prefs: PushPrefs): Promise<"ok" | "denied"> {
  // La demande d'autorisation part tout de suite, dans le geste de l'utilisateur : Safari (et Chrome
  // parfois) ignore une demande faite après un chargement de script.
  const asked = Notification.permission === "default" ? Notification.requestPermission() : Promise.resolve(Notification.permission);
  if ((await asked) !== "granted") return "denied";
  const OneSignal = await step("Démarrage", loadOneSignal);
  await step("Abonnement", () => OneSignal.User.PushSubscription.optIn());
  OneSignal.User.addTag("gb", pushTag(prefs));
  remember(PUSH_KEY, "1");
  return "ok";
}

export async function disablePush() {
  remember(PUSH_KEY, "0");
  const OneSignal = await loadOneSignal();
  await OneSignal.User.PushSubscription.optOut();
}

export async function savePushPrefs(prefs: PushPrefs) {
  remember(PUSH_PREFS_KEY, JSON.stringify(prefs));
  if (!pushOn()) return;
  const OneSignal = await loadOneSignal();
  OneSignal.User.addTag("gb", pushTag(prefs));
}
