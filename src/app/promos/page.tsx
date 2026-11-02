import type { Metadata } from "next";
import { DealCard } from "@/components/deals/DealCard";
import { NewsCard } from "@/components/news/NewsCard";
import { getDeals, promoArticles } from "@/lib/deals";
import { getGamingArticles } from "@/lib/news";

export const metadata: Metadata = {
  title: "Promos jeux vidéo",
  description: "Les meilleures réductions du moment : Steam, PlayStation Store, eShop Nintendo et Xbox.",
};

const STORES = [
  { key: "steam", id: "promos-pc", title: "Sur PC (Steam)", empty: "Les promos Steam sont momentanément indisponibles : réessaie dans quelques heures." },
  { key: "playstation", id: "promos-playstation", title: "PlayStation Store", empty: "Les promos du PlayStation Store sont momentanément indisponibles." },
  { key: "xbox", id: "promos-xbox", title: "Xbox", empty: "Les promos Xbox sont momentanément indisponibles." },
  { key: "nintendo", id: "promos-nintendo", title: "eShop Nintendo", empty: "Les promos de l'eShop Nintendo sont momentanément indisponibles." },
] as const;

export default async function PromosPage() {
  const deals = getDeals();
  const { updatedAt } = deals;
  const consoles = promoArticles(await getGamingArticles()).slice(0, 6);
  return (
    <div className="space-y-10">
      <header>
        <h1 className="text-2xl font-extrabold text-heading sm:text-3xl">Promos du moment</h1>
        <p className="mt-2 text-muted">
          Les plus grosses réductions sur Steam, le PlayStation Store, Xbox et l&apos;eShop Nintendo. Ajoute « Je le veux » sur un jeu
          pour retrouver ses promos dans Ma bibliothèque.
        </p>
        <nav aria-label="Boutiques" className="mt-4 flex flex-wrap gap-2">
          {STORES.map((s) => (
            <a key={s.key} href={`#${s.id}`} className="glass rounded-full px-3.5 py-2 text-sm font-semibold text-heading">
              {s.title.replace("Sur PC (Steam)", "Steam")} <span className="text-muted">{deals[s.key].length}</span>
            </a>
          ))}
        </nav>
        {updatedAt && (
          <p className="mt-3 text-xs text-muted">
            Prix en euros (France) relevés le{" "}
            {new Intl.DateTimeFormat("fr-FR", { dateStyle: "long", timeStyle: "short", timeZone: "Europe/Paris" }).format(new Date(updatedAt))} ;
            vérifie le prix sur la boutique avant d&apos;acheter.
          </p>
        )}
      </header>

      {STORES.map((s) => (
        <section key={s.key} id={s.id} aria-labelledby={`${s.id}-title`} className="scroll-mt-24">
          <h2 id={`${s.id}-title`} className="text-xl font-bold text-heading">{s.title}</h2>
          {deals[s.key].length ? (
            <div className="mt-4 grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
              {deals[s.key].map((d) => (
                <DealCard key={d.id} deal={d} />
              ))}
            </div>
          ) : (
            <p className="mt-3 text-muted">{s.empty}</p>
          )}
        </section>
      ))}

      {consoles.length > 0 && (
        <section aria-labelledby="consoles-promos-title">
          <h2 id="consoles-promos-title" className="text-xl font-bold text-heading">Bons plans repérés par la presse</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
            {consoles.map((a) => (
              <NewsCard key={a.slug} article={a} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
