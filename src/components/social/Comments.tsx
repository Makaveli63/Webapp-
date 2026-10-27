"use client";

import { Flag, MessageCircle } from "lucide-react";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { rpc, savedPseudo, savePseudo, socialEnabled, timeAgo, voterId } from "@/lib/social";
import { LikeButton } from "./LikeButton";

interface Comment {
  id: string;
  author: string;
  body: string;
  created_at: string;
  likes: number;
  liked: boolean;
}

/** Espace commentaires : pseudo sans compte, filtre anti-insultes côté serveur, j'aime et signalement. */
export function Comments({ slug }: { slug: string }) {
  const [comments, setComments] = useState<Comment[] | null>(null);
  const [pseudo, setPseudo] = useState("");
  const [body, setBody] = useState("");
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const [reported, setReported] = useState<Set<string>>(new Set());

  const load = useCallback(() => {
    rpc<Comment[]>("get_comments", { p_slug: slug, p_voter: voterId() })
      .then(setComments)
      .catch(() => setComments([]));
  }, [slug]);

  useEffect(() => {
    if (!socialEnabled) return;
    setPseudo(savedPseudo());
    load();
  }, [load]);

  if (!socialEnabled) return null;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setSending(true);
    try {
      await rpc<string>("add_comment", { p_slug: slug, p_author: pseudo.trim(), p_body: body.trim(), p_voter: voterId() });
      savePseudo(pseudo.trim());
      setBody("");
      load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSending(false);
    }
  };

  const report = async (id: string) => {
    if (!confirm("Signaler ce commentaire comme abusif ?")) return;
    await rpc("report_comment", { p_id: id, p_voter: voterId() }).catch(() => {});
    setReported((r) => new Set(r).add(id));
  };

  return (
    <section aria-labelledby="comments-title" className="mt-12 border-t border-border pt-8">
      <h2 id="comments-title" className="flex items-center gap-2 text-lg font-bold text-heading">
        <MessageCircle className="size-5 text-accent" aria-hidden /> Commentaires {comments && comments.length > 0 && `(${comments.length})`}
      </h2>

      <form onSubmit={submit} className="mt-4 space-y-2 rounded-xl border border-border bg-surface p-3">
        <input
          value={pseudo}
          onChange={(e) => setPseudo(e.target.value)}
          placeholder="Ton pseudo"
          maxLength={30}
          required
          minLength={2}
          aria-label="Pseudo"
          className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-base focus:border-accent focus:outline-none md:text-sm"
        />
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Ton avis sur l'actu…"
          maxLength={1000}
          required
          minLength={2}
          rows={3}
          aria-label="Commentaire"
          className="w-full resize-y rounded-lg border border-border bg-bg px-3 py-2 text-base focus:border-accent focus:outline-none md:text-sm"
        />
        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs text-muted">Respectueux : insultes et propos haineux sont bloqués automatiquement.</p>
          <button
            type="submit"
            disabled={sending}
            className="shrink-0 rounded-full bg-accent px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
          >
            {sending ? "Envoi…" : "Publier"}
          </button>
        </div>
      </form>

      {comments === null ? (
        <p className="mt-4 text-sm text-muted">Chargement des commentaires…</p>
      ) : comments.length === 0 ? (
        <p className="mt-4 text-sm text-muted">Aucun commentaire pour l&apos;instant. Lance la discussion !</p>
      ) : (
        <ul className="mt-4 divide-y divide-border">
          {comments.map((c) => (
            <li key={c.id} className="flex gap-3 py-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-accent/15 font-bold uppercase text-accent">
                {c.author.slice(0, 1)}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm">
                  <span className="font-semibold text-heading">{c.author}</span>{" "}
                  <span className="text-muted">· {timeAgo(c.created_at)}</span>
                </p>
                <p className="mt-0.5 whitespace-pre-line break-words text-sm text-fg">{c.body}</p>
                <div className="-ml-2 mt-1 flex items-center gap-2">
                  <LikeButton type="comment" id={c.id} initial={{ likes: Number(c.likes), liked: c.liked }} />
                  <button
                    type="button"
                    onClick={() => report(c.id)}
                    disabled={reported.has(c.id)}
                    className="inline-flex items-center gap-1 text-xs text-muted hover:text-red-600 disabled:opacity-60"
                  >
                    <Flag className="size-3.5" aria-hidden /> {reported.has(c.id) ? "Signalé" : "Signaler"}
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
