"use client";

import Link from "next/link";
import { CircleUserRound, Settings } from "lucide-react";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/ui/Logo";
import { AdminLink } from "./AdminLink";
import { activeHref, NAV_LINKS } from "./nav-links";
import { HeaderSearch } from "./HeaderSearch";
import { SearchBar } from "./SearchBar";

/** En-tête : navigation complète sur ordinateur, logo + recherche sur mobile (onglets en bas d'écran). */
export function Navbar() {
  const pathname = usePathname();
  const active = activeHref(pathname);
  // Mon espace : bibliothèque, favoris et réglages.
  const mySpace = /^\/(favoris|collection)(\/|$)/.test(pathname);

  return (
    <header className="topbar sticky top-0 z-40 glass-bar border-b pt-[env(safe-area-inset-top)]">
      <nav id="gb-topnav" className="relative mx-auto flex h-14 max-w-6xl items-center gap-4 px-4 md:h-16">
        <Link href="/" aria-label="GamingBase, accueil">
          <Logo id="gb-nav" className="text-lg" />
        </Link>

        <ul className="ml-4 hidden items-center gap-0.5 md:flex">
          {NAV_LINKS.map((l) => (
            <li key={l.href} data-tab={l.mobile ? "" : undefined} className={"wide" in l && l.wide ? (l.wide === "never" ? "hidden" : "hidden xl:block") : undefined}>
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
          <HeaderSearch active={pathname.startsWith("/recherche")} />
          <Link
            href="/favoris"
            aria-label="Mon espace"
            aria-current={mySpace ? "page" : undefined}
            className={`head-btn -mr-1 flex h-11 items-center justify-center gap-1.5 rounded-full px-2.5 hover:text-fg ${mySpace ? "text-accent" : "text-muted"}`}
          >
            <CircleUserRound className="size-5" aria-hidden />
            <span className="hidden whitespace-nowrap text-sm font-semibold sm:inline lg:hidden 2xl:inline">Mon espace</span>
          </Link>

          <AdminLink active={pathname.startsWith("/admin")} />
          <Link
            href="/reglages"
            aria-label="Réglages"
            aria-current={pathname.startsWith("/reglages") ? "page" : undefined}
            className={`head-btn -mr-2 flex size-11 items-center justify-center rounded-full hover:text-fg ${pathname.startsWith("/reglages") ? "text-accent" : "text-muted"}`}
          >
            <Settings className="size-5" aria-hidden />
          </Link>
        </div>
      </nav>
    </header>
  );
}
