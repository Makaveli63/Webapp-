import { Clapperboard, Gamepad2, Heart, Tag } from "lucide-react";
import Link from "next/link";

const LINKS = [
  { href: "/promos", label: "Promos", icon: Tag },
  { href: "/videos", label: "Vidéos", icon: Clapperboard },
  { href: "/collection", label: "Ma collection", icon: Heart },
  { href: "/consoles", label: "Consoles", icon: Gamepad2 },
];

/** Raccourcis vers les rubriques absentes de la barre d'onglets mobile. */
export function QuickLinks() {
  return (
    <nav aria-label="Raccourcis" className="grid grid-cols-4 gap-2 sm:gap-3">
      {LINKS.map(({ href, label, icon: Icon }) => (
        <Link key={href} href={href} className="glass flex flex-col items-center gap-1.5 rounded-xl px-2 py-3 text-center text-xs font-semibold text-heading hover:border-accent/60 sm:text-sm">
          <Icon className="size-5 text-accent" aria-hidden />
          {label}
        </Link>
      ))}
    </nav>
  );
}
