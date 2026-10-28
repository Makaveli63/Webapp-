"use client";

import "./globals.css";
import { ErrorScreen } from "@/components/app/ErrorScreen";

// Erreur dans la structure commune du site (en-tête, barres) : page de secours complète.
export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
  return (
    <html lang="fr">
      <body className="bg-bg font-sans text-fg antialiased">
        <ErrorScreen error={error} />
      </body>
    </html>
  );
}
