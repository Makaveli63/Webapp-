import { Crown, HeartHandshake } from "lucide-react";
import { roleOf } from "@/lib/player";

/**
 * Badge à côté du pseudo : « Fondateur » (doré, réservé au site) ou « Soutien » (attribué dans le tableau de bord).
 * Rien pour les autres joueurs.
 */
export function RoleBadge({ pseudo, role, className = "" }: { pseudo: string; role?: string | null; className?: string }) {
  const founder = roleOf(pseudo);
  const label = founder ?? (role === "Soutien" ? "Soutien" : undefined);
  if (!label) return null;
  const Icon = founder ? Crown : HeartHandshake;
  return (
    <span className={`${founder ? "role-badge" : "role-badge-support"} inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 align-middle text-[11px] font-bold ${className}`}>
      <Icon className="size-3" aria-hidden /> {label}
    </span>
  );
}
