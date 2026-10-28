"use client";

import { EyeOff } from "lucide-react";
import { useState } from "react";
import { spoilerReason, useWatched } from "@/lib/spoilers";

/** 🙈 Voile flou sur une actu qui pourrait dévoiler la suite d'un anime que tu regardes ; un toucher l'enlève. */
export function SpoilerCover({ text }: { text: string }) {
  const list = useWatched();
  const [shown, setShown] = useState(false);
  const reason = list && !shown ? spoilerReason(text, list) : null;
  if (!reason) return null;
  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setShown(true);
      }}
      className="spoiler-cover absolute inset-0 z-20 flex flex-col items-center justify-center gap-1.5 p-4 text-center"
    >
      <EyeOff className="size-6 text-heading" aria-hidden />
      <span className="font-bold text-heading">Spoiler possible</span>
      <span className="text-xs text-muted">{reason}</span>
      <span className="mt-1 rounded-full bg-accent px-3 py-1 text-xs font-semibold text-white">Toucher pour voir</span>
    </button>
  );
}
