import type { Metadata } from "next";
import { SuggestionForm } from "@/components/suggestions/SuggestionForm";

export const metadata: Metadata = {
  title: "Suggestions",
  description: "Une idée pour améliorer GamingBase ? Envoie-la directement à l'équipe.",
};

export default function SuggestionsPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <header>
        <h1 className="text-2xl font-extrabold text-heading sm:text-3xl">Suggestions</h1>
        <p className="mt-2 text-muted">Une idée pour améliorer le site, une source à ajouter ou un bug ? Dis-le nous, chaque message est lu.</p>
      </header>
      <SuggestionForm />
    </div>
  );
}
