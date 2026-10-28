import { Clapperboard, Gamepad2, Newspaper, Tag, Trophy } from "lucide-react";
import Link from "next/link";

const LINKS = [
  { href: "/actualites", label: "Toutes les actus", icon: Newspaper },
  { href: "/promos", label: "Promos", icon: Tag },
  { href: "/videos", label: "Vidéos", icon: Clapperboard },
  { href: "/classement", label: "Classement", icon: Trophy },
  { href: "/consoles", label: "Consoles", icon: Gamepad2 },
];

/** Raccourcis discrets vers les rubriques absentes de la barre d'onglets mobile. */
export function QuickLinks() {
  return (
    <nav aria-label="Raccourcis" className="scroll-row -mx-4 -mt-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      {LINKS.map(({ href, label, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          className="glass-pill inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold text-fg ring-1 ring-inset ring-border hover:text-heading hover:ring-accent sm:text-sm"
        >
          <Icon className="size-3.5 text-accent" aria-hidden />
          {label}
        </Link>
      ))}
    </nav>
  );
}
