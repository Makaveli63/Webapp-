import type { Metadata } from "next";

export const metadata: Metadata = { title: "Mentions légales" };

export default function LegalPage() {
  return (
    <article className="prose-article mx-auto max-w-2xl">
      <h1 className="text-2xl font-extrabold text-heading sm:text-3xl">Mentions légales</h1>

      <h2>Éditeur</h2>
      <p>
        Site édité par <strong>Makaveli63</strong>. Hébergement : GitHub Pages (GitHub, Inc., 88 Colin P. Kelly Jr.
        Street, San Francisco, CA 94107, États-Unis).
      </p>

      <h2 id="sources">Sources et résumés</h2>
      <p>
        Les actualités proviennent des flux RSS publics de la presse jeu vidéo francophone et restent la propriété de
        leurs éditeurs. Aucun article n&apos;est reproduit : chaque actualité fait l&apos;objet d&apos;un résumé
        original rédigé automatiquement par intelligence artificielle à partir du titre et du chapô diffusés par
        l&apos;éditeur dans son flux (ou, à défaut, d&apos;un court extrait de ce flux), avec la mention systématique de
        la source et un lien vers l&apos;article original. Les résumés automatiques peuvent contenir des imprécisions :
        l&apos;article original fait foi.
      </p>
      <p>Un éditeur qui souhaite le retrait de ses contenus peut nous contacter.</p>

      <h2 id="confidentialite">Confidentialité</h2>
      <p>Ce site ne dépose aucun cookie et n&apos;utilise aucun outil de suivi. [À compléter selon votre hébergement.]</p>
    </article>
  );
}
