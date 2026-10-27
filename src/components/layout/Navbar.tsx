"use client";

import Link from "next/link";
import { Bookmark, LibraryBig } from "lucide-react";
import { usePathname } from "next/navigation";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { Logo } from "@/components/ui/Logo";
import { AdminLink } from "./AdminLink";
import { activeHref, NAV_LINKS, SEARCH_LINK } from "./nav-links";
import { SearchBar } from "./SearchBar";

/** En-tête : navigation complète sur ordinateur, logo + recherche sur mobile (onglets en bas d'écran). */
export function Navbar() {
  const pathname = usePathname();
  const active = activeHref(pathname);
  const SearchIcon = SEARCH_LINK.icon;

  return (
    <header className="sticky top-0 z-40 glass-bar border-b pt-[env(safe-area-inset-top)]">
      <nav className="mx-auto flex h-14 max-w-6xl items-center gap-4 px-4 md:h-16">
        <Link href="/" aria-label="GamingBase, accueil">
          <Logo id="gb-nav" className="text-lg" />
        </Link>

        <ul className="ml-4 hidden items-center gap-0.5 md:flex">
          {NAV_LINKS.map((l) => (
            <li key={l.href} className={"wide" in l && l.wide ? (l.wide === "never" ? "hidden" : "hidden xl:block") : undefined}>
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

        <SearchBar className="ml-auto hidden w-44 lg:block xl:w-56" />

        <div className="ml-auto flex items-center gap-1 sm:gap-4 lg:ml-0">
          <AdminLink active={pathname.startsWith("/admin")} />
          <ThemeToggle className="-mr-1" />
          <Link
            href="/collection"
            aria-label="Ma bibliothèque"
            className="-mr-1 flex size-11 items-center justify-center rounded-full text-muted hover:text-fg"
          >
            <LibraryBig className="size-5" aria-hidden />
          </Link>
          <Link
            href="/favoris"
            aria-label="Mes favoris"
            className="-mr-1 flex size-11 items-center justify-center rounded-full text-muted hover:text-fg"
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
        </div>
      </nav>
    </header>
  );
}
