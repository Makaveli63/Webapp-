"use client";

import { Share2, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useTracker, type Tracker } from "@/lib/tracker";

const MONTHS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
const pad = (n: number) => String(n).padStart(2, "0");

interface Recap {
  label: string;
  minutes: number;
  gameMinutes: number;
  animeMinutes: number;
  days: number;
  streak: number;
  topGame?: string;
  topAnime?: { title: string; seen: number };
}

/** Bilan d'un mois (« 2026-10 ») à partir du journal de la bibliothèque. */
function recapOf(t: Tracker, year: number, month: number): Recap {
  const prefix = `${year}-${pad(month + 1)}-`;
  let gameMinutes = 0;
  let animeMinutes = 0;
  let days = 0;
  let streak = 0;
  let run = 0;
  const last = new Date(year, month + 1, 0).getDate();
  for (let d = 1; d <= last; d++) {
    const e = t.log[`${prefix}${pad(d)}`];
    const m = (e?.a ?? 0) + (e?.g ?? 0);
    gameMinutes += e?.g ?? 0;
    animeMinutes += e?.a ?? 0;
    if (m > 0) {
      days++;
      streak = Math.max(streak, ++run);
    } else run = 0;
  }
  // Jeu et anime du mois : modifiés ce mois-ci, les plus avancés.
  const inMonth = (iso?: string) => !!iso && iso.startsWith(prefix.slice(0, 8));
  const game = Object.values(t.games)
    .filter((g) => inMonth(g.updatedAt))
    .sort((a, b) => (b.hours ?? 0) - (a.hours ?? 0))[0];
  const anime = Object.values(t.anime)
    .filter((a) => inMonth(a.updatedAt))
    .sort((a, b) => b.seen.length - a.seen.length)[0];
  return {
    label: `${MONTHS[month]} ${year}`,
    minutes: gameMinutes + animeMinutes,
    gameMinutes,
    animeMinutes,
    days,
    streak,
    topGame: game?.title,
    topAnime: anime ? { title: anime.title, seen: anime.seen.length } : undefined,
  };
}

const hours = (m: number) => (m >= 600 ? `${Math.round(m / 60)} h` : m >= 60 ? `${Math.floor(m / 60)} h ${pad(m % 60)}` : `${m} min`);

/** Image 1080 × 1920 (format story) du récap, dessinée sur un canvas. */
async function drawStory(r: Recap): Promise<Blob | null> {
  const c = document.createElement("canvas");
  c.width = 1080;
  c.height = 1920;
  const g = c.getContext("2d");
  if (!g) return null;
  g.fillStyle = "#1b1530";
  g.fillRect(0, 0, 1080, 1920);
  const glow = (x: number, y: number, color: string) => {
    const grad = g.createRadialGradient(x, y, 0, x, y, 900);
    grad.addColorStop(0, color);
    grad.addColorStop(1, "rgba(27,21,48,0)");
    g.fillStyle = grad;
    g.fillRect(0, 0, 1080, 1920);
  };
  glow(0, 0, "rgba(139,92,246,.95)");
  glow(1080, 1920, "rgba(0,180,216,.8)");
  await document.fonts?.ready;
  const font = (w: number, s: number) => `${w} ${s}px Inter, system-ui, -apple-system, sans-serif`;
  g.fillStyle = "rgba(255,255,255,.8)";
  g.font = font(700, 40);
  g.fillText(`MON MOIS · ${r.label.toUpperCase()}`, 90, 200);
  g.fillStyle = "#fff";
  g.font = font(800, 220);
  g.fillText(hours(r.minutes), 80, 470);
  g.font = font(500, 48);
  g.fillStyle = "rgba(255,255,255,.85)";
  g.fillText("de jeu et d'anime", 90, 550);
  const rows: [string, string][] = [
    ["🎮 Jeu", hours(r.gameMinutes)],
    ["🌸 Anime", hours(r.animeMinutes)],
    ["📅 Jours actifs", `${r.days}`],
    ["🔥 Série de jours", `${r.streak}`],
  ];
  if (r.topGame) rows.push(["🏆 Jeu du mois", r.topGame]);
  if (r.topAnime) rows.push(["⭐ Anime du mois", `${r.topAnime.title} · ${r.topAnime.seen} ép.`]);
  let y = 720;
  for (const [k, v] of rows) {
    g.fillStyle = "rgba(255,255,255,.2)";
    g.fillRect(90, y - 70, 900, 2);
    g.fillStyle = "rgba(255,255,255,.8)";
    g.font = font(500, 44);
    g.fillText(k, 90, y);
    g.fillStyle = "#fff";
    g.font = font(700, 44);
    const text = v.length > 26 ? `${v.slice(0, 25)}…` : v;
    g.fillText(text, 990 - g.measureText(text).width, y);
    y += 150;
  }
  g.fillStyle = "#fff";
  g.font = font(800, 56);
  g.fillText("GamingBase", 90, 1800);
  return new Promise((resolve) => c.toBlob(resolve, "image/png"));
}

