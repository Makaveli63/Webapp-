import type { Metadata } from "next";

export const metadata: Metadata = { title: "Mentions légales" };

export default function LegalPage() {
  return (
    <article className="prose-article mx-auto max-w-2xl">
      <h1 className="text-3xl font-extrabold text-white">Mentions légales</h1>

      <h2>Éditeur</h2>
      <p>[À compléter : nom, adresse, contact, directeur de la publication, hébergeur.]</p>

      <h2 id="homebrew">Homebrew, recherche en sécurité et piratage</h2>
      <p>
        La section « Scène & Jailbreak » a une vocation <strong>informative et pédagogique</strong>. Elle explique le
        fonctionnement des protections des consoles et suit l&apos;actualité de la recherche en sécurité.
      </p>
      <ul>
        <li>Le <strong>homebrew</strong> désigne des logiciels créés par des amateurs (outils, émulateurs, créations originales).</li>
        <li>La <strong>recherche en sécurité</strong> vise à identifier des failles, idéalement via une divulgation responsable auprès du constructeur.</li>
        <li>Le <strong>piratage</strong> — utiliser ou diffuser des jeux sans les avoir achetés — est illégal et n&apos;est en aucun cas encouragé ici.</li>
      </ul>
      <p>
        Le contournement de mesures techniques de protection est encadré par la loi (en France, notamment par le Code de la
        propriété intellectuelle). Modifier sa console entraîne généralement la perte de garantie et peut conduire au
        bannissement des services en ligne. Ce site n&apos;héberge et ne référence <strong>aucun fichier protégé</strong>,
        clé, firmware ou logiciel de contournement.
      </p>

      <h2 id="confidentialite">Confidentialité</h2>
      <p>Ce site ne dépose aucun cookie de suivi. [À compléter selon votre hébergement et vos outils d&apos;analyse.]</p>

      <h2>Contenus tiers</h2>
      <p>Les actualités issues de flux RSS restent la propriété de leurs éditeurs. Aucun article n&apos;est reproduit : chaque actualité fait l&apos;objet d&apos;un résumé original rédigé automatiquement par intelligence artificielle à partir du titre et du chapô diffusés par l&apos;éditeur dans son flux RSS (ou, à défaut, d&apos;un court extrait de ce flux), avec la mention systématique de la source et un lien vers l&apos;article original. Un éditeur qui souhaite le retrait de ses contenus peut nous contacter.</p>
    </article>
  );
}
