"use client";

import { ThumbsDown } from "lucide-react";
import { useEffect, useState } from "react";
import { emitReaction, onReaction, rpc, socialEnabled, voterId } from "@/lib/social";

type Row = { id: string; dislikes: number; disliked: boolean };
type Type = "article" | "comment";

// Tous les boutons affichés en même temps (liste de commentaires) : une seule requête par type de contenu.
const queues = new Map<Type, { ids: Set<string>; result: Promise<Map<string, Row>> }>();
function loadDislikes(type: Type, id: string): Promise<Row | undefined> {
  let queue = queues.get(type);
  if (!queue) {
    const ids = new Set<string>();
    const result = new Promise<Map<string, Row>>((resolve, reject) =>
      setTimeout(() => {
        queues.delete(type);
        rpc<Row[]>("get_dislikes", { p_type: type, p_ids: [...ids], p_voter: voterId() })
          .then((rows) => resolve(new Map(rows.map((r) => [r.id, { ...r, dislikes: Number(r.dislikes) }]))))
          .catch(reject);
      }, 0),
    );
    queue = { ids, result };
    queues.set(type, queue);
  }
  queue.ids.add(id);
  return queue.result.then((m) => m.get(id));
}

/** Pouce « je n'aime pas » à côté du cœur ; masqué tant que le service n'est pas installé (supabase/dislikes.sql). */
export function DislikeButton({ type, id, className = "" }: { type: Type; id: string; className?: string }) {
  const [state, setState] = useState<{ dislikes: number; disliked: boolean } | null>(null);
  const [pop, setPop] = useState(false);

  useEffect(() => {
    if (!socialEnabled) return;
    let alive = true;
    loadDislikes(type, id)
      .then((row) => alive && setState({ dislikes: row?.dislikes ?? 0, disliked: row?.disliked ?? false }))
      .catch(() => alive && setState(null)); // service absent : pas de bouton
    return () => {
      alive = false;
    };
  }, [type, id]);
  // J'aime choisi sur le même contenu : le je n'aime pas est retiré (le serveur fait de même).
  useEffect(
    () =>
      onReaction((r) => {
        if (r.kind === "like" && r.type === type && r.id === id)
          setState((s) => (s?.disliked ? { disliked: false, dislikes: Math.max(0, s.dislikes - 1) } : s));
      }),
    [id, type],
  );

  if (!state) return null;

  const toggle = async () => {
    const previous = state;
    const disliked = !state.disliked;
    setState({ disliked, dislikes: Math.max(0, state.dislikes + (disliked ? 1 : -1)) });
    if (disliked) {
      emitReaction({ type, id, kind: "dislike" });
      setPop(true);
      setTimeout(() => setPop(false), 400);
    }
    try {
      const dislikes = await rpc<number>("toggle_dislike", { p_type: type, p_target: id, p_voter: voterId() });
      setState({ disliked, dislikes: Number(dislikes) });
    } catch {
      setState(previous);
    }
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={state.disliked}
      aria-label={state.disliked ? "Retirer « je n'aime pas »" : "Je n'aime pas"}
      className={`group inline-flex items-center gap-1.5 rounded-full transition-colors ${state.disliked ? "text-heading" : "text-muted hover:text-heading"} ${state.dislikes > 0 ? "pr-3" : ""} ${className}`}
    >
      <span className="relative flex size-8 items-center justify-center rounded-full group-hover:bg-surface-2">
        <ThumbsDown className={`size-[17px] ${pop ? "like-pop" : ""}`} fill={state.disliked ? "currentColor" : "none"} aria-hidden />
      </span>
      {state.dislikes > 0 && <span className="text-sm tabular-nums">{state.dislikes}</span>}
    </button>
  );
}
