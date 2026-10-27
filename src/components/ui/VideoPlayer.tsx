"use client";

import { Play } from "lucide-react";
import { useState } from "react";
import type { Video } from "@/types";

interface Props {
  video: Video;
  title: string;
  className?: string;
  /** Lance la lecture immédiatement (ex. dans une fenêtre ouverte par l'utilisateur) */
  autoPlay?: boolean;
}

/**
 * Lecteur « léger » : vignette + bouton ▶, la vidéo n'est chargée qu'au clic.
 * YouTube passe par youtube-nocookie.com (aucun cookie avant la lecture).
 */
export function VideoPlayer({ video, title, className = "", autoPlay = false }: Props) {
  const [playing, setPlaying] = useState(autoPlay);
  const poster = video.poster ?? (video.youtube ? `https://i.ytimg.com/vi/${video.youtube}/hqdefault.jpg` : undefined);

  return (
    <div className={`relative aspect-video w-full overflow-hidden rounded-2xl bg-black ${className}`}>
      {playing ? (
        video.youtube ? (
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${video.youtube}?autoplay=1&rel=0&playsinline=1`}
            title={title}
            allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
            className="absolute inset-0 h-full w-full"
          />
        ) : (
          <video src={video.mp4} poster={poster} controls autoPlay playsInline className="absolute inset-0 h-full w-full" />
        )
      ) : (
        <button
          type="button"
          onClick={() => setPlaying(true)}
          aria-label={`Lire la vidéo : ${title}`}
          className="group absolute inset-0 flex items-center justify-center"
        >
          {poster && (
            // eslint-disable-next-line @next/next/no-img-element -- site statique
            <img src={poster} alt="" loading="lazy" referrerPolicy="no-referrer" className="absolute inset-0 h-full w-full object-cover opacity-90" />
          )}
          <span className="relative flex size-16 items-center justify-center rounded-full bg-accent text-white shadow-lg ring-4 ring-white/30 transition-transform group-hover:scale-110">
            <Play className="ml-1 size-7" fill="currentColor" aria-hidden />
          </span>
        </button>
      )}
    </div>
  );
}
