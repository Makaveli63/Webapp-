import { ChevronRight, Lightbulb } from "lucide-react";
import Link from "next/link";

/** Carte « Une idée ou un bug ? » vers la page Suggestions (Mon espace, Réglages). */
export function SuggestShortcut() {
  return (
    <Link href="/suggestions" className="glass flex items-center gap-4 rounded-2xl p-4 hover:border-accent/60">
      <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-amber-500 text-white">
        <Lightbulb className="size-6" aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-lg font-bold text-heading">Une idée ou un bug ?</span>
        <span className="block text-sm text-muted">Propose une amélioration et suis son statut</span>
      </span>
      <ChevronRight className="size-5 shrink-0 text-muted" aria-hidden />
    </Link>
  );
}
