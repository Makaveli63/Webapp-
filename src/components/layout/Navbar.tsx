"use client";

import Link from "next/link";
import { Bookmark } from "lucide-react";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/ui/Logo";
import { activeHref, NAV_LINKS, SEARCH_LINK } from "./nav-links";
import { SearchBar } from "./SearchBar";

/** En-tête : navigation complète sur ordinateur, logo + recherche sur mobile (onglets en bas d'écran). */
export function Navbar() {
  const active = activeHref(usePathname());
  const SearchIcon = SEARCH_LINK.icon;

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-bg/85 pt-[env(safe-area-inset-top)] backdrop-blur">
      <nav className="mx-auto flex h-14 max-w-6xl items-center gap-4 px-4 md:h-16">
        <Link href="/" aria-label="GamingBase, accueil">
          <Logo id="gb-nav" className="text-lg" />
        </Link>

        <ul className="ml-4 hidden items-center gap-0.5 md:flex">
          {NAV_LINKS.map((l) => (
            <li key={l.href}>
              <Link
                href={l.href}
                aria-current={active === l.href ? "page" : undefined}
                className={`rounded-md px-3 py-2 text-sm transition-colors ${active === l.href ? "bg-surface-2 text-heading" : "text-muted hover:text-fg"}`}
              >
                {l.label}
              </Link>
            </li>
          ))}
        </ul>

        <SearchBar className="ml-auto hidden w-56 lg:block" />

        <Link
          href="/favoris"
          aria-label="Mes favoris"
          className="-mr-1 ml-auto flex size-11 items-center justify-center rounded-full text-muted hover:text-fg lg:ml-0"
        >
          <Bookmark className="size-5" aria-hidden />
        </Link>

        <Link
          href={SEARCH_LINK.href}
          aria-label="Rechercher"
          className="-mr-2 flex size-11 items-center justify-center rounded-full text-muted hover:text-fg lg:hidden"
        >
          <SearchIcon className="size-5" aria-hidden />
        </Link>
      </nav>
    </header>
  );
}
