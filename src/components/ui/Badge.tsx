import type { ReactNode } from "react";
import type { Category } from "@/types";

export function Badge({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${className}`}
    >
      {children}
    </span>
  );
}

export function PlatformBadge({ platform }: { platform: string }) {
  return <Badge className="bg-surface-2 text-fg ring-border">{platform}</Badge>;
}

const CATEGORY_STYLE: Record<Category, string> = {
  Actu: "bg-sky-500/15 text-sky-700 ring-sky-500/30 dark:text-sky-300",
  Test: "bg-amber-500/15 text-amber-700 ring-amber-500/30 dark:text-amber-300",
  Console: "bg-emerald-500/15 text-emerald-700 ring-emerald-500/30 dark:text-emerald-300",
  Anime: "bg-pink-500/15 text-pink-700 ring-pink-500/30 dark:text-pink-300",
};

const CATEGORY_LABEL: Record<Category, string> = { Actu: "Actu", Test: "Test", Console: "Console", Anime: "Anime" };

export function CategoryBadge({ category }: { category: Category }) {
  return <Badge className={CATEGORY_STYLE[category]}>{CATEGORY_LABEL[category]}</Badge>;
}
