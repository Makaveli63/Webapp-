import { Flame, Gamepad2, Ghost, MessageSquare, Newspaper, Search, Star, Trophy, Zap, type LucideIcon } from "lucide-react";
import { FlowerIcon } from "@/components/ui/FlowerIcon";
import type { BadgeId } from "@/lib/player";

/** Avatars proposés : une icône de l'appli sur une pastille de couleur (pas de photo, pas de compte). */
export const AVATARS: { Icon: LucideIcon | typeof FlowerIcon; bg: string; name: string }[] = [
  { Icon: Gamepad2, bg: "bg-[#6c4cf5]", name: "Manette" },
  { Icon: FlowerIcon, bg: "bg-[#e0457b]", name: "Fleur" },
  { Icon: Star, bg: "bg-[#1f9d55]", name: "Étoile" },
  { Icon: Trophy, bg: "bg-[#d97706]", name: "Trophée" },
  { Icon: Zap, bg: "bg-[#0e7490]", name: "Éclair" },
  { Icon: Ghost, bg: "bg-[#3f3f46]", name: "Fantôme" },
];

export function PlayerAvatar({ avatar, className = "size-9", iconClass = "size-[55%]" }: { avatar: number; className?: string; iconClass?: string }) {
  const a = AVATARS[avatar] ?? AVATARS[0];
  return (
    <span className={`inline-flex shrink-0 items-center justify-center rounded-full text-white ${a.bg} ${className}`}>
      <a.Icon className={iconClass} aria-hidden />
    </span>
  );
}

/** Icône et couleur de chaque succès. */
export const BADGE_ICONS: Record<BadgeId, { Icon: LucideIcon | typeof FlowerIcon; color: string }> = {
  streak7: { Icon: Flame, color: "text-amber-500" },
  comment1: { Icon: MessageSquare, color: "text-accent" },
  reads50: { Icon: Newspaper, color: "text-sky-500" },
  anime10: { Icon: FlowerIcon, color: "text-pink-500" },
  daily10: { Icon: Search, color: "text-emerald-500" },
  level50: { Icon: Trophy, color: "text-amber-500" },
};
