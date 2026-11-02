import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { DealCard } from "@/components/deals/DealCard";
import { getDeals } from "@/lib/deals";
import type { Deal } from "@/types";

export function PromosTeaser() {
  // Une promo de chaque boutique à tour de rôle (la plus forte d'abord), pour ne pas montrer que du PC.
  const d = getDeals();
  const lists = [d.steam, d.playstation, d.xbox, d.nintendo].filter((l) => l.length);
  const deals: Deal[] = [];
  for (let i = 0; deals.length < 3 && lists.some((l) => l[i]); i++) for (const l of lists) if (l[i] && deals.length < 3) deals.push(l[i]);
  if (!deals.length) return null;
  return (
    <section aria-labelledby="promos-teaser">
      <div className="flex items-end justify-between gap-4">
        <h2 id="promos-teaser" className="text-xl font-bold text-heading sm:text-2xl">Promos du moment</h2>
        <Link href="/promos" className="-my-2 inline-flex items-center gap-1 py-2 text-sm font-semibold text-accent hover:underline">
          Toutes les promos <ArrowRight className="size-4" aria-hidden />
        </Link>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
        {deals.map((d) => (
          <DealCard key={d.id} deal={d} />
        ))}
      </div>
    </section>
  );
}
