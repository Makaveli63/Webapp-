"use client";

import { useEffect } from "react";
import { recordTopic, setPageGlow } from "@/lib/background";
import { THEMES, type ThemeId } from "@/lib/themes";

/** Sur une page d'article : colore le fond selon le jeu et mémorise le sujet consulté. */
export function PageTheme({ themeId }: { themeId: string }) {
  useEffect(() => {
    const theme = THEMES[themeId as ThemeId];
    if (!theme) return;
    setPageGlow(theme.glow);
    recordTopic(themeId);
    return () => setPageGlow(null);
  }, [themeId]);
  return null;
}
