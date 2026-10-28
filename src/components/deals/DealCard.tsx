import { ExternalLink } from "lucide-react";
import { CollectionButtons } from "@/components/collection/CollectionButtons";
import { RemoteImage } from "@/components/ui/RemoteImage";
import { themeFor } from "@/lib/themes";
import type { Deal } from "@/types";

const until = (iso?: string) =>
  iso ? new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", timeZone: "Europe/Paris" }).format(new Date(iso)) : undefined;

export function DealCard({ deal }: { deal: Deal }) {
  return (
    <article className="glass flex flex-col overflow-hidden rounded-xl">
      <div className="relative aspect-[16/9] w-full">
        <div className="absolute inset-0">
          <RemoteImage src={deal.image} alt={deal.title} theme={themeFor(deal.title)} seed={deal.id} className="h-full w-full" credit={deal.store} />
        </div>
        <span className="score-glass score-excellent absolute right-2 top-2 rounded-xl px-2.5 py-1 text-lg font-black">-{deal.discount} %</span>
      </div>
      <div className="flex flex-1 flex-col p-4">
        <h3 className="line-clamp-2 font-semibold leading-snug text-heading">{deal.title}</h3>
        <p className="mt-1 flex items-baseline gap-2">
          {deal.price && <span className="text-lg font-extrabold text-heading">{deal.price}</span>}
          {deal.oldPrice && <span className="text-sm text-muted line-through">{deal.oldPrice}</span>}
        </p>
        <p className="text-xs text-muted">
          {deal.store}
          {until(deal.until) && ` · jusqu'au ${until(deal.until)}`}
        </p>
        <div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-3">
          <CollectionButtons game={{ id: deal.id, title: deal.title, image: deal.image }} />
          <a
            href={deal.url}
            target="_blank"
            rel="noopener noreferrer"
            className="-my-2 inline-flex items-center gap-1 py-2 text-sm font-semibold text-accent hover:underline"
          >
            Voir l&apos;offre <ExternalLink className="size-3.5" aria-hidden />
          </a>
        </div>
      </div>
    </article>
  );
}
