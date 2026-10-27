"use client";

import { useEffect, useRef, useState } from "react";
import type { Theme } from "@/lib/themes";
import { Cover } from "./Cover";

interface Props {
  src?: string;
  alt: string;
  /** Illustration de repli si l'image est absente ou ne se charge pas */
  theme: Theme;
  seed: string;
  className?: string;
  imgClassName?: string;
  /** Crédit affiché en bas à droite (ex. « Image : Gamekult ») */
  credit?: string;
}

/**
 * Image distante (média, boutique) affichée depuis son site d'origine, sans référent,
 * par-dessus l'illustration thématique qui sert de repli en cas d'erreur.
 */
export function RemoteImage({ src, alt, theme, seed, className = "", imgClassName = "", credit }: Props) {
  const [failed, setFailed] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  // Une image en erreur avant l'hydratation ne déclenche plus onError : on vérifie son état au montage.
  useEffect(() => {
    const img = imgRef.current;
    if (img?.complete && img.naturalWidth === 0) setFailed(true);
  }, []);
  const showImage = !!src && !failed;
  return (
    <div className={`relative overflow-hidden bg-surface-2 ${className}`}>
      {!showImage && <Cover theme={theme} seed={seed} className="h-full w-full" />}
      {showImage && (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element -- site statique : pas d'optimisation d'image côté serveur */}
          <img
            ref={imgRef}
            src={src}
            alt={alt}
            loading="lazy"
            decoding="async"
            referrerPolicy="no-referrer"
            onError={() => setFailed(true)}
            className={`absolute inset-0 h-full w-full object-cover ${imgClassName}`}
          />
          {credit && (
            <span className="absolute bottom-1.5 right-1.5 rounded bg-black/55 px-1.5 py-0.5 text-[10px] text-white/90">
              {credit}
            </span>
          )}
        </>
      )}
    </div>
  );
}
