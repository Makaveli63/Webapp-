"use client";

import type { ReactNode } from "react";
import { isMuted, useMuted } from "@/lib/muted";

/** Cache son contenu s'il concerne une licence masquée (« Pas intéressé »). */
export function MutedGate({ title, children }: { title: string; children: ReactNode }) {
  const muted = useMuted();
  if (isMuted(title, muted)) return null;
  return <>{children}</>;
}
