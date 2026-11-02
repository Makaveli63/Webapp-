"use client";

import { Clapperboard, Gamepad2, Gift, Lightbulb, Newspaper, BookOpen, Puzzle, Spade, Star, Tag, Trophy } from "lucide-react";
import Link from "next/link";
import { FlowerIcon } from "@/components/ui/FlowerIcon";
import { useHiddenTopics, type TopicId } from "@/lib/topics";

const LINKS: { href: string; tile: string; label: string; icon: typeof Puzzle | typeof FlowerIcon; topic?: TopicId }[] = [
  { href: "/jeu-du-jour", tile: "daily", label: "Jeu du jour", icon: Puzzle },
  { href: "/anime", tile: "anime", label: "Anime", icon: FlowerIcon, topic: "Anime" },
  { href: "/comics", tile: "comics", label: "Comics", icon: BookOpen, topic: "Comics" },
  { href: "/tcg", tile: "tcg", label: "Cartes", icon: Spade, topic: "TCG" },
  { href: "/tests", tile: "tests", label: "Tests", icon: Star },
  { href: "/jeux-gratuits", tile: "free", label: "Jeux gratuits", icon: Gift },
  { href: "/suggestions", tile: "ideas", label: "Suggestions", icon: Lightbulb },
  { href: "/actualites", tile: "news", label: "Toutes les actus", icon: Newspaper },
  { href: "/promos", tile: "deals", label: "Promos", icon: Tag },
  { href: "/videos", tile: "videos", label: "Vidéos", icon: Clapperboard },
  { href: "/classement", tile: "ranking", label: "Classement", icon: Trophy },
  { href: "/consoles", tile: "consoles", label: "Consoles", icon: Gamepad2 },
];

/**
 * Raccourcis en tête de l'accueil (visibles dès l'ouverture), dont les rubriques Anime, Comics et Cartes :
 * une rubrique masquée dans Réglages → « Mes rubriques » disparaît d'ici.
 */
export function QuickLinks() {
  const hidden = useHiddenTopics();
  return (
    <nav aria-label="Raccourcis" className="scroll-row -mx-4 -mt-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      {LINKS.filter((l) => !l.topic || !hidden.includes(l.topic)).map(({ href, tile, label, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          className="glass-pill inline-flex shrink-0 items-center gap-2 rounded-full py-1.5 pl-1.5 pr-3 text-xs font-semibold text-fg ring-1 ring-inset ring-border hover:text-heading hover:ring-accent sm:text-sm"
        >
          {/* Pastille en dégradé, comme les icônes de « Mes rubriques » */}
          <span className={`quick-tile quick-tile-${tile} flex size-6 shrink-0 items-center justify-center rounded-[7px]`}>
            <Icon className="size-3.5" aria-hidden />
          </span>
          {label}
        </Link>
      ))}
    </nav>
  );
}
