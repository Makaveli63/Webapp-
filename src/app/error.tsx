"use client";

import { ErrorScreen } from "@/components/app/ErrorScreen";

// Erreur dans une page : l'en-tête et la barre d'onglets restent affichés.
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <ErrorScreen error={error} reset={reset} />;
}
