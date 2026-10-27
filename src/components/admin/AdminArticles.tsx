"use client";

import { PenLine, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { ADMIN_ERRORS, rpc } from "@/lib/social";

interface Row {
  id: string;
  title: string;
  category: string;
  created_at: string;
}

const PLATFORMS = ["PS5", "Switch 2", "Xbox", "PC", "Mobile"];

/** Écrire ses propres articles : publiés sur le site à la mise à jour suivante (moins de 2 h). */
export function AdminArticles({ password }: { password: string }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("Actu");
  const [platforms, setPlatforms] = useState<string[]>([]);
  const [score, setScore] = useState("");
  const [image, setImage] = useState("");
  const [body, setBody] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    rpc<Row[]>("get_published_articles", {})
      .then((r) => setRows(Array.isArray(r) ? r : []))
      .catch(() => setRows([]));
  }, []);
  useEffect(load, [load]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const res = await rpc<string>("admin_publish_article", {
        p_password: password,
        p_title: title,
        p_category: category,
        p_platforms: platforms,
        p_score: category === "Test" ? score : "",
        p_image: image,
        p_body: body,
      });
      if (res === "ok") {
        setTitle("");
        setBody("");
        setScore("");
        setImage("");
        setMessage("Article enregistré ✅ Il apparaîtra sur le site à la prochaine mise à jour (moins de 2 h).");
        load();
      } else {
        setMessage(
          ADMIN_ERRORS[res] ??
            (res === "ARTICLE_INVALIDE" ? "Article refusé : titre de 5 caractères minimum, texte de 20 minimum, image en https://, note du type 16/20." : "Publication impossible."),
        );
      }
    } catch (err) {
      setMessage((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: string) => {
    if (!confirm("Supprimer cet article ? Il disparaîtra du site à la prochaine mise à jour.")) return;
    const res = await rpc<string>("admin_delete_article", { p_password: password, p_id: id }).catch(() => "erreur");
    if (res !== "ok") setMessage(ADMIN_ERRORS[res] ?? "Suppression impossible.");
    load();
  };

  const field = "w-full rounded-lg border border-border bg-bg px-3 py-2 text-base focus:border-accent focus:outline-none md:text-sm";
  return (
    <section className="glass rounded-xl p-4">
      <h2 className="flex items-center gap-2 font-semibold text-heading">
        <PenLine className="size-4 text-accent" aria-hidden /> Écrire un article
      </h2>
      <p className="mt-1 text-xs text-muted">
        Mise en forme simple : **gras**, *italique*, ## Titre, - liste, [lien](https://…). Publication sur le site sous 2 h.
      </p>
      <form onSubmit={submit} className="mt-3 space-y-3">
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Titre" required minLength={5} maxLength={200} className={field} aria-label="Titre" />
        <div className="flex flex-wrap gap-2">
          {["Actu", "Test", "Console"].map((c) => (
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
      {message && <p className="mt-3 text-sm text-fg">{message}</p>}
      {rows.length > 0 && (
        <ul className="mt-4 divide-y divide-border">
          {rows.map((r) => (
            <li key={r.id} className="flex items-center justify-between gap-3 py-2 text-sm">
              <span className="min-w-0 truncate">
                <span className="font-semibold text-heading">{r.title}</span>{" "}
                <span className="text-muted">· {r.category} · {new Date(r.created_at).toLocaleDateString("fr-FR")}</span>
              </span>
              <button type="button" onClick={() => remove(r.id)} aria-label={`Supprimer ${r.title}`} className="shrink-0 rounded-full p-2 text-muted hover:text-red-600">
                <Trash2 className="size-4" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
