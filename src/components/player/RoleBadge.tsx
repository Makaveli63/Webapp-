import { BadgeCheck, Bot, Briefcase, Building2, CarFront, Cpu, Crosshair, Crown, Feather, FlaskConical, Gem, Handshake, HeartHandshake, Radio, ShieldCheck, Sparkles, Wrench, Zap, type LucideIcon } from "lucide-react";
import { PLAYER_ROLES, roleOf } from "@/lib/player";

/** Icône et couleur de chaque badge (classes role-* de globals.css). */
export const ROLE_STYLES: Record<string, { Icon: LucideIcon; className: string }> = {
  Fondateur: { Icon: Crown, className: "role-badge" },
  Soutien: { Icon: HeartHandshake, className: "role-badge-support" },
  VIP: { Icon: Gem, className: "role-vip" },
  Modérateur: { Icon: ShieldCheck, className: "role-mod" },
  Rédacteur: { Icon: Feather, className: "role-writer" },
  Testeur: { Icon: FlaskConical, className: "role-tester" },
  Streamer: { Icon: Radio, className: "role-streamer" },
  Partenaire: { Icon: Handshake, className: "role-partner" },
  Légende: { Icon: Sparkles, className: "role-legend" },
  // Néon cyberpunk : coins coupés, capitales espacées, léger glitch de temps en temps (classes cyber-* de globals.css).
  Netrunner: { Icon: Cpu, className: "role-cyber cyber-cyan" },
  Edgerunner: { Icon: Zap, className: "role-cyber cyber-yellow" },
  Fixer: { Icon: Briefcase, className: "role-cyber cyber-magenta" },
  Techie: { Icon: Wrench, className: "role-cyber cyber-green" },
  Nomade: { Icon: CarFront, className: "role-cyber cyber-orange" },
  Solo: { Icon: Crosshair, className: "role-cyber cyber-red" },
  Corpo: { Icon: Building2, className: "role-cyber cyber-corpo" },
  Chromé: { Icon: Bot, className: "role-cyber cyber-chrome" },
};

/**
 * Badge à côté du pseudo : « Fondateur » (doré, réservé au site) ou un badge attribué dans le tableau de bord
 * (« Soutien », « VIP », « Modérateur »…). Rien pour les autres joueurs.
 */
export function RoleBadge({ pseudo, role, className = "" }: { pseudo: string; role?: string | null; className?: string }) {
  const label = roleOf(pseudo) ?? (PLAYER_ROLES as readonly string[]).find((r) => r === role);
  if (!label) return null;
  const { Icon, className: color } = ROLE_STYLES[label] ?? { Icon: BadgeCheck, className: "role-badge-support" };
  return (
    <span className={`${color} inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 align-middle text-[11px] font-bold ${className}`}>
      <Icon className="size-3" aria-hidden /> {label}
    </span>
  );
}
