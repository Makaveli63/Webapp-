import type { Metadata } from "next";
import { DealCard } from "@/components/deals/DealCard";
import { NewsCard } from "@/components/news/NewsCard";
import { getDeals, promoArticles } from "@/lib/deals";
import { getGamingArticles } from "@/lib/news";

export const metadata: Metadata = {
  title: "Promos jeux vidéo",
  description: "Les meilleures réductions du moment : Steam, PlayStation Store, eShop Nintendo et Xbox.",
};

export default async function PromosPage() {
  const { steam, updatedAt } = getDeals();
  const consoles = promoArticles(await getGamingArticles()).slice(0, 9);
  return (
    <div className="space-y-10">
      <header>
        <h1 className="text-2xl font-extrabold text-heading sm:text-3xl">Promos du moment</h1>
        <p className="mt-2 text-muted">
          Les plus grosses réductions sur PC et les bons plans consoles repérés par la presse. Ajoute « Je le veux » sur un jeu pour
          retrouver ses promos dans Ma collection.
        </p>
      </header>

      <section aria-labelledby="steam-title">
        <h2 id="steam-title" className="text-xl font-bold text-heading">Sur PC (Steam)</h2>
        {steam.length ? (
          <div className="mt-4 grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
            {steam.map((d) => (
              <DealCard key={d.id} deal={d} />
            ))}
          </div>
        ) : (
          <p className="mt-3 text-muted">Les promos Steam sont momentanément indisponibles : réessaie dans quelques heures.</p>
        )}
        {updatedAt && (
          <p className="mt-3 text-xs text-muted">
            Prix en euros relevés le{" "}
            {new Intl.DateTimeFormat("fr-FR", { dateStyle: "long", timeStyle: "short", timeZone: "Europe/Paris" }).format(new Date(updatedAt))} ;
            vérifie le prix sur la boutique avant d&apos;acheter.
          </p>
        )}
      </section>

      <section aria-labelledby="consoles-promos-title">
        <h2 id="consoles-promos-title" className="text-xl font-bold text-heading">Sur consoles</h2>
        <p className="mt-1 text-sm text-muted">PlayStation Store, eShop Nintendo, Xbox : les promotions annoncées par les sites d&apos;actu.</p>
        {consoles.length ? (
          <div className="mt-4 grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
            {consoles.map((a) => (
              <NewsCard key={a.slug} article={a} />
            ))}
          </div>
        ) : (
          <p className="mt-3 text-muted">Aucune promo console annoncée en ce moment.</p>
        )}
      </section>
    </div>
  );
}
