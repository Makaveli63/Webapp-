"use client";

import { Bell, BellRing } from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { aliasesOf, toggleFollow, useFollows, type Follow } from "@/lib/follows";
import { inApp, notificationsOn, sendToApp } from "@/lib/notif-prefs";

/**
 * 🔔 « Suivre » un jeu ou un anime : une notification pour chaque actu qui en parle
 * (et chaque nouvel épisode pour un anime). Allume les notifications de l'app si besoin.
 */
export function FollowButton({
  item,
  titles = [],
  compact = false,
  className = "",
}: {
  item: Omit<Follow, "aliases">;
  titles?: (string | null | undefined)[];
  /** Bouton rond sur une vignette (comme l'épingle) ; le message s'affiche en bas de l'écran */
  compact?: boolean;
  className?: string;
}) {
  const follows = useFollows();
  const [hint, setHint] = useState("");
  const on = !!follows?.some((f) => f.id === item.id);
  // Le message disparaît tout seul.
  useEffect(() => {
    if (!hint) return;
    const t = window.setTimeout(() => setHint(""), 4000);
    return () => window.clearTimeout(t);
  }, [hint]);

  const click = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const now = toggleFollow({ ...item, aliases: aliasesOf(item.title, ...titles) });
    if (!now) return setHint("");
    if (!inApp()) return setHint("Les notifications arrivent dans l'application GamingBase.");
    if (!notificationsOn()) sendToApp(true); // demande l'autorisation au premier suivi
    setHint(item.kind === "anime" ? "Tu seras prévenu de chaque actu et de chaque nouvel épisode." : "Tu seras prévenu de chaque actu sur ce jeu.");
  };

  const Icon = on ? BellRing : Bell;
  if (compact)
    return (
      <>
        <button
          type="button"
          aria-pressed={on}
          onClick={click}
          aria-label={on ? `Ne plus suivre ${item.title}` : `Suivre ${item.title} (notifications)`}
          title={on ? "Suivi : notifications activées" : "Suivre (notifications)"}
          className={`relative z-10 inline-flex size-9 items-center justify-center rounded-full backdrop-blur transition-colors ${
            on ? "bg-accent text-white" : "bg-black/60 text-white hover:bg-black/75"
          } ${className}`}
        >
          <Icon className="size-4" aria-hidden />
        </button>
        {hint &&
          createPortal(
          <span role="status" className="follow-toast glass-strong fixed inset-x-4 z-50 mx-auto max-w-sm rounded-2xl px-4 py-3 text-center text-sm font-semibold text-heading shadow-xl">
            🔔 {item.title} : {hint.charAt(0).toLowerCase() + hint.slice(1)}
          </span>,
            document.body, // hors de la vignette (son effet de verre enfermerait le message)
          )}
      </>
    );
  return (
    <span className="inline-flex flex-col items-start">
      <button
        type="button"
        aria-pressed={on}
        onClick={click}
        className={`relative z-10 inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
          on ? "bg-accent text-white" : "glass-pill text-heading ring-1 ring-inset ring-border hover:text-fg"
        } ${className}`}
      >
        <Icon className="size-3.5" aria-hidden /> {on ? "Suivi" : "Suivre"}
      </button>
      {hint && <span role="status" className="mt-1 max-w-[16rem] text-[11px] text-muted">{hint}</span>}
    </span>
  );
}
