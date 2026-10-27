import type { Metadata } from "next";
import { getGlossary, renderMarkdown } from "@/lib/content";

export const metadata: Metadata = { title: "Glossaire technique" };

export default function GlossaryPage() {
  const terms = getGlossary();
  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-3xl font-extrabold text-white">Glossaire technique</h1>
      <p className="mt-2 text-muted">Les notions clés de la sécurité des consoles, expliquées simplement.</p>
      <nav aria-label="Index du glossaire" className="mt-6 flex flex-wrap gap-2">
        {terms.map((t) => (
          <a key={t.slug} href={`#${t.slug}`} className="rounded-md px-2 py-1 text-xs text-muted ring-1 ring-border hover:text-fg">{t.term}</a>
        ))}
      </nav>
      <dl className="mt-8 space-y-4">
        {terms.map((t) => (
          <div key={t.slug} id={t.slug} className="scroll-mt-24 rounded-xl border border-border bg-surface p-5">
            <dt className="text-lg font-semibold text-white">{t.term}</dt>
            <dd className="mt-1 text-sm text-accent-2">{t.short}</dd>
            <dd className="prose-article mt-3 text-sm" dangerouslySetInnerHTML={{ __html: renderMarkdown(t.content) }} />
          </div>
        ))}
      </dl>
    </div>
  );
}
