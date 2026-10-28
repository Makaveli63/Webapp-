import { Crown } from "lucide-react";
import { roleOf } from "@/lib/player";

/** Badge doré « Fondateur » à côté du pseudo (rien pour les autres joueurs). */
export function RoleBadge({ pseudo, className = "" }: { pseudo: string; className?: string }) {
  const role = roleOf(pseudo);
  if (!role) return null;
  return (
    <span className={`role-badge inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 align-middle text-[11px] font-bold ${className}`}>
      <Crown className="size-3" aria-hidden /> {role}
    </span>
  );
}
