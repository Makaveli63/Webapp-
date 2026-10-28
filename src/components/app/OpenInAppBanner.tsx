"use client";

import { X } from "lucide-react";
import { useEffect, useState } from "react";
import { LogoMark } from "@/components/ui/Logo";

const HIDE_KEY = "gb-sans-appli"; // « Je n'ai pas l'appli » : le bandeau ne revient plus
const PACKAGE = "io.github.makaveli63.gamingbase";

/**
 * Lien partagé ouvert dans Safari ou Chrome (arrivée depuis une autre appli ou un autre site) :
 * bandeau « Ouvrir dans l'appli », qui ouvre la même page dans l'application GamingBase.
 * iPhone et iPad : lien gamingbase://open ; Android : lien « intent » qui revient à la page si l'appli manque.
 */
export function OpenInAppBanner() {
  const [href, setHref] = useState("");

  useEffect(() => {
    const ua = navigator.userAgent;
    if (ua.includes("GamingBaseApp") || matchMedia("(display-mode: standalone)").matches) return;
    const ios = /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
    const android = /Android/.test(ua);
    if (!ios && !android) return;
    try {
      if (localStorage.getItem(HIDE_KEY) || sessionStorage.getItem(HIDE_KEY)) return;
    } catch {
      /* stockage bloqué : on propose quand même */
    }
    // Seulement en arrivant de l'extérieur (lien reçu), pas en naviguant dans le site.
    const fromOutside = !document.referrer || new URL(document.referrer).host !== location.host;
    if (!fromOutside) return;
    const path = location.pathname + location.search;
    setHref(
      ios
        ? `gamingbase://open?path=${encodeURIComponent(path)}`
        : `intent://${location.host}${path}#Intent;scheme=https;package=${PACKAGE};S.browser_fallback_url=${encodeURIComponent(location.href)};end`,
    );
  }, []);

  const close = (forever: boolean) => {
    try {
      (forever ? localStorage : sessionStorage).setItem(HIDE_KEY, "1");
    } catch {
      /* rien */
    }
    setHref("");
  };

  if (!href) return null;
  return (
    <div role="region" aria-label="Ouvrir dans l'application" className="open-app-banner">
      <LogoMark id="gb-open-app" className="size-9 shrink-0" />
      <div className="min-w-0 flex-1 text-sm">
        <p className="font-semibold text-heading">GamingBase</p>
        <button type="button" onClick={() => close(true)} className="whitespace-nowrap text-left text-xs text-muted underline underline-offset-2">
          Je ne l&apos;ai pas
        </button>
      </div>
      <a href={href} onClick={() => close(false)} className="shrink-0 rounded-full bg-accent px-4 py-1.5 text-sm font-semibold text-white">
        Ouvrir dans l&apos;appli
      </a>
      <button type="button" onClick={() => close(false)} aria-label="Fermer" className="shrink-0 rounded-full p-1.5 text-muted hover:text-fg">
        <X className="size-4" aria-hidden />
      </button>
    </div>
  );
}
