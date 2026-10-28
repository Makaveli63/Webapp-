"use client";

import { Bell, BellRing } from "lucide-react";
import { useEffect, useState } from "react";
import { aliasesOf, toggleFollow, useFollows, type Follow } from "@/lib/follows";
import { inApp, notificationsOn, sendToApp } from "@/lib/notif-prefs";

/**
 * 🔔 « Suivre » un jeu ou un anime : une notification pour chaque actu qui en parle
 * (et chaque nouvel épisode pour un anime). Allume les notifications de l'app si besoin.
 */
export function FollowButton({ item, titles = [], className = "" }: { item: Omit<Follow, "aliases">; titles?: (string | null | undefined)[]; className?: string }) {
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
