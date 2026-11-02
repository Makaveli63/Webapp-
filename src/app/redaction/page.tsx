import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { WriterDesk } from "@/components/writer/WriterDesk";

export const metadata: Metadata = {
  title: "Rédaction",
  robots: { index: false, follow: false },
};

export default function WriterPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link href="/favoris" className="inline-flex items-center gap-1 text-sm font-semibold text-muted hover:text-heading">
        <ArrowLeft className="size-4" aria-hidden /> Mon espace
      </Link>
      <header>
        <h1 className="text-2xl font-extrabold text-heading sm:text-3xl">Rédaction</h1>
        <p className="mt-2 text-muted">Écris une actu, un test ou un article console : il est publié sur GamingBase à la prochaine mise à jour, en moins d&apos;une heure.</p>
      </header>
      <WriterDesk />
    </div>
  );
}
