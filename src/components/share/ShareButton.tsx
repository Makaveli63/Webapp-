"use client";

import { Check, Share2 } from "lucide-react";
import { useState } from "react";

/**
 * Partager : feuille de partage du téléphone (iPhone, Android) si disponible ; sinon petit menu
 * WhatsApp / X / copier le lien.
 */
export function ShareButton({ title, path }: { title: string; path: string }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const url = () => `${window.location.origin}${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}${path}`;

  const share = async () => {
    const nav = navigator as Navigator & { share?: (d: ShareData) => Promise<void> };
    if (nav.share) {
      try {
        await nav.share({ title, text: `${title} — sur GamingBase`, url: url() });
        return;
      } catch (e) {
        if ((e as Error).name === "AbortError") return; // partage annulé
      }
    }
    setOpen((o) => !o);
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url());
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      /* presse-papiers indisponible */
    }
  };

  const text = encodeURIComponent(`${title} — sur GamingBase`);
  return (
    <div className="relative">
      <button type="button" onClick={share} className="inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-sm text-muted ring-1 ring-inset ring-border hover:text-fg">
        <Share2 className="size-4" aria-hidden /> Partager
      </button>
      {open && (
        <div className="glass glass-strong absolute right-0 z-20 mt-2 w-52 rounded-xl p-1.5 text-sm shadow-xl">
          <a className="block rounded-lg px-3 py-2 hover:bg-surface-2" target="_blank" rel="noopener noreferrer" href={`https://wa.me/?text=${text}%20${encodeURIComponent(url())}`}>
            WhatsApp
          </a>
          <a className="block rounded-lg px-3 py-2 hover:bg-surface-2" target="_blank" rel="noopener noreferrer" href={`https://x.com/intent/post?text=${text}&url=${encodeURIComponent(url())}`}>
            X (Twitter)
          </a>
          <button type="button" onClick={copy} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left hover:bg-surface-2">
            {copied ? <Check className="size-4" aria-hidden /> : null} {copied ? "Lien copié" : "Copier le lien"}
          </button>
        </div>
      )}
    </div>
  );
}
