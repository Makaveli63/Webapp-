"use client";

import { CircleX, Gamepad2, Mic, Newspaper, Search } from "lucide-react";
import { FlowerIcon } from "@/components/ui/FlowerIcon";
import { useRouter } from "next/navigation";
import { useEffect, useId, useMemo, useState, type FormEvent, type KeyboardEvent } from "react";
import { animeHref, https, searchAnime, titleOf, type AniMedia } from "@/lib/anilist";
import { aliasesOf } from "@/lib/aliases";
import { canon, prepareTitles, suggestTitles } from "@/lib/fuzzy";
import { articleOnPlatform, onPlatform, showsAnime, type PlatformId } from "@/lib/platform-filter";
import { loadSearchIndex } from "@/lib/search-index";
import { PlatformChips } from "./PlatformChips";
import type { SearchGame } from "@/types";

/** Barre de recherche avec suggestions de jeux pendant la saisie (tolérantes aux fautes). */
export function SearchBar({
  className = "",
  autoFocus = false,
  live = false,
  spotlight = false,
  onDone,
  onCancel,
}: {
  className?: string;
  autoFocus?: boolean;
  live?: boolean;
  /** Recherche dans l'en-tête (façon iOS) : résultats sous le champ, actus comprises, sans changer de page */
  spotlight?: boolean;
  /** Un résultat a été ouvert */
  onDone?: () => void;
  /** Échap */
  onCancel?: () => void;
}) {
  const router = useRouter();
  const [articles, setArticles] = useState<{ slug: string; title: string; hay: string; source: string; platforms: string[]; category: string }[]>([]);
  const [platform, setPlatform] = useState<PlatformId | null>(null);
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
        .then((i) => {
          setGames(new Map(i.games.filter((g) => !g.id.startsWith("anilist-")).map((g) => [g.title, g])));
          if (spotlight) setArticles(i.articles.map((a) => ({ slug: a.slug, title: a.title, source: a.source.name, platforms: a.platforms, category: a.category, hay: ` ${canon(`${a.title} ${a.tags.join(" ")}`)} ` })));
        })
        .catch(() => {});
  };
  useEffect(() => {
    if (autoFocus) prepare();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- chargement unique
  }, []);

  // Autres écritures des titres (« GTA 6 », « GTA VI »), calculées une fois.
  const alt = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const [title, g] of games) map.set(title, [...aliasesOf(title), ...(g.aka ? [g.aka] : [])]);
    return map;
  }, [games]);
  // Formes canon des titres et de leurs autres écritures, calculées une fois au chargement de l'index.
  // Plateforme choisie (en-tête) : seuls ses jeux sont proposés.
  const prepared = useMemo(
    () => prepareTitles([...games.entries()].filter(([, g]) => onPlatform(g.platforms, platform)).map(([t]) => t), (t) => alt.get(t) ?? []),
    [games, alt, platform],
  );

  // Page Recherche : les résultats s'affichent pendant la saisie (pas besoin de valider).
  useEffect(() => {
    if (!live) return;
    const initial = new URLSearchParams(window.location.search).get("q");
    if (initial) setQ(initial);
  }, [live]);
  useEffect(() => {
    if (!live) return;
    const term = q.trim();
    const current = new URLSearchParams(window.location.search).get("q") ?? "";
    if (term === current || (term.length > 0 && term.length < 2)) return;
    const timer = window.setTimeout(() => router.replace(term ? `/recherche?q=${encodeURIComponent(term)}` : "/recherche", { scroll: false }), 250);
    return () => window.clearTimeout(timer);
  }, [q, live, router]);

  // Page Recherche : les résultats s'affichent déjà dessous, pas de liste par-dessus les filtres.
  const suggestions = useMemo(() => (open && !live ? suggestTitles(q, prepared, 5) : []), [open, live, q, prepared]);
  // Les animes n'ont pas de console : masqués quand on filtre par console.
  const animeShown = open && !live && showsAnime(platform) ? anime : [];
  // En-tête : les actus qui contiennent tous les mots tapés.
  const words = spotlight && q.trim().length >= 2 ? canon(q).split(" ").filter(Boolean) : [];
  const articlesShown = words.length ? articles.filter((a) => articleOnPlatform(a, platform) && words.every((w) => a.hay.includes(w))).slice(0, 4) : [];

  // Jeu avec une fiche sur le site : on l'ouvre directement ; sinon, recherche sur son titre.
  const openGame = (title: string) => {
    const url = games.get(title)?.url;
    if (url?.startsWith("/")) {
      setOpen(false);
      setQ(title);
      router.push(url);
      onDone?.();
    } else go(title);
  };

  const go = (query: string) => {
    const term = query.trim();
    if (!term) return;
    setOpen(false);
    setQ(term);
    router.push(`/recherche?q=${encodeURIComponent(term)}${platform ? `&p=${platform}` : ""}`);
    onDone?.();
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (active >= 0 && suggestions[active]) openGame(suggestions[active]);
    else go(q);
  };

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Escape" && onCancel) return onCancel();
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
      {/* En-tête : la loupe est à la place exacte de celle du bouton dont le champ est sorti. */}
      <Search
        className={`pointer-events-none absolute top-1/2 -translate-y-1/2 text-muted ${spotlight ? "left-[11px] size-5" : "left-3 size-4"}`}
        aria-hidden
      />
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
        onBlur={() => !spotlight && setTimeout(() => setOpen(false), 150)}
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
        className={`w-full text-base placeholder:text-muted focus:outline-none ${
          spotlight
            ? "spotlight-input rounded-full border-0 py-2.5 pl-10"
            : "rounded-lg border border-border bg-surface py-2.5 pl-9 focus:border-accent md:py-2 md:text-sm"
        } ${canSpeak ? (spotlight ? "pr-16" : "pr-10") : spotlight ? "pr-9" : "pr-3"}`}
      />
      {/* En-tête : la croix efface le texte, ou referme la recherche quand le champ est vide. */}
      {spotlight && (
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => (q ? setQ("") : onCancel?.())}
          aria-label={q ? "Effacer" : "Fermer la recherche"}
          className={`absolute top-1/2 flex size-7 -translate-y-1/2 items-center justify-center text-muted ${canSpeak ? "right-9" : "right-2"}`}
        >
          <CircleX className="size-[18px]" fill="currentColor" stroke="var(--surface)" aria-hidden />
        </button>
      )}
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
      {(suggestions.length + animeShown.length + articlesShown.length > 0 || (spotlight && open && q.trim().length >= 2)) && (
        <ul
          id={listId}
          role="listbox"
          className={`absolute inset-x-0 top-full z-50 overflow-y-auto glass glass-strong shadow-xl ${spotlight ? "spotlight-results mt-2 max-h-[72vh] rounded-2xl" : "mt-1 max-h-[70vh] rounded-lg"}`}
        >
          {spotlight && (
            <li role="presentation" className="spotlight-chips sticky top-0 z-10 px-3 py-2.5">
              <PlatformChips value={platform} onChange={setPlatform} />
            </li>
          )}
          {spotlight && platform && q.trim().length >= 2 && suggestions.length + articlesShown.length + animeShown.length === 0 && (
            <li role="presentation" className="px-3 py-3 text-sm text-muted">
              {platform === "anime" ? "Aucun anime" : "Rien sur cette plateforme"} pour « {q.trim()} ».
            </li>
          )}
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
                  onDone?.();
                }}
                className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm text-fg hover:bg-surface-2"
              >
                {https(m.coverImage?.large) ? (
                  // eslint-disable-next-line @next/next/no-img-element -- site statique
                  <img src={https(m.coverImage?.large)} alt="" referrerPolicy="no-referrer" className="h-10 w-7 shrink-0 rounded object-cover" />
                ) : (
                  <FlowerIcon className="size-4 shrink-0 text-accent" aria-hidden />
                )}
                <span className="min-w-0">
                  <span className="block truncate font-semibold text-heading">{titleOf(m)}</span>
                  <span className="block truncate text-xs text-muted">{[m.startDate?.year, m.episodes && `${m.episodes} ép.`].filter(Boolean).join(" · ")}</span>
                </span>
              </button>
            </li>
          ))}
          {articlesShown.length > 0 && (
            <li role="presentation" className="border-t border-border px-3 pb-1 pt-2 text-xs font-semibold uppercase tracking-wide text-muted">
              Actualités
            </li>
          )}
          {articlesShown.map((a) => (
            <li key={a.slug} role="option" aria-selected={false}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  setOpen(false);
                  router.push(`/actualites/${a.slug}`);
                  onDone?.();
                }}
                className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm text-fg hover:bg-surface-2"
              >
                <Newspaper className="size-4 shrink-0 text-accent" aria-hidden />
                <span className="min-w-0">
                  <span className="line-clamp-2 font-semibold text-heading">{a.title}</span>
                  <span className="block truncate text-xs text-muted">{a.source}</span>
                </span>
              </button>
            </li>
          ))}
          {spotlight && q.trim() && (
            <li role="option" aria-selected={false} className="border-t border-border">
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => go(q)}
                className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-sm font-semibold text-accent hover:bg-surface-2"
              >
                <Search className="size-4 shrink-0" aria-hidden /> Tous les résultats pour « {q.trim()} »
              </button>
            </li>
          )}
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
