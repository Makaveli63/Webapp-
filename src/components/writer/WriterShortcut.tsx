"use client";

import { ChevronRight, Feather } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { onPlayer, readPlayer } from "@/lib/player";

/** Carte « Rédaction » de Mon espace, visible seulement pour les joueurs autorisés par l'admin. */
export function WriterShortcut() {
  const [on, setOn] = useState(false);
  useEffect(() => {
    const read = () => setOn(!!readPlayer().canWrite);
    read();
    return onPlayer(read);
  }, []);
  if (!on) return null;
  return (
    <Link href="/redaction" className="glass flex items-center gap-4 rounded-2xl p-4 hover:border-accent/60">
      <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-500 to-pink-600 text-white">
        <Feather className="size-6" aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-lg font-bold text-heading">Rédaction</span>
        <span className="block text-sm text-muted">Écrire et publier des actus sur GamingBase</span>
      </span>
      <ChevronRight className="size-5 shrink-0 text-muted" aria-hidden />
    </Link>
  );
}
