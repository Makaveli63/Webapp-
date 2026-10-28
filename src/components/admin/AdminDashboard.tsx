"use client";

import { ArrowDownRight, ArrowUpRight, Eye, EyeOff, Flag, Heart, LogOut, MessageCircle, ScanFace, ShieldCheck, Trash2, Users } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { loadSearchIndex } from "@/lib/search-index";
import { setPageGlow } from "@/lib/background";
import { ADMIN_ERRORS, ADMIN_SESSION_KEY, rpc, setAdminDevice, socialEnabled, timeAgo } from "@/lib/social";
import { AdminArticles } from "./AdminArticles";
import { AdminStatus } from "./AdminStatus";
import { BarList, DailyChart, type DailyPoint } from "./charts";

interface Stats {
  error?: string;
  days: number;
  totals: { views: number; visitors: number; likes: number; likes_total: number; comments: number; comments_total: number; reported: number };
  previous: { views: number; visitors: number };
  daily: DailyPoint[];
  pages: { path: string; views: number }[];
  sources: { source: string; views: number }[];
  devices: { device: string; views: number }[];
  liked: { slug: string; likes: number }[];
  comments: { id: string; slug: string; author: string; body: string; created_at: string; hidden: boolean; reports: number }[];
}

const ERRORS = ADMIN_ERRORS;
const PERIODS = [7, 30, 90] as const;
const SESSION_KEY = ADMIN_SESSION_KEY;
// Couleurs du fond en mode administrateur (vert émeraude) : on voit tout de suite qu'on est sur ses stats.
const ADMIN_GLOW = ["#10b981", "#0d9488", "#34d399"] as const;