/** 🗓️ Récap du mois (ou du mois dernier en début de mois), partageable en story. */
export function MonthRecap() {
  const tracker = useTracker();
  const [image, setImage] = useState<{ url: string; blob: Blob } | null>(null);
  const [busy, setBusy] = useState(false);
  const recap = useMemo(() => {
    if (!tracker) return null;
    const now = new Date();
    // Les 3 premiers jours du mois : bilan du mois qui vient de finir.
    const ref = now.getDate() <= 3 ? new Date(now.getFullYear(), now.getMonth() - 1, 1) : now;
    return recapOf(tracker, ref.getFullYear(), ref.getMonth());
  }, [tracker]);
  useEffect(
    () => () => {
      if (image) URL.revokeObjectURL(image.url);
    },
    [image],
  );

  if (!recap || recap.minutes === 0) return null;

  const share = async () => {
    setBusy(true);
    const blob = await drawStory(recap).catch(() => null);
    setBusy(false);
    if (!blob) return;
    const name = `gamingbase-${recap.label.normalize("NFD").replace(/[^a-z0-9]+/gi, "-").toLowerCase()}`;
    // Dans les applis : feuille de partage du téléphone (story, Photos, messagerie…).
    const w = window as Window & {
      GamingBaseApp?: { shareImage?: (b64: string, name: string) => boolean };
      webkit?: { messageHandlers?: { gamingbase?: { postMessage: (m: unknown) => void } } };
    };
    if (w.GamingBaseApp?.shareImage || w.webkit?.messageHandlers?.gamingbase) {
      const b64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "");
        reader.readAsDataURL(blob);
      });
      try {
        if (w.GamingBaseApp?.shareImage) {
          if (w.GamingBaseApp.shareImage(b64, name)) return;
        } else {
          w.webkit?.messageHandlers?.gamingbase?.postMessage({ shareImage: b64 });
          return;
        }
      } catch {
        /* ancienne version de l'app : partage du navigateur */
      }
    }
    const file = new File([blob], `${name}.png`, { type: "image/png" });
    try {
      if (navigator.canShare?.({ files: [file] })) return await navigator.share({ files: [file], title: "Mon mois sur GamingBase" });
    } catch (e) {
      if ((e as Error).name === "AbortError") return;
    }
    setImage({ url: URL.createObjectURL(blob), blob }); // sinon : l'image s'affiche, appui long pour l'enregistrer
  };

  const rows: [string, string][] = [
    ["🎮 Jeu", hours(recap.gameMinutes)],
    ["🌸 Anime", hours(recap.animeMinutes)],
    ["📅 Jours actifs", String(recap.days)],
    ["🔥 Série de jours", String(recap.streak)],
    ...(recap.topGame ? ([["🏆 Jeu du mois", recap.topGame]] as [string, string][]) : []),
    ...(recap.topAnime ? ([["⭐ Anime du mois", `${recap.topAnime.title} · ${recap.topAnime.seen} ép.`]] as [string, string][]) : []),
  ];

  return (
    <section aria-labelledby="recap-title" className="recap-card mt-6 overflow-hidden rounded-2xl p-5 text-white">
      <p id="recap-title" className="text-xs font-bold uppercase tracking-wider text-white/80">Mon mois · {recap.label}</p>
      <p className="mt-2 text-5xl font-extrabold tracking-tight">{hours(recap.minutes)}</p>
      <p className="text-sm text-white/80">de jeu et d&apos;anime</p>
      <dl className="mt-4 grid gap-0 text-sm">
        {rows.map(([k, v]) => (
          <div key={k} className="flex justify-between gap-3 border-t border-white/20 py-2">
            <dt className="shrink-0 whitespace-nowrap text-white/80">{k}</dt>
            <dd className="min-w-0 truncate text-right font-semibold">{v}</dd>
          </div>
        ))}
      </dl>
      <button type="button" onClick={share} disabled={busy} className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-full bg-white py-2.5 text-sm font-bold text-[#1b1530]">
        <Share2 className="size-4" aria-hidden /> {busy ? "Préparation…" : "Partager en story"}
      </button>
      {image &&
        createPortal(
          <div role="dialog" aria-modal="true" aria-label="Image du récap" className="fixed inset-0 z-[70] flex flex-col items-center justify-center gap-3 bg-black/85 p-6" onClick={() => setImage(null)}>
            {/* eslint-disable-next-line @next/next/no-img-element -- image générée sur l'appareil */}
            <img src={image.url} alt={`Récap de ${recap.label}`} className="max-h-[75vh] w-auto rounded-2xl shadow-2xl" />
            <p className="text-center text-sm text-white/85">Appuie longuement sur l&apos;image pour l&apos;enregistrer, puis partage-la en story.</p>
            <button type="button" className="inline-flex items-center gap-1 rounded-full bg-white/15 px-4 py-2 text-sm font-semibold text-white">
              <X className="size-4" aria-hidden /> Fermer
            </button>
          </div>,
          document.body,
        )}
    </section>
  );
}
