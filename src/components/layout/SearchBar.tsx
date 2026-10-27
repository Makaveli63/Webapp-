"use client";

import { Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

export function SearchBar({ className = "", autoFocus = false }: { className?: string; autoFocus?: boolean }) {
  const router = useRouter();
  const [q, setQ] = useState("");

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!q.trim()) return;
    router.push(`/recherche?q=${encodeURIComponent(q.trim())}`);
  }

  return (
    <form role="search" onSubmit={submit} className={`relative ${className}`}>
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden />
      <input
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Rechercher un jeu, une console…"
        enterKeyHint="search"
        autoFocus={autoFocus}
        aria-label="Rechercher"
        className="w-full rounded-lg border border-border bg-surface py-2.5 pl-9 pr-3 text-base placeholder:text-muted focus:border-accent focus:outline-none md:py-2 md:text-sm"
      />
    </form>
  );
}
