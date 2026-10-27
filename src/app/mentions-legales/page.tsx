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
      <p>
        Images : les visuels des actualités sont ceux que chaque média diffuse avec l&apos;article dans son flux RSS ;
        ils sont affichés depuis le site du média (sans copie sur ce site) et crédités. Les visuels des jeux
        proviennent des boutiques et bases de données publiques (Epic Games, Steam, GamerPower, RAWG) ou des pages
        officielles des éditeurs. Les marques et visuels appartiennent à leurs propriétaires respectifs.
      </p>
      <p>Un éditeur ou un ayant droit qui souhaite le retrait d&apos;un contenu ou d&apos;une image peut nous contacter : il sera retiré sans délai.</p>
      <p>
        Jeux gratuits : données publiques de l&apos;Epic Games Store et de{" "}
        <a href="https://www.gamerpower.com" target="_blank" rel="noopener noreferrer">GamerPower</a>. Les offres
        peuvent changer à tout moment : vérifiez toujours sur la boutique avant de récupérer un jeu.
      </p>

      <h2 id="commentaires">Commentaires</h2>
      <p>
        Les commentaires sont publiés sous la responsabilité de leurs auteurs. Les insultes, propos racistes, haineux ou
        discriminatoires et les liens sont refusés automatiquement ; un commentaire signalé par plusieurs lecteurs est
        masqué. L&apos;adresse IP n&apos;est jamais conservée en clair : seule une empreinte chiffrée sert à limiter le
        spam.
      </p>

      <h2 id="confidentialite">Confidentialité</h2>
      <p>
        Ce site ne dépose aucun cookie et n&apos;utilise aucun outil de suivi. Vos favoris, votre thème, votre pseudo et
        les sujets consultés (pour colorer le fond d&apos;écran) restent enregistrés uniquement sur votre appareil.
      </p>
    </article>
  );
}
