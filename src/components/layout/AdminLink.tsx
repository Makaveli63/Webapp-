"use client";

import { ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useSyncExternalStore } from "react";
import { isAdminDevice, onAdminDeviceChange } from "@/lib/social";

/** Onglet « Admin » : affiché uniquement sur les appareils où l'administrateur s'est déjà connecté. */
export function AdminLink({ active }: { active: boolean }) {
  const show = useSyncExternalStore(onAdminDeviceChange, isAdminDevice, () => false);
  if (!show) return null;
  return (
    <Link
      href="/admin"
      aria-label="Tableau de bord administrateur"
      aria-current={active ? "page" : undefined}
      className={`-mr-1 inline-flex h-9 items-center gap-1.5 rounded-full px-2.5 text-sm font-semibold transition-colors sm:px-3 ${
        active ? "bg-emerald-600 text-white" : "text-emerald-700 ring-1 ring-inset ring-emerald-600/40 hover:bg-emerald-600/10 dark:text-emerald-400"
      }`}
    >
      <ShieldCheck className="size-4" aria-hidden />
      <span className="hidden sm:inline md:hidden">Admin</span>
    </Link>
  );
}
