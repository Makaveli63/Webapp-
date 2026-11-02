"use client";

import { Bug, Check, Copy, X } from "lucide-react";
import { useEffect, useState } from "react";

const KEY = "gb-app-error";
type AndroidBridge = { GamingBaseApp?: { takeLastError?: () => string } };

/**
 * Appli Android : si l'appli s'est fermée (ou a rattrapé une erreur), le détail technique s'affiche ici
 * une fois, à copier pour le signaler. Gardé sur l'appareil jusqu'à ce qu'on le ferme.
 */
export function AppErrorReport() {
  const [text, setText] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let fresh = "";
    try {
      fresh = (window as unknown as AndroidBridge).GamingBaseApp?.takeLastError?.() ?? "";
    } catch {
      /* ancienne version de l'appli */
    }
    try {
      if (fresh) localStorage.setItem(KEY, fresh.slice(0, 6000));
      setText(fresh || localStorage.getItem(KEY) || "");
    } catch {
      setText(fresh);
    }
  }, []);

  if (!text) return null;
  const [title, ...rest] = text.split("\n");
  const dismiss = () => {
    try {
      localStorage.removeItem(KEY);
    } catch {
      /* stockage indisponible */
    }
    setText("");
  };
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  return (
    <section className="glass rounded-xl p-4 ring-1 ring-inset ring-amber-500/40">
      <div className="flex items-start gap-3">
        <Bug className="mt-0.5 size-5 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden />
        <div className="min-w-0 flex-1">
          <h2 className="font-semibold text-heading">Rapport d&apos;erreur de l&apos;appli</h2>
          <p className="text-sm text-muted">{title}. Copie le détail et envoie-le pour qu&apos;on corrige.</p>
        </div>
        <button type="button" onClick={dismiss} aria-label="Fermer le rapport" className="shrink-0 rounded-full p-1.5 text-muted hover:text-heading">
          <X className="size-4" aria-hidden />
        </button>
      </div>
      <pre className="mt-3 max-h-40 overflow-auto whitespace-pre-wrap break-all rounded-lg bg-bg p-2 font-mono text-[11px] text-fg">{rest.join("\n").trim()}</pre>
      <button type="button" onClick={copy} className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-accent px-4 py-2 text-sm font-semibold text-white">
        {copied ? <Check className="size-4" aria-hidden /> : <Copy className="size-4" aria-hidden />} {copied ? "Copié" : "Copier le détail"}
      </button>
    </section>
  );
}
