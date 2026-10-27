import { Clapperboard, Gamepad2, Heart, Tag, Trophy } from "lucide-react";
import Link from "next/link";

const LINKS = [
  { href: "/promos", label: "Promos", icon: Tag },
  { href: "/videos", label: "Vidéos", icon: Clapperboard },
  { href: "/collection", label: "Ma collection", icon: Heart },
  { href: "/classement", label: "Classement", icon: Trophy },
  { href: "/consoles", label: "Consoles", icon: Gamepad2 },
];

/** Raccourcis vers les rubriques absentes de la barre d'onglets mobile. */
export function QuickLinks() {
  return (
    <nav aria-label="Raccourcis" className="grid grid-cols-5 gap-1.5 sm:gap-3">
      {LINKS.map(({ href, label, icon: Icon }) => (
        <Link key={href} href={href} className="glass flex flex-col items-center gap-1.5 rounded-xl px-1 py-3 text-center text-[11px] font-semibold text-heading hover:border-accent/60 sm:text-sm">
          <Icon className="size-5 text-accent" aria-hidden />
          {label}
        </Link>
      ))}
    </nav>
  );
}
