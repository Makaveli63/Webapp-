"use client";

import Link from "next/link";
import { useState } from "react";
import { VULN_LABEL } from "@/data/scene-status";
import type { Console, FirmwareStatus } from "@/types";
import { StatusBadge } from "./StatusBadge";

const CONSOLES: (Console | "Toutes")[] = ["Toutes", "PS5", "Switch 2"];

export function StatusMatrix({ rows }: { rows: FirmwareStatus[] }) {
  const [filter, setFilter] = useState<Console | "Toutes">("Toutes");
  const visible = rows.filter((r) => filter === "Toutes" || r.console === filter);

  return (
    <div>
      <div className="flex gap-2" role="group" aria-label="Filtrer par console">
        {CONSOLES.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setFilter(c)}
            aria-pressed={filter === c}
            className={`rounded-full px-3 py-1 text-sm ring-1 ring-inset ${filter === c ? "bg-accent text-white ring-accent" : "bg-surface text-muted ring-border hover:text-fg"}`}
          >
            {c}
          </button>
        ))}
      </div>

      {/* Tableau (≥ md) */}
      <div className="mt-5 hidden overflow-hidden rounded-xl border border-border md:block">
        <table className="w-full text-left text-sm">
          <thead className="bg-surface-2 text-xs uppercase tracking-wider text-muted">
            <tr>
              <th scope="col" className="px-4 py-3">Console</th>
              <th scope="col" className="px-4 py-3">Firmware</th>
              <th scope="col" className="px-4 py-3">Vulnérabilité</th>
              <th scope="col" className="px-4 py-3">Statut</th>
              <th scope="col" className="px-4 py-3">Outillage</th>
              <th scope="col" className="px-4 py-3">Guide</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border bg-surface">
            {visible.map((r) => (
              <tr key={r.id} className="align-top">
                <td className="px-4 py-3 font-semibold text-white">{r.console}</td>
                <td className="px-4 py-3 font-mono text-xs">{r.firmwareRange}</td>
                <td className="px-4 py-3">
                  <span className="text-xs text-accent-2">{VULN_LABEL[r.vulnerability.kind]}</span>
                  <p>{r.vulnerability.label}</p>
                </td>
                <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
                <td className="px-4 py-3 text-muted">{r.tooling}</td>
                <td className="px-4 py-3">
                  {r.guideSlug ? (
                    <Link href={`/scene/guides/${r.guideSlug}`} className="text-accent-2 underline underline-offset-2">Lire</Link>
                  ) : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Cartes (mobile) */}
      <ul className="mt-5 space-y-3 md:hidden">
        {visible.map((r) => (
          <li key={r.id} className="rounded-xl border border-border bg-surface p-4">
            <div className="flex items-center justify-between">
              <p className="font-semibold text-white">{r.console}</p>
              <StatusBadge status={r.status} />
            </div>
            <p className="mt-1 font-mono text-xs text-muted">{r.firmwareRange}</p>
            <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
              <dt className="text-muted">Vulnérabilité</dt>
              <dd>{r.vulnerability.label}</dd>
              <dt className="text-muted">Outillage</dt>
              <dd>{r.tooling}</dd>
            </dl>
            {r.guideSlug && (
              <Link href={`/scene/guides/${r.guideSlug}`} className="mt-3 inline-block text-sm text-accent-2 underline underline-offset-2">
                Lire le guide associé
              </Link>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
