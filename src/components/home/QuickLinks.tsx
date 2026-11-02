"use client";

import { Clapperboard, Gamepad2, Gift, Lightbulb, Newspaper, Puzzle, Spade, Star, Tag, Trophy, Zap } from "lucide-react";
import Link from "next/link";
import { FlowerIcon } from "@/components/ui/FlowerIcon";
import { useHiddenTopics, type TopicId } from "@/lib/topics";

const LINKS: { href: string; label: string; icon: typeof Puzzle | typeof FlowerIcon; topic?: TopicId }[] = [
  { href: "/jeu-du-jour", label: "Jeu du jour", icon: Puzzle },
  { href: "/anime", label: "Anime", icon: FlowerIcon, topic: "Anime" },
  { href: "/comics", label: "Comics", icon: Zap, topic: "Comics" },
  { href: "/tcg", label: "Cartes", icon: Spade, topic: "TCG" },
  { href: "/tests", label: "Tests", icon: Star },
  { href: "/jeux-gratuits", label: "Jeux gratuits", icon: Gift },
  { href: "/suggestions", label: "Suggestions", icon: Lightbulb },
  { href: "/actualites", label: "Toutes les actus", icon: Newspaper },
  { href: "/promos", label: "Promos", icon: Tag },
  { href: "/videos", label: "Vidéos", icon: Clapperboard },
  { href: "/classement", label: "Classement", icon: Trophy },
  { href: "/consoles", label: "Consoles", icon: Gamepad2 },
];

/**
 * Raccourcis en tête de l'accueil (visibles dès l'ouverture), dont les rubriques Anime, Comics et Cartes :
 * une rubrique masquée dans Réglages → « Mes rubriques » disparaît d'ici.
 */
export function QuickLinks() {
  const hidden = useHiddenTopics();
  return (
    <nav aria-label="Raccourcis" className="scroll-row -mx-4 -mt-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      {LINKS.filter((l) => !l.topic || !hidden.includes(l.topic)).map(({ href, label, icon: Icon, topic }) => (
        <Link
          key={href}
          href={href}
          className="glass-pill inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold text-fg ring-1 ring-inset ring-border hover:text-heading hover:ring-accent sm:text-sm"
        >
          <Icon className={`size-3.5 ${topic ? `topic-ink-${topic.toLowerCase()}` : "text-accent"}`} aria-hidden />
          {label}
        </Link>
      ))}
    </nav>
  );
}
