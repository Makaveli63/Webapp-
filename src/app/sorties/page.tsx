import type { Metadata } from "next";
import { ReleaseCard } from "@/components/releases/ReleaseCard";
import { getUpcomingReleases } from "@/lib/releases";

export const metadata: Metadata = {
  title: "Grosses sorties à venir",
  description: "Compte à rebours des jeux les plus attendus : GTA VI, Zelda, Final Fantasy…",
};

export default function ReleasesPage() {
  const releases = getUpcomingReleases();
  return (
    <div>
      <h1 className="text-2xl font-extrabold text-heading sm:text-3xl">Grosses sorties à venir</h1>
      <p className="mt-2 text-muted">
        Le compte à rebours des jeux les plus attendus. Dates officielles, à minuit (heure de Paris).
      </p>
      {releases.length ? (
        <div className="mt-6 grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
          {releases.map((r) => (
            <ReleaseCard key={r.id} release={r} />
          ))}
        </div>
      ) : (
        <p className="mt-6 text-muted">Aucune grosse sortie datée pour le moment.</p>
      )}
    </div>
  );
}