function StatTile({ icon, label, value, delta, note }: { icon: ReactNode; label: string; value: number; delta?: number | null; note?: string }) {
  return (
    <div className="rounded-xl glass p-4">
      <p className="flex items-center gap-2 text-sm text-muted">
        {icon}
        {label}
      </p>
      <p className="mt-1 text-3xl font-bold text-heading">{new Intl.NumberFormat("fr-FR").format(value)}</p>
      {delta !== undefined && delta !== null && (
        <p className={`mt-1 inline-flex items-center gap-1 text-xs font-medium ${delta >= 0 ? "text-emerald-700 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
          {delta >= 0 ? <ArrowUpRight className="size-3.5" aria-hidden /> : <ArrowDownRight className="size-3.5" aria-hidden />}
          {delta >= 0 ? "+" : ""}
          {delta} % vs période précédente
        </p>
      )}
      {note && <p className="mt-1 text-xs text-muted">{note}</p>}
    </div>
  );
}

// Application iPhone : coffre du mot de passe (trousseau de l'iPhone, ouvert par Face ID). Absent ailleurs.
type VaultWindow = Window & {
  webkit?: { messageHandlers?: { gamingbase?: { postMessage: (m: unknown) => void } } };
  gbAdminSaved?: (saved: boolean) => void;
  gbAdminPassword?: (password: string) => void;
};
const vaultBridge = () => (typeof window !== "undefined" && navigator.userAgent.includes("GamingBaseApp/iOS") ? (window as VaultWindow).webkit?.messageHandlers?.gamingbase : undefined);
const vault = (action: "query" | "save" | "unlock" | "forget", extra: Record<string, string> = {}) => {
  try {
    vaultBridge()?.postMessage({ admin: { action, ...extra } });
  } catch {
    /* ancienne version de l'app */
  }
};

const pct = (now: number, before: number) => (before > 0 ? Math.round(((now - before) / before) * 100) : null);

/** Tableau de bord privé : fréquentation, j'aime et modération des commentaires (mot de passe requis). */
export function AdminDashboard() {
  const [password, setPassword] = useState("");
  const [input, setInput] = useState("");
  const [days, setDays] = useState<(typeof PERIODS)[number]>(30);
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [titles, setTitles] = useState<Record<string, string>>({});
  const [showTable, setShowTable] = useState(false);
  // iPhone : mot de passe déjà dans le trousseau (null = pas dans l'app), case « enregistrer » et origine de l'essai.
  const [vaultSaved, setVaultSaved] = useState<boolean | null>(null);
  const [remember, setRemember] = useState(true);
  const saveNext = useRef<string | null>(null);
  const fromVault = useRef(false);

  const load = useCallback(async (pwd: string, period: number) => {
    setLoading(true);
    setError("");
    try {
      const data = await rpc<Stats>("admin_stats", { p_password: pwd, p_days: period });
      if (data.error) {
        setError(ERRORS[data.error] ?? data.error);
        setStats(null);
        setPassword("");
        sessionStorage.removeItem(SESSION_KEY);
        // Mot de passe du trousseau refusé (il a changé) : on l'oublie.
        if (fromVault.current && data.error === "ACCES_REFUSE") {
          vault("forget");
          setVaultSaved(false);
          setError("Le mot de passe enregistré dans l'appli n'est plus le bon : saisis le nouveau.");
        }
      } else {
        if (saveNext.current === pwd) {
          vault("save", { password: pwd });
          setVaultSaved(true);
        }
        setStats(data);
        setPassword(pwd);
        sessionStorage.setItem(SESSION_KEY, pwd);
        setAdminDevice(true); // affiche l'onglet « Admin » sur cet appareil
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Application iPhone : l'app dit si un mot de passe est enregistré, et le rend après Face ID.
  useEffect(() => {
    if (!vaultBridge()) return;
    const w = window as VaultWindow;
    w.gbAdminSaved = (saved) => setVaultSaved(saved);
    w.gbAdminPassword = (pwd) => {
      fromVault.current = true;
      saveNext.current = null;
      load(pwd, 30);
    };
    vault("query");
    return () => {
      delete w.gbAdminSaved;
      delete w.gbAdminPassword;
    };
  }, [load]);

  // Session déjà ouverte dans cet onglet ; titres des articles pour les classements.
  useEffect(() => {
    const saved = sessionStorage.getItem(SESSION_KEY);
    if (saved) load(saved, 30);
    loadSearchIndex()
      .then((i) => setTitles(Object.fromEntries(i.articles.map((a) => [a.slug, a.title]))))
      .catch(() => {});
  }, [load]);

  // Mode administrateur : couleurs émeraude sur tout le site tant que les stats sont affichées.
  const signedIn = !!password && !!stats;
  useEffect(() => {
    if (!signedIn) return;
    document.documentElement.dataset.admin = "1";
    setPageGlow(ADMIN_GLOW);
    return () => {
      delete document.documentElement.dataset.admin;
      setPageGlow(null);
    };
  }, [signedIn]);

  if (!socialEnabled) {
    return <p className="mt-6 text-muted">Supabase n&apos;est pas configuré : le tableau de bord est indisponible.</p>;
  }

  if (!password || !stats) {
    const submit = (e: FormEvent) => {
      e.preventDefault();
      fromVault.current = false;
      saveNext.current = vaultSaved === false && remember ? input.trim() : null;
      load(input.trim(), days);
    };
    return (
      <form onSubmit={submit} className="mt-6 max-w-sm space-y-3 rounded-xl glass p-4">
        {vaultSaved && (
          <button
            type="button"
            onClick={() => vault("unlock")}
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-full bg-accent px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
          >
            <ScanFace className="size-5" aria-hidden /> Se connecter avec Face ID
          </button>
        )}
        <label className="block text-sm font-medium text-heading" htmlFor="admin-pwd">
          Mot de passe
        </label>
        <input
          id="admin-pwd"
          type="password"
          autoComplete="current-password"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-base focus:border-accent focus:outline-none"
        />
        {vaultSaved === false && (
          <label className="flex items-center gap-2 text-sm text-muted">
            <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} className="size-4 accent-[var(--accent)]" />
            Enregistrer dans l&apos;appli (protégé par Face ID)
          </label>
        )}
        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
        <button type="submit" disabled={loading || !input} className="rounded-full bg-accent px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
          {loading ? "Vérification…" : "Ouvrir le tableau de bord"}
        </button>
      </form>
    );
  }

  const moderate = async (id: string, action: "hide" | "show" | "delete") => {
    if (action === "delete" && !confirm("Supprimer définitivement ce commentaire ?")) return;
    const res = await rpc<string>("admin_moderate", { p_password: password, p_id: id, p_action: action }).catch(() => "erreur");
    if (res !== "ok") setError(ERRORS[res] ?? "Action impossible.");
    load(password, days);
  };

  const t = stats.totals;
  return (
    <div className={`mt-6 space-y-8 transition-opacity ${loading ? "opacity-60" : ""}`}>
      <p className="inline-flex items-center gap-2 rounded-full bg-accent px-3 py-1 text-xs font-bold uppercase tracking-wide text-white">
        <ShieldCheck className="size-4" aria-hidden /> Mode administrateur · tes statistiques
      </p>
      {/* Filtres : une seule rangée, au-dessus de tout */}
      <div className="flex flex-wrap items-center gap-2">
        {PERIODS.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => {
              setDays(p);
              load(password, p);
            }}
            aria-pressed={days === p}
            className={`rounded-full px-3.5 py-1.5 text-sm ring-1 ring-inset ${days === p ? "bg-accent text-white ring-accent" : "glass-pill text-muted ring-border hover:text-fg"}`}
          >
            {p} derniers jours
          </button>
        ))}
        <button
          type="button"
          onClick={() => {
            sessionStorage.removeItem(SESSION_KEY);
            setPassword("");
            setStats(null);
          }}
          className="ml-auto inline-flex items-center gap-1.5 text-sm text-muted hover:text-fg"
        >
          <LogOut className="size-4" aria-hidden /> Se déconnecter
        </button>
        <button
          type="button"
          onClick={() => {
            if (!confirm("Masquer l'onglet Admin sur cet appareil et se déconnecter ?")) return;
            setAdminDevice(false);
            vault("forget"); // iPhone : le mot de passe enregistré est aussi effacé
            setVaultSaved((v) => (v === null ? null : false));
            sessionStorage.removeItem(SESSION_KEY);
            setPassword("");
            setStats(null);
          }}
          className="text-sm text-muted underline underline-offset-2 hover:text-fg"
        >
          Oublier cet appareil
        </button>
      </div>
      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile icon={<Eye className="size-4" aria-hidden />} label="Pages vues" value={t.views} delta={pct(t.views, stats.previous.views)} />
        <StatTile icon={<Users className="size-4" aria-hidden />} label="Visiteurs uniques" value={t.visitors} delta={pct(t.visitors, stats.previous.visitors)} />
        <StatTile icon={<Heart className="size-4" aria-hidden />} label="J'aime" value={t.likes} note={`${t.likes_total} au total`} />
        <StatTile
          icon={<MessageCircle className="size-4" aria-hidden />}
          label="Commentaires"
          value={t.comments}
          note={`${t.comments_total} au total${t.reported ? ` · ${t.reported} signalé(s) à vérifier` : ""}`}
        />
      </div>

      <AdminStatus />

      <section className="rounded-xl glass p-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-semibold text-heading">Fréquentation par jour</h2>
          <button type="button" onClick={() => setShowTable((v) => !v)} className="text-xs text-muted underline underline-offset-2 hover:text-fg">
            {showTable ? "Voir le graphique" : "Voir le tableau"}
          </button>
        </div>
        <div className="mt-3">
          {showTable ? (
            <div className="max-h-80 overflow-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-muted">
                  <tr>
                    <th className="py-1 font-medium">Jour</th>
                    <th className="py-1 text-right font-medium">Pages vues</th>
                    <th className="py-1 text-right font-medium">Visiteurs uniques</th>
                  </tr>
                </thead>
                <tbody className="tabular-nums">
                  {[...stats.daily].reverse().map((d) => (
                    <tr key={d.day} className="border-t border-border">
                      <td className="py-1">{new Date(`${d.day.slice(0, 10)}T12:00:00Z`).toLocaleDateString("fr-FR")}</td>
                      <td className="py-1 text-right">{d.views}</td>
                      <td className="py-1 text-right">{d.visitors}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <DailyChart data={stats.daily} />
          )}
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-3">
        <section className="rounded-xl glass p-4">
          <h2 className="mb-3 font-semibold text-heading">Pages les plus vues</h2>
          <BarList rows={stats.pages.map((p) => ({ label: titles[p.path.replace(/^\/actualites\/|\/$/g, "")] ?? p.path, value: p.views }))} />
        </section>
        <section className="rounded-xl glass p-4">
          <h2 className="mb-3 font-semibold text-heading">Provenance des visiteurs</h2>
          <BarList rows={stats.sources.map((s) => ({ label: s.source, value: s.views }))} />
        </section>
        <section className="rounded-xl glass p-4">
          <h2 className="mb-3 font-semibold text-heading">Appareils</h2>
          <BarList rows={stats.devices.map((d) => ({ label: d.device[0].toUpperCase() + d.device.slice(1), value: d.views }))} percent />
        </section>
      </div>

      <section className="rounded-xl glass p-4">
        <h2 className="mb-3 flex items-center gap-2 font-semibold text-heading">
          <Heart className="size-4 text-pink-600" aria-hidden /> Articles les plus aimés
        </h2>
        {stats.liked.length ? (
          <ol className="space-y-1.5 text-sm">
            {stats.liked.map((l, i) => (
              <li key={l.slug} className="flex items-baseline gap-3">
                <span className="w-5 shrink-0 text-right tabular-nums text-muted">{i + 1}.</span>
                <Link href={`/actualites/${l.slug}`} className="min-w-0 flex-1 truncate text-fg hover:underline">
                  {titles[l.slug] ?? l.slug}
                </Link>
                <span className="shrink-0 font-semibold tabular-nums text-heading">{l.likes} ❤</span>
              </li>
            ))}
          </ol>
        ) : (
          <p className="text-sm text-muted">Aucun j&apos;aime pour l&apos;instant.</p>
        )}
      </section>

      <AdminArticles password={password} />

      <section className="rounded-xl glass p-4">
        <h2 className="mb-1 flex items-center gap-2 font-semibold text-heading">
          <MessageCircle className="size-4 text-accent" aria-hidden /> Commentaires (modération)
        </h2>
        <p className="mb-3 text-xs text-muted">Les commentaires signalés apparaissent en premier.</p>
        {stats.comments.length ? (
          <ul className="divide-y divide-border">
            {stats.comments.map((c) => (
              <li key={c.id} className={`py-3 ${c.hidden ? "opacity-60" : ""}`}>
                <p className="flex flex-wrap items-center gap-x-2 text-sm">
                  <span className="font-semibold text-heading">{c.author}</span>
                  <span className="text-muted">· {timeAgo(c.created_at)} ·</span>
                  <Link href={`/actualites/${c.slug}`} className="truncate text-muted underline underline-offset-2 hover:text-fg">
                    {titles[c.slug] ?? c.slug}
                  </Link>
                  {c.reports > 0 && (
                    <span className="inline-flex items-center gap-1 rounded bg-red-500/15 px-1.5 py-0.5 text-xs font-medium text-red-700 dark:text-red-300">
                      <Flag className="size-3" aria-hidden /> {c.reports} signalement(s)
                    </span>
                  )}
                  {c.hidden && <span className="rounded bg-surface-2 px-1.5 py-0.5 text-xs text-muted">Masqué</span>}
                </p>
                <p className="mt-1 whitespace-pre-line break-words text-sm text-fg">{c.body}</p>
                <div className="mt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={() => moderate(c.id, c.hidden ? "show" : "hide")}
                    className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs ring-1 ring-border hover:bg-surface-2"
                  >
                    {c.hidden ? <Eye className="size-3.5" aria-hidden /> : <EyeOff className="size-3.5" aria-hidden />}
                    {c.hidden ? "Réafficher" : "Masquer"}
                  </button>
                  <button
                    type="button"
                    onClick={() => moderate(c.id, "delete")}
                    className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs text-red-600 ring-1 ring-red-500/40 hover:bg-red-500/10 dark:text-red-400"
                  >
                    <Trash2 className="size-3.5" aria-hidden /> Supprimer
                  </button>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted">Aucun commentaire.</p>
        )}
      </section>
    </div>
  );
}
