import { ArrowRight, Cpu } from "lucide-react";
import Link from "next/link";
import { consoleSummaries } from "@/data/scene-status";
import { formatDate } from "@/lib/format";
import { StatusBadge } from "./StatusBadge";

export function StatusWidget() {
  return (
    <section aria-labelledby="status-title" className="rounded-2xl border border-border bg-gradient-to-br from-accent/10 via-surface to-surface p-5 sm:p-6">
      <div className="flex items-center justify-between gap-4">
        <h2 id="status-title" className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-accent-2">
          <Cpu className="size-4" aria-hidden />
          État de la scène
        </h2>
        <Link href="/scene" className="flex items-center gap-1 text-sm text-muted hover:text-fg">
          Matrice complète <ArrowRight className="size-4" aria-hidden />
        </Link>
      </div>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        {consoleSummaries.map((s) => (
          <div key={s.console} className="rounded-xl border border-border bg-bg/60 p-4">
            <div className="flex items-center justify-between gap-2">
              <p className="text-lg font-bold text-white">{s.console}</p>
              <StatusBadge status={s.status} />
            </div>
            <p className="mt-1 font-mono text-xs text-muted">Dernier firmware : {s.latestFirmware}</p>
            <p className="mt-3 text-sm">{s.headline}</p>
            <p className="mt-3 text-xs text-muted">Mis à jour le {formatDate(s.updatedAt)}</p>
          </div>
        ))}
      </div>
      <p className="mt-4 text-xs text-muted">Données d&apos;exemple — à remplacer par des informations vérifiées.</p>
    </section>
  );
}
