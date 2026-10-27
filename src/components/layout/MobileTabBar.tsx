"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { activeHref, NAV_LINKS } from "./nav-links";

/** Barre d'onglets fixe en bas d'écran, à portée de pouce (mobile uniquement). */
export function MobileTabBar() {
  const active = activeHref(usePathname());

  return (
    <nav
      aria-label="Navigation principale"
      className="fixed inset-x-0 bottom-0 z-40 glass-bar border-t pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      <ul className="grid grid-cols-5">
        {NAV_LINKS.filter((l) => l.mobile).map(({ href, label, icon: Icon }) => {
          const current = active === href;
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={current ? "page" : undefined}
                className={`flex h-14 flex-col items-center justify-center gap-0.5 text-[11px] font-medium ${current ? "text-accent" : "text-muted"}`}
              >
                <Icon className="size-5" aria-hidden />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
