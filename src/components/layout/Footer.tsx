import { Gamepad2 } from "lucide-react";
import Link from "next/link";

const SECTIONS = [
  {
    title: "Rubriques",
    links: [
      { href: "/actualites", label: "Actualités" },
      { href: "/scene", label: "Scène & Jailbreak" },
      { href: "/scene/glossaire", label: "Glossaire technique" },
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
      { href: "/mentions-legales#homebrew", label: "Homebrew vs piratage" },
      { href: "/mentions-legales#confidentialite", label: "Confidentialité" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="mt-20 border-t border-border bg-surface/50">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <Link href="/" className="flex items-center gap-2 font-bold">
            <Gamepad2 className="size-5 text-accent" aria-hidden />
            Pixel<span className="-ml-2 text-accent-2">Underground</span>
          </Link>
          <p className="mt-3 text-sm text-muted">
            L&apos;actualité du jeu vidéo et le suivi pédagogique de la scène homebrew, en français.
          </p>
        </div>
        {SECTIONS.map((s) => (
          <div key={s.title}>
            <h2 className="text-sm font-semibold text-white">{s.title}</h2>
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
        © {new Date().getFullYear()} Pixel Underground — Aucun fichier protégé n&apos;est hébergé ni
        référencé. Les marques citées appartiennent à leurs propriétaires respectifs.
      </div>
    </footer>
  );
}
