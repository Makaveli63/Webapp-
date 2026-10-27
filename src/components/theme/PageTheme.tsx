"use client";

import { useEffect } from "react";
import { recordTopic, setPageGlow, setPageImage } from "@/lib/background";
import { THEMES, type ThemeId } from "@/lib/themes";

/** Sur une page d'article : fond aux couleurs du jeu (et son image floutée), sujet mémorisé. */
export function PageTheme({ themeId, image }: { themeId: string; image?: string }) {
  useEffect(() => {
    if (!image) return;
    setPageImage(image);
    return () => setPageImage(null);
  }, [image]);

  useEffect(() => {
    const theme = THEMES[themeId as ThemeId];
    if (!theme) return;
    setPageGlow(theme.glow);
    recordTopic(themeId);
    return () => setPageGlow(null);
  }, [themeId]);
  return null;
}
