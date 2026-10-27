import { Gamepad2 } from "lucide-react";
import Link from "next/link";

const SECTIONS = [
  {
    title: "Rubriques",
    links: [
      { href: "/actualites", label: "Actualités" },
      { href: "/tests", label: "Tests" },
      { href: "/consoles", label: "Consoles & matériel" },
      { href: "/jeux-gratuits", label: "Jeux gratuits" },
      { href: "/sorties", label: "Sorties à venir" },
      { href: "/recherche", label: "Recherche" },
    ],
  },
  {
    title: "Plateformes",
    links: [
      { href: "/actualites?plateforme=PS5", label: "PS5" },
      { href: "/actualites?plateforme=Switch%202", label: "Switch 2" },
      { href: "/actualites?plateforme=PC", label: "PC" },
      { href: "/actualites?plateforme=Xbox", label: "Xbox" },
    ],
  },
  {
    title: "Informations",
    links: [
      { href: "/mentions-legales", label: "Mentions légales" },
      { href: "/mentions-legales#sources", label: "Sources et résumés" },
      { href: "/mentions-legales#confidentialite", label: "Confidentialité" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="mt-16 border-t border-border bg-surface/50 pb-[calc(3.5rem+env(safe-area-inset-bottom))] md:mt-20 md:pb-0">
      <div className="mx-auto grid max-w-6xl grid-cols-2 gap-8 px-4 py-10 sm:gap-10 sm:py-12 lg:grid-cols-4">
        <div className="col-span-2 lg:col-span-1">
          <Link href="/" className="flex items-center gap-2 font-bold text-heading">
            <Gamepad2 className="size-5 text-accent" aria-hidden />
            Gaming<span className="-ml-2 text-accent-2">Base</span>
          </Link>
          <p className="mt-3 text-sm text-muted">
            L&apos;actualité du jeu vidéo en français : news, tests et nouvelles consoles.
          </p>
          <p className="mt-2 text-sm text-muted">
            Site créé par <span className="font-semibold text-accent">Makaveli63</span>
          </p>
        </div>
        {SECTIONS.map((s) => (
          <div key={s.title}>
            <h2 className="text-sm font-semibold text-heading">{s.title}</h2>
            <ul className="mt-3 space-y-2 text-sm">
              {s.links.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="text-muted hover:text-fg">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-border py-6 text-center text-xs text-muted">
        <p className="mb-2">
          Actualités mises à jour automatiquement — dernière mise à jour le{" "}
          {new Intl.DateTimeFormat("fr-FR", { dateStyle: "long", timeStyle: "short", timeZone: "Europe/Paris" }).format(new Date())}.
        </p>
        © {new Date().getFullYear()} GamingBase par Makaveli63 — Les articles résumés restent la propriété de leurs
        éditeurs. Les marques citées appartiennent à leurs propriétaires respectifs.
      </div>
    </footer>
  );
}
