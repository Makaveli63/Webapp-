"use client";

import { Check, Send } from "lucide-react";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { readPlayer } from "@/lib/player";
import { rpc, savedPseudo, socialEnabled, timeAgo, voterId } from "@/lib/social";
import { STATUS_STYLES, SUGGESTION_KINDS, type Suggestion } from "@/lib/suggestions";

const ERRORS: Record<string, string> = {
  SUGGESTION_INVALIDE: "Ta suggestion doit faire entre 5 et 1 000 caractères.",
  PROPOS_INTERDITS: "Message refusé : les insultes et propos haineux ne sont pas acceptés.",
  TROP_DE_MESSAGES: "Doucement ! Tu as déjà envoyé plusieurs suggestions, réessaie un peu plus tard.",
};
const field = "w-full rounded-xl border border-border bg-bg px-3 py-2.5 text-base text-fg focus:border-accent focus:outline-none";
const PLACEHOLDERS: Record<string, string> = {
  Idée: "Une idée pour améliorer le site, une source à ajouter…",
  Bug: "Ce qui ne marche pas, sur quel appareil, et comment le reproduire…",
  Fonctionnalité: "La fonctionnalité que tu aimerais voir arriver…",
};

/** Formulaire de la page Suggestions (envoyé au tableau de bord) et suivi des demandes de cet appareil. */
export function SuggestionForm() {
  const [pseudo, setPseudo] = useState("");
  const [kind, setKind] = useState<string>("Idée");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const [mine, setMine] = useState<Suggestion[]>([]);

  const loadMine = useCallback(() => {
    rpc<Suggestion[]>("my_suggestions", { p_voter: voterId() })
      .then((r) => setMine(Array.isArray(r) ? r : []))
      .catch(() => {});
  }, []);
  // Pseudo du profil joueur (ou des commentaires) prérempli.
  useEffect(() => {
    setPseudo(readPlayer().pseudo || savedPseudo());
    if (socialEnabled) loadMine();
  }, [loadMine]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setSending(true);
    const res = await rpc<string>("add_suggestion", { p_pseudo: pseudo.trim() || null, p_body: body.trim(), p_kind: kind, p_voter: voterId() }).catch(
      (err) => (err as Error).message,
    );
    setSending(false);
    if (res !== "ok") return setError(ERRORS[res] ?? res);
    setBody("");
    setSent(true);
    loadMine();
  };

  if (!socialEnabled) return <p className="glass rounded-2xl p-5 text-sm text-muted">Les suggestions ne sont pas encore disponibles.</p>;
  return (
    <>
      {sent ? (
        <div className="glass rounded-2xl p-5 text-center">
          <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-emerald-600/15 text-emerald-600 dark:text-emerald-400">
            <Check className="size-6" aria-hidden />
          </span>
          <p className="mt-3 font-semibold text-heading">Merci, ta suggestion est bien arrivée !</p>
          <p className="mt-1 text-sm text-muted">Tu peux suivre son statut juste en dessous.</p>
          <button type="button" onClick={() => setSent(false)} className="mt-3 text-sm font-semibold text-accent hover:underline">
            Envoyer une autre suggestion
          </button>
        </div>
      ) : (
        <form onSubmit={submit} className="glass space-y-3 rounded-2xl p-4 sm:p-5">
          <div role="radiogroup" aria-label="Type de demande" className="flex gap-1 rounded-full bg-surface-2 p-1">
            {SUGGESTION_KINDS.map((k) => (
              <button
                key={k}
                type="button"
                role="radio"
                aria-checked={kind === k}
                onClick={() => setKind(k)}
                className={`flex-1 rounded-full px-3 py-1.5 text-sm font-semibold transition-colors ${kind === k ? "bg-[var(--surface)] text-heading shadow-sm" : "text-muted hover:text-fg"}`}
              >
                {k}
              </button>
            ))}
          </div>
          <label htmlFor="sugg-pseudo" className="block text-xs font-semibold uppercase tracking-wide text-muted">
            Pseudo <span className="normal-case tracking-normal">(facultatif)</span>
          </label>
          <input id="sugg-pseudo" value={pseudo} onChange={(e) => setPseudo(e.target.value)} maxLength={30} autoComplete="nickname" className={field} />
          <label htmlFor="sugg-body" className="block text-xs font-semibold uppercase tracking-wide text-muted">
            Ta demande
          </label>
          <textarea
            id="sugg-body"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={6}
            minLength={5}
            maxLength={1000}
            required
            placeholder={PLACEHOLDERS[kind]}
            className={`${field} resize-y`}
          />
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs text-muted tabular-nums">{body.length} / 1 000</span>
            <button
              type="submit"
              disabled={sending || body.trim().length < 5}
              className="inline-flex items-center gap-2 rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
            >
              <Send className="size-4" aria-hidden />
              {sending ? "Envoi…" : "Envoyer"}
            </button>
          </div>
          {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
        </form>
      )}

      {mine.length > 0 && (
        <section aria-labelledby="mine-title">
          <h2 id="mine-title" className="text-lg font-bold text-heading">
            Mes demandes
          </h2>
          <ul className="glass mt-2 divide-y divide-border rounded-2xl">
            {mine.map((s) => (
              <li key={s.id} className="flex items-start gap-3 px-4 py-3 text-sm">
                <span className="min-w-0 flex-1">
                  <span className="line-clamp-3 whitespace-pre-line break-words text-fg">{s.body}</span>
                  <span className="mt-0.5 block text-xs text-muted">
                    {s.kind} · envoyée {timeAgo(s.created_at)}
                    {s.updated_at !== s.created_at && s.status !== "En attente" ? ` · mise à jour ${timeAgo(s.updated_at)}` : ""}
                  </span>
                </span>
                <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${STATUS_STYLES[s.status] ?? STATUS_STYLES["En attente"]}`}>{s.status}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
