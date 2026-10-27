import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { LegalNotice } from "@/components/ui/LegalNotice";
import { getGuide, getGuides, renderMarkdown } from "@/lib/content";
import { formatDate } from "@/lib/format";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return getGuides().map((g) => ({ slug: g.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const guide = getGuide((await params).slug);
  return guide ? { title: guide.title, description: guide.description } : {};
}

export default async function GuidePage({ params }: Props) {
  const guide = getGuide((await params).slug);
  if (!guide) notFound();

  return (
    <article className="mx-auto max-w-2xl">
      <Link href="/scene" className="inline-flex items-center gap-1 text-sm text-muted hover:text-fg">
        <ArrowLeft className="size-4" aria-hidden /> Retour à la scène
      </Link>
      <p className="mt-6 text-xs uppercase tracking-wider text-accent-2">{guide.console} · {guide.level}</p>
      <h1 className="mt-2 text-3xl font-extrabold text-white">{guide.title}</h1>
      <p className="mt-3 text-lg text-muted">{guide.description}</p>
      <p className="mt-3 text-sm text-muted">Mis à jour le {formatDate(guide.updatedAt)}</p>
      <div className="mt-6"><LegalNotice compact /></div>
      <div className="prose-article mt-8" dangerouslySetInnerHTML={{ __html: renderMarkdown(guide.content) }} />
    </article>
  );
}
