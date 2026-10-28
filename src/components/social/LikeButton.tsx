"use client";

import { Heart } from "lucide-react";
import { useEffect, useState } from "react";
import { emitReaction, onReaction, rpc, socialEnabled, voterId } from "@/lib/social";

interface Props {
  type: "article" | "comment";
  id: string;
  /** Valeurs déjà connues (liste de commentaires) ; sinon chargées pour un article */
  initial?: { likes: number; liked: boolean };
  className?: string;
}

/** Cœur « j'aime » façon X : animation, compteur, mise à jour immédiate puis confirmée par le serveur. */
export function LikeButton({ type, id, initial, className = "" }: Props) {
  const [state, setState] = useState(initial ?? { likes: 0, liked: false });
  const [pop, setPop] = useState(false);

  useEffect(() => {
    if (initial || !socialEnabled || type !== "article") return;
    rpc<{ likes: number; liked: boolean }[]>("get_article_likes", { p_slugs: [id], p_voter: voterId() })
      .then((rows) => rows[0] && setState({ likes: Number(rows[0].likes), liked: rows[0].liked }))
      .catch(() => {});
  }, [id, type, initial]);
  // « Je n'aime pas » choisi sur le même contenu : le j'aime est retiré (le serveur fait de même).
  useEffect(
    () =>
      onReaction((r) => {
        if (r.kind === "dislike" && r.type === type && r.id === id) setState((s) => (s.liked ? { liked: false, likes: Math.max(0, s.likes - 1) } : s));
      }),
    [id, type],
  );

  if (!socialEnabled) return null;

  const toggle = async () => {
    const previous = state;
    const liked = !state.liked;
    setState({ liked, likes: Math.max(0, state.likes + (liked ? 1 : -1)) });
    if (liked) {
      emitReaction({ type, id, kind: "like" });
      setPop(true);
      setTimeout(() => setPop(false), 400);
    }
    try {
      const likes = await rpc<number>("toggle_like", { p_type: type, p_target: id, p_voter: voterId() });
      setState({ liked, likes: Number(likes) });
    } catch {
      setState(previous);
    }
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={state.liked}
      aria-label={state.liked ? "Je n'aime plus" : "J'aime"}
      className={`group inline-flex items-center gap-1.5 rounded-full transition-colors ${state.liked ? "text-pink-600 dark:text-pink-400" : "text-muted hover:text-pink-600"} ${className}`}
    >
      <span className="relative flex size-8 items-center justify-center rounded-full group-hover:bg-pink-500/10">
        <Heart className={`size-[18px] ${pop ? "like-pop" : ""}`} fill={state.liked ? "currentColor" : "none"} aria-hidden />
      </span>
      <span className="text-sm tabular-nums">{state.likes > 0 ? state.likes : ""}</span>
    </button>
  );
}
