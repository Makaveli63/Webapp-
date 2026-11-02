"use client";

import { PenLine, Trash2 } from "lucide-react";
import { useState, type FormEvent, type ReactNode } from "react";

export interface ArticleRow {
  id: string;
  title: string;
  category: string;
  author?: string | null;
  created_at: string;
}

export interface ArticleFields {
  title: string;
  category: string;
  platforms: string[];
  score: string;
  image: string;
  body: string;
}

const PLATFORMS = ["PS5", "Switch 2", "Xbox", "PC", "Mobile"];
const CATEGORIES = ["Actu", "Test", "Console"];
const field = "w-full rounded-lg border border-border bg-bg px-3 py-2 text-base focus:border-accent focus:outline-none md:text-sm";

/**
 * Formulaire d'article (tableau de bord admin et page Rédaction). `publish` renvoie « ok » ou un message
 * d'erreur lisible ; les articles sont publiés sur le site à la mise à jour suivante (moins d'une heure).
 */
export function ArticleEditor({
  title: heading = "Écrire un article",
  intro,
  rows,
  publish,
  remove,
}: {
  title?: string;
  intro?: ReactNode;
  rows: ArticleRow[];
  publish: (fields: ArticleFields) => Promise<string>;
  remove: (row: ArticleRow) => Promise<void>;
}) {
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("Actu");
  const [platforms, setPlatforms] = useState<string[]>([]);
  const [score, setScore] = useState("");
  const [image, setImage] = useState("");
  const [body, setBody] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const res = await publish({ title, category, platforms, score: category === "Test" ? score : "", image, body });
      if (res === "ok") {
        setTitle("");
        setBody("");
        setScore("");
        setImage("");
        setMessage("Article enregistré ✅ Il apparaîtra sur le site à la prochaine mise à jour (moins d’une heure).");
      } else {
        setMessage(res);
      }
    } catch (err) {
      setMessage((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const del = async (row: ArticleRow) => {
    if (!confirm(`Supprimer « ${row.title} » ? Il disparaîtra du site à la prochaine mise à jour.`)) return;
    await remove(row);
  };

  return (
    <section className="glass rounded-xl p-4">
      <h2 className="flex items-center gap-2 font-semibold text-heading">
        <PenLine className="size-4 text-accent" aria-hidden /> {heading}
      </h2>
      <p className="mt-1 text-xs text-muted">
        {intro ?? "Mise en forme simple : **gras**, *italique*, ## Titre, - liste, [lien](https://…). En ligne à la prochaine mise à jour (moins d’une heure)."}
      </p>
      <form onSubmit={submit} className="mt-3 space-y-3">
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Titre" required minLength={5} maxLength={200} className={field} aria-label="Titre" />
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((c) => (
            <button key={c} type="button" aria-pressed={category === c} onClick={() => setCategory(c)} className={`rounded-full px-3 py-1.5 text-sm ring-1 ring-inset ${category === c ? "bg-accent text-white ring-accent" : "text-muted ring-border"}`}>
              {c}
            </button>
          ))}
          <span className="mx-1 w-px bg-border" aria-hidden />
          {PLATFORMS.map((p) => (
            <button
              key={p}
              type="button"
              aria-pressed={platforms.includes(p)}
              onClick={() => setPlatforms((l) => (l.includes(p) ? l.filter((x) => x !== p) : [...l, p]))}
              className={`rounded-full px-3 py-1.5 text-sm ring-1 ring-inset ${platforms.includes(p) ? "bg-accent text-white ring-accent" : "text-muted ring-border"}`}
            >
              {p}
            </button>
          ))}
        </div>
        {category === "Test" && (
          <input value={score} onChange={(e) => setScore(e.target.value)} placeholder="Note (ex. 16/20)" pattern="\d{1,2}([,.]\d)?/(5|10|20|100)" className={field} aria-label="Note" />
        )}
        <input value={image} onChange={(e) => setImage(e.target.value)} placeholder="Image (lien https://…, facultatif)" type="url" className={field} aria-label="Image" />
        <textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Ton article…" required minLength={20} rows={8} className={`${field} resize-y`} aria-label="Texte" />
        <button type="submit" disabled={busy} className="rounded-full bg-accent px-5 py-2 text-sm font-semibold text-white disabled:opacity-50">
          {busy ? "Enregistrement…" : "Publier"}
        </button>
      </form>
      {message && (
        <p role="status" className="mt-3 text-sm text-fg">
          {message}
        </p>
      )}
      {rows.length > 0 && (
        <ul className="mt-4 divide-y divide-border">
          {rows.map((r) => (
            <li key={r.id} className="flex items-center justify-between gap-3 py-2 text-sm">
              <span className="min-w-0 truncate">
                <span className="font-semibold text-heading">{r.title}</span>{" "}
                <span className="text-muted">
                  · {r.category}
                  {r.author ? ` · ${r.author}` : ""} · {new Date(r.created_at).toLocaleDateString("fr-FR")}
                </span>
              </span>
              <button type="button" onClick={() => del(r)} aria-label={`Supprimer ${r.title}`} className="shrink-0 rounded-full p-2 text-muted hover:text-red-600">
                <Trash2 className="size-4" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export const articleError = (res: string, errors: Record<string, string>) =>
  errors[res] ?? (res === "ARTICLE_INVALIDE" ? "Article refusé : titre de 5 caractères minimum, texte de 20 minimum, image en https://, note du type 16/20." : "Publication impossible.");
