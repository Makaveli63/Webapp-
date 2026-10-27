"use client";

import { Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useId, useState, type FormEvent, type KeyboardEvent } from "react";
import { suggestTitles } from "@/lib/fuzzy";
import { loadSearchIndex } from "@/lib/search-index";

/** Barre de recherche avec suggestions de jeux pendant la saisie (tolérantes aux fautes). */
export function SearchBar({ className = "", autoFocus = false }: { className?: string; autoFocus?: boolean }) {
  const router = useRouter();
  const listId = useId();
  const [q, setQ] = useState("");
  const [titles, setTitles] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);

  // L'index n'est chargé qu'au premier usage de la barre.
  const prepare = () => {
    if (!titles.length) loadSearchIndex().then((i) => setTitles(i.games.map((g) => g.title))).catch(() => {});
  };
  useEffect(() => {
    if (autoFocus) prepare();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- chargement unique
  }, []);

  const suggestions = open ? suggestTitles(q, titles) : [];

  const go = (query: string) => {
    const term = query.trim();
    if (!term) return;
    setOpen(false);
    setQ(term);
    router.push(`/recherche?q=${encodeURIComponent(term)}`);
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    go(active >= 0 && suggestions[active] ? suggestions[active] : q);
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
        placeholder="Rechercher un jeu, une console…"
        enterKeyHint="search"
        autoFocus={autoFocus}
        autoComplete="off"
        role="combobox"
        aria-expanded={suggestions.length > 0}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-label="Rechercher"
        className="w-full rounded-lg border border-border bg-surface py-2.5 pl-9 pr-3 text-base placeholder:text-muted focus:border-accent focus:outline-none md:py-2 md:text-sm"
      />
      {suggestions.length > 0 && (
        <ul
          id={listId}
          role="listbox"
          className="absolute inset-x-0 top-full z-50 mt-1 overflow-hidden rounded-lg glass glass-strong shadow-xl"
        >
          {suggestions.map((s, i) => (
            <li key={s} role="option" aria-selected={i === active}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => go(s)}
                className={`flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm ${i === active ? "bg-surface-2 text-heading" : "text-fg hover:bg-surface-2"}`}
              >
                <Search className="size-3.5 shrink-0 text-muted" aria-hidden />
                <span className="truncate">{s}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </form>
  );
}
