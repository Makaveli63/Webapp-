import type { Metadata } from "next";
import { AdminDashboard } from "@/components/admin/AdminDashboard";

// Page privée : absente des menus, non indexée par les moteurs de recherche, protégée par mot de passe.
export const metadata: Metadata = { title: "Tableau de bord", robots: { index: false, follow: false } };

export default function AdminPage() {
  return (
    <div>
      <h1 className="text-2xl font-extrabold text-heading sm:text-3xl">Tableau de bord</h1>
      <p className="mt-2 text-muted">Fréquentation, j&apos;aime et modération des commentaires. Réservé à l&apos;administrateur.</p>
      <AdminDashboard />
    </div>
  );
}
