import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { DealCard } from "@/components/deals/DealCard";
import { getDeals } from "@/lib/deals";

export function PromosTeaser() {
  const deals = getDeals().steam.slice(0, 3);
  if (!deals.length) return null;
  return (
    <section aria-labelledby="promos-teaser">
      <div className="flex items-end justify-between gap-4">
        <h2 id="promos-teaser" className="text-xl font-bold text-heading sm:text-2xl">Promos du moment</h2>
        <Link href="/promos" className="inline-flex items-center gap-1 text-sm font-semibold text-accent hover:underline">
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
