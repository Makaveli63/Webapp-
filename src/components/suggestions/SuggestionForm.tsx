"use client";

import { Check, Send } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { readPlayer } from "@/lib/player";
import { rpc, savedPseudo, socialEnabled } from "@/lib/social";

const ERRORS: Record<string, string> = {
  SUGGESTION_INVALIDE: "Ta suggestion doit faire entre 5 et 1 000 caractères.",
  PROPOS_INTERDITS: "Message refusé : les insultes et propos haineux ne sont pas acceptés.",
  TROP_DE_MESSAGES: "Doucement ! Tu as déjà envoyé plusieurs suggestions, réessaie un peu plus tard.",
};
const field = "w-full rounded-xl border border-border bg-bg px-3 py-2.5 text-base text-fg focus:border-accent focus:outline-none";

/** Formulaire de la page Suggestions : envoyé au tableau de bord (et en notification à l'admin). */
export function SuggestionForm() {
  const [pseudo, setPseudo] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  // Pseudo du profil joueur (ou des commentaires) prérempli.
  useEffect(() => setPseudo(readPlayer().pseudo || savedPseudo()), []);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setSending(true);
    const res = await rpc<string>("add_suggestion", { p_pseudo: pseudo.trim() || null, p_body: body.trim() }).catch((err) => (err as Error).message);
    setSending(false);
    if (res !== "ok") return setError(ERRORS[res] ?? res);
    setBody("");
    setSent(true);
  };

  if (!socialEnabled) return <p className="glass rounded-2xl p-5 text-sm text-muted">Les suggestions ne sont pas encore disponibles.</p>;
  if (sent)
    return (
      <div className="glass rounded-2xl p-5 text-center">
        <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-emerald-600/15 text-emerald-600 dark:text-emerald-400">
          <Check className="size-6" aria-hidden />
        </span>
        <p className="mt-3 font-semibold text-heading">Merci, ta suggestion est bien arrivée !</p>
        <button type="button" onClick={() => setSent(false)} className="mt-3 text-sm font-semibold text-accent hover:underline">
          Envoyer une autre suggestion
        </button>
      </div>
    );

  return (
    <form onSubmit={submit} className="glass space-y-3 rounded-2xl p-4 sm:p-5">
      <label htmlFor="sugg-pseudo" className="block text-xs font-semibold uppercase tracking-wide text-muted">
        Pseudo <span className="normal-case tracking-normal">(facultatif)</span>
      </label>
      <input id="sugg-pseudo" value={pseudo} onChange={(e) => setPseudo(e.target.value)} maxLength={30} autoComplete="nickname" className={field} />
      <label htmlFor="sugg-body" className="block text-xs font-semibold uppercase tracking-wide text-muted">
        Ta suggestion
      </label>
      <textarea
        id="sugg-body"
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={6}
        minLength={5}
        maxLength={1000}
        required
        placeholder="Une idée, une source à ajouter, un bug…"
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
  );
}
