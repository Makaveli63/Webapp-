"use client";

import { Gamepad2, Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { SearchBar } from "./SearchBar";

const LINKS = [
  { href: "/", label: "Accueil" },
  { href: "/actualites", label: "Actualités" },
  { href: "/scene", label: "Scène & Jailbreak" },
  { href: "/scene/glossaire", label: "Glossaire" },
];

export function Navbar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  // Le lien actif est celui dont le préfixe correspondant est le plus long.
  const activeHref = LINKS.map((l) => l.href)
    .filter((h) => (h === "/" ? pathname === "/" : pathname.startsWith(h)))
    .sort((a, b) => b.length - a.length)[0];
  const isActive = (href: string) => href === activeHref;

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-bg/85 backdrop-blur">
      <nav className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4">
        <Link href="/" className="flex items-center gap-2 font-bold tracking-tight">
          <Gamepad2 className="size-6 text-accent" aria-hidden />
          <span>
            Pixel<span className="text-accent-2">Underground</span>
          </span>
        </Link>

        <ul className="ml-6 hidden items-center gap-1 md:flex">
          {LINKS.map((l) => (
            <li key={l.href}>
              <Link
                href={l.href}
                className={`rounded-md px-3 py-2 text-sm transition-colors ${isActive(l.href) ? "bg-surface-2 text-white" : "text-muted hover:text-fg"}`}
              >
                {l.label}
              </Link>
            </li>
          ))}
        </ul>

        <SearchBar className="ml-auto hidden w-64 md:block" />

        <button
          type="button"
          className="ml-auto rounded-md p-2 text-muted hover:text-fg md:hidden"
          onClick={() => setOpen((o) => !o)}
          aria-label={open ? "Fermer le menu" : "Ouvrir le menu"}
          aria-expanded={open}
        >
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </nav>

      {open && (
        <div className="border-t border-border px-4 pb-4 md:hidden">
          <SearchBar className="mt-3" onSubmitted={() => setOpen(false)} />
          <ul className="mt-2">
            {LINKS.map((l) => (
              <li key={l.href}>
                <Link
                  href={l.href}
                  onClick={() => setOpen(false)}
                  className={`block rounded-md px-3 py-2 text-sm ${isActive(l.href) ? "bg-surface-2 text-white" : "text-muted"}`}
                >
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </header>
  );
}
