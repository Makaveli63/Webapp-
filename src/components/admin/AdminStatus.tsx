"use client";

import { AlertTriangle, CheckCircle2, Download, Rss, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { timeAgo } from "@/lib/social";

const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
const RELEASES = "https://github.com/Makaveli63/Webapp-/releases/download";
// Source AltStore publiée avec chaque IPA (.github/workflows/ios.yml) : AltStore y lit la dernière version.
const ALTSTORE_SOURCE = `${RELEASES}/ios/altstore.json`;
// Mise à jour automatique toutes les heures : au-delà de 2 h, quelque chose bloque.
const LATE_MS = 2 * 3_600_000;

interface Status {
  builtAt: string;
  update: { at?: string; feeds?: { name: string; count?: number; error?: string }[]; today?: number; ai?: number; aiEnabled?: boolean };
  content: {
    articles: number;
    byCategory: Record<string, number>;
    withAi: number;
    games: number;
    releases: number;
    free: number;
    deals: number;
    anime: number;
    animeUpcoming: number;
  };
}

const nf = new Intl.NumberFormat("fr-FR");

/** Raison d'un échec de source, en clair. */
function feedError(raw: string): string {
  const code = Number(/HTTP (\d{3})/.exec(raw)?.[1]);
  if (code === 403 || code === 401) return "Le site bloque les robots (accès refusé)";
  if (code === 429) return "Trop de requêtes : le site demande d'attendre";
  if (code === 404 || code === 410) return "Flux introuvable : l'adresse a peut-être changé";
  if (code >= 500) return `Site en panne (erreur ${code})`;
  if (/timeout|aborted|délai/i.test(raw)) return "Le site n'a pas répondu à temps";
  if (/ENOTFOUND|EAI_AGAIN|getaddrinfo/i.test(raw)) return "Adresse du site introuvable";
  if (/Non-whitespace|Unexpected|Invalid|parse|XML/i.test(raw)) return "Flux illisible (le site renvoie autre chose qu'un flux)";
  if (/fetch failed|ECONNRESET|ECONNREFUSED|socket/i.test(raw)) return "Connexion coupée par le site";
  return raw;
}
const fullDate = (iso: string) =>
  new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris" }).format(new Date(iso));

/** État du site : dernière mise à jour, santé des sources d'actus, contenu publié et liens des applications. */
export function AdminStatus() {
  const [status, setStatus] = useState<Status | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    fetch(`${BASE_PATH}/statut.json`, { cache: "no-store" })
      .then((r) => (r.ok ? (r.json() as Promise<Status>) : Promise.reject(new Error(String(r.status)))))
      .then(setStatus)
      .catch(() => setFailed(true));
  }, []);

  if (failed) return <p className="rounded-xl glass p-4 text-sm text-muted">État du site indisponible pour le moment.</p>;
  if (!status) return <p className="rounded-xl glass p-4 text-sm text-muted">Chargement de l&apos;état du site…</p>;

  const { update, content } = status;
  const late = Date.now() - Date.parse(status.builtAt) > LATE_MS;
  const feeds = [...(update.feeds ?? [])].sort((a, b) => Number(!!b.error) - Number(!!a.error) || a.name.localeCompare(b.name));
  const broken = feeds.filter((f) => f.error || !f.count).length;
  const cat = (name: string) => content.byCategory[name] ?? 0;
  const tiles: [string, number][] = [
    ["Articles en ligne", content.articles],
    ["Tests", cat("Test")],
    ["Actus anime", cat("Anime")],
    ["Fiches de jeux", content.games],
    ["Grosses sorties", content.releases],
    ["Jeux gratuits", content.free],
    ["Promos", content.deals],
    ["Animes en cours", content.anime],
  ];

  return (
    <section className="rounded-xl glass p-4">
      <h2 className="flex items-center gap-2 font-semibold text-heading">
        {late || broken ? <AlertTriangle className="size-4 text-amber-500" aria-hidden /> : <CheckCircle2 className="size-4 text-emerald-500" aria-hidden />}
        État du site
      </h2>
      <p className={`mt-1 text-sm ${late ? "font-semibold text-amber-700 dark:text-amber-400" : "text-muted"}`}>
        Mis à jour {timeAgo(status.builtAt)} ({fullDate(status.builtAt)})
        {late && " — en retard : la mise à jour automatique (toutes les heures) ne passe plus, voir l'onglet Actions de GitHub."}
      </p>

      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {tiles.map(([label, n]) => (
          <div key={label} className="rounded-lg bg-surface-2 px-3 py-2">
            <p className="text-xl font-bold tabular-nums text-heading">{nf.format(n)}</p>
            <p className="text-xs text-muted">{label}</p>
          </div>
        ))}
      </div>

      <p className="mt-4 flex items-center gap-1.5 text-sm text-muted">
        <Sparkles className="size-4 text-accent" aria-hidden />
        {update.aiEnabled === false
          ? "Résumés IA désactivés (clé AI_API_KEY absente des secrets GitHub)."
          : `Résumés IA : ${nf.format(content.withAi)} articles sur ${nf.format(content.articles)}${update.today ? `, dont ${update.ai ?? 0} sur les ${update.today} de la dernière mise à jour` : ""}.`}
      </p>

      {feeds.length > 0 && (
        <>
          <h3 className="mt-4 flex items-center gap-1.5 text-sm font-semibold text-heading">
            <Rss className="size-4 text-accent" aria-hidden /> Sources d&apos;actus
            <span className="font-normal text-muted">
              · {feeds.length - broken}/{feeds.length} OK{update.at ? ` · lues ${timeAgo(update.at)}` : ""}
            </span>
          </h3>
          <ul className="mt-2 grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
            {feeds.map((f) => (
              <li key={f.name} className="flex items-baseline justify-between gap-3">
                <span className="min-w-0 text-fg">
                  {f.name}
                  {f.error && <span className="block text-xs text-muted">{feedError(f.error)}</span>}
                </span>
                {f.error ? (
                  <span className="shrink-0 text-xs font-medium text-red-600 dark:text-red-400" title={f.error}>
                    échec
                  </span>
                ) : (
                  <span className={`shrink-0 tabular-nums text-xs ${f.count ? "text-muted" : "font-medium text-amber-700 dark:text-amber-400"}`}>
                    {f.count ? `${f.count} articles` : "aucun article"}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </>
      )}

      <h3 className="mt-4 text-sm font-semibold text-heading">Applications (dernières versions)</h3>
      <div className="mt-2 flex flex-wrap gap-2">
        <a href={`${RELEASES}/android/GamingBase.apk`} className="inline-flex items-center gap-1.5 rounded-full glass-pill px-3 py-1.5 text-xs font-semibold text-heading ring-1 ring-inset ring-border">
          <Download className="size-3.5" aria-hidden /> Android (APK)
        </a>
        <a href={`${RELEASES}/ios/GamingBase.ipa`} className="inline-flex items-center gap-1.5 rounded-full glass-pill px-3 py-1.5 text-xs font-semibold text-heading ring-1 ring-inset ring-border">
          <Download className="size-3.5" aria-hidden /> iPhone / iPad (IPA, AltStore)
        </a>
        <a href={`altstore://source?url=${encodeURIComponent(ALTSTORE_SOURCE)}`} className="inline-flex items-center gap-1.5 rounded-full bg-accent px-3 py-1.5 text-xs font-semibold text-white">
          <Download className="size-3.5" aria-hidden /> Ajouter la source AltStore
        </a>
      </div>
      <p className="mt-2 text-xs text-muted">
        Source AltStore / SideStore (mises à jour automatiques) : <span className="select-all break-all font-mono text-fg">{ALTSTORE_SOURCE}</span>
      </p>
    </section>
  );
}
