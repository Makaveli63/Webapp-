"use client";

import { Gamepad2, Mic, Search, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useId, useState, type FormEvent, type KeyboardEvent } from "react";
import { animeHref, https, searchAnime, titleOf, type AniMedia } from "@/lib/anilist";
import { suggestTitles } from "@/lib/fuzzy";
import { loadSearchIndex } from "@/lib/search-index";
import type { SearchGame } from "@/types";

/** Barre de recherche avec suggestions de jeux pendant la saisie (tolérantes aux fautes). */
export function SearchBar({ className = "", autoFocus = false }: { className?: string; autoFocus?: boolean }) {
  const router = useRouter();
  const listId = useId();
  const [q, setQ] = useState("");
  const [games, setGames] = useState<Map<string, SearchGame>>(new Map());
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [canSpeak, setCanSpeak] = useState(false);
  const [listening, setListening] = useState(false);
  const [anime, setAnime] = useState<AniMedia[]>([]);

  // Animes suggérés en direct (AniList) dès 3 lettres, sans attendre le nom complet.
  useEffect(() => {
    const term = q.trim();
    if (!open || term.length < 3) {
      setAnime([]);
      return;
    }
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      searchAnime(term, controller.signal)
        .then((list) => setAnime(list.slice(0, 4)))
        .catch(() => {});
    }, 350);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [q, open]);

  // Recherche vocale (API Web Speech) : bouton affiché seulement si le navigateur la propose.
  useEffect(() => {
    setCanSpeak(!!speechApi());
  }, []);

  const listen = () => {
    const Api = speechApi();
    if (!Api || listening) return;
    const rec = new Api();
    rec.lang = "fr-FR";
    rec.interimResults = true;
    rec.maxAlternatives = 1;
    rec.onresult = (e: SpeechEvent) => {
      const result = e.results[e.results.length - 1];
      const text = result[0].transcript;
      setQ(text);
      if (result.isFinal) go(text);
    };
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    setListening(true);
    rec.start();
  };

  // L'index n'est chargé qu'au premier usage de la barre.
  const prepare = () => {
    // Jeux vidéo seulement : les animes ont leur propre section (AniList), plus complète.
    if (!games.size)
      loadSearchIndex()
        .then((i) => setGames(new Map(i.games.filter((g) => !g.id.startsWith("anilist-")).map((g) => [g.title, g]))))
        .catch(() => {});
  };
  useEffect(() => {
    if (autoFocus) prepare();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- chargement unique
  }, []);

  const suggestions = open ? suggestTitles(q, [...games.keys()], 5) : [];
  const animeShown = open ? anime : [];

  // Jeu avec une fiche sur le site : on l'ouvre directement ; sinon, recherche sur son titre.
  const openGame = (title: string) => {
    const url = games.get(title)?.url;
    if (url?.startsWith("/")) {
      setOpen(false);
      setQ(title);
      router.push(url);
    } else go(title);
  };

  const go = (query: string) => {
    const term = query.trim();
    if (!term) return;
    setOpen(false);
    setQ(term);
    router.push(`/recherche?q=${encodeURIComponent(term)}`);
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (active >= 0 && suggestions[active]) openGame(suggestions[active]);
    else go(q);
  };

  const onKeyDown = (e: KeyboardEvent) => {
    if (!suggestions.length) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => (a + 1) % suggestions.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => (a <= 0 ? suggestions.length - 1 : a - 1));
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  return (
    <form role="search" onSubmit={submit} className={`relative ${className}`}>
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden />
      <input
        type="search"
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
          setActive(-1);
        }}
        onFocus={() => {
          prepare();
          setOpen(true);
        }}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onKeyDown={onKeyDown}
        placeholder="Rechercher…"
        enterKeyHint="search"
        autoFocus={autoFocus}
        autoComplete="off"
        role="combobox"
        aria-expanded={suggestions.length + animeShown.length > 0}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-label="Rechercher"
        className={`w-full rounded-lg border border-border bg-surface py-2.5 pl-9 text-base placeholder:text-muted focus:border-accent focus:outline-none md:py-2 md:text-sm ${canSpeak ? "pr-10" : "pr-3"}`}
      />
      {canSpeak && (
        <button
          type="button"
          onClick={listen}
          aria-label={listening ? "Écoute en cours…" : "Recherche vocale"}
          className={`absolute right-1.5 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-full transition-colors ${listening ? "animate-pulse bg-accent text-white" : "text-muted hover:text-fg"}`}
        >
          <Mic className="size-4" aria-hidden />
        </button>
      )}
      {suggestions.length + animeShown.length > 0 && (
        <ul
          id={listId}
          role="listbox"
          className="absolute inset-x-0 top-full z-50 mt-1 max-h-[70vh] overflow-y-auto rounded-lg glass glass-strong shadow-xl"
        >
          {suggestions.length > 0 && (
            <li role="presentation" className="px-3 pb-1 pt-2 text-xs font-semibold uppercase tracking-wide text-muted">
              Jeux vidéo
            </li>
          )}
          {suggestions.map((s, i) => {
            const g = games.get(s);
            const year = g?.date?.slice(0, 4);
            return (
              <li key={s} role="option" aria-selected={i === active}>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => openGame(s)}
                  className={`flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm ${i === active ? "bg-surface-2 text-heading" : "text-fg hover:bg-surface-2"}`}
                >
                  {g?.image?.startsWith("https://") ? (
                    // eslint-disable-next-line @next/next/no-img-element -- site statique
                    <img src={g.image} alt="" referrerPolicy="no-referrer" loading="lazy" onError={(e) => e.currentTarget.classList.add("invisible")} className="h-8 w-14 shrink-0 rounded object-cover" />
                  ) : (
                    <span className="flex h-8 w-14 shrink-0 items-center justify-center rounded bg-accent/15">
                      <Gamepad2 className="size-4 text-accent" aria-hidden />
                    </span>
                  )}
                  <span className="min-w-0">
                    <span className="block truncate font-semibold text-heading">{s}</span>
                    <span className="block truncate text-xs text-muted">{[year, g?.platforms.slice(0, 3).join(" · ")].filter(Boolean).join(" · ")}</span>
                  </span>
                </button>
              </li>
            );
          })}
          {animeShown.length > 0 && (
            <li role="presentation" className="border-t border-border px-3 pb-1 pt-2 text-xs font-semibold uppercase tracking-wide text-muted">
              Animes
            </li>
          )}
          {animeShown.map((m) => (
            <li key={m.id} role="option" aria-selected={false}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  setOpen(false);
                  router.push(animeHref(m.id));
                }}
                className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm text-fg hover:bg-surface-2"
              >
                {https(m.coverImage?.large) ? (
                  // eslint-disable-next-line @next/next/no-img-element -- site statique
                  <img src={https(m.coverImage?.large)} alt="" referrerPolicy="no-referrer" className="h-10 w-7 shrink-0 rounded object-cover" />
                ) : (
                  <Sparkles className="size-3.5 shrink-0 text-accent" aria-hidden />
                )}
                <span className="min-w-0">
                  <span className="block truncate font-semibold text-heading">{titleOf(m)}</span>
                  <span className="block truncate text-xs text-muted">{[m.startDate?.year, m.episodes && `${m.episodes} ép.`].filter(Boolean).join(" · ")}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </form>
  );
}

/** Reconnaissance vocale du navigateur (préfixée « webkit » sur Safari et Chrome). */
interface SpeechEvent {
  results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }>;
}
interface SpeechRecognitionLike {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: (e: SpeechEvent) => void;
  onend: () => void;
  onerror: () => void;
  start: () => void;
}
function speechApi(): (new () => SpeechRecognitionLike) | undefined {
  if (typeof window === "undefined") return undefined;
  const w = window as unknown as Record<string, unknown>;
  return (w.SpeechRecognition ?? w.webkitSpeechRecognition) as (new () => SpeechRecognitionLike) | undefined;
}
