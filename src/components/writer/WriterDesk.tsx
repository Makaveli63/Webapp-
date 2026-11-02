"use client";

import { Feather } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { articleError, ArticleEditor, type ArticleFields, type ArticleRow } from "@/components/admin/ArticleEditor";
import { RoleBadge } from "@/components/player/RoleBadge";
import { readPlayer, restorePlayer } from "@/lib/player";
import { rpc, socialEnabled, voterId } from "@/lib/social";

const ERRORS: Record<string, string> = {
  ACCES_REFUSE: "Ton accès Rédaction a été retiré par l'admin.",
  TROP_DE_REQUETES: "10 articles par jour au maximum : réessaie demain.",
  PROPOS_INTERDITS: "Article refusé : les insultes et propos haineux ne sont pas acceptés.",
};

type State = { kind: "loading" } | { kind: "off"; why: string } | { kind: "ok"; pseudo: string; rows: ArticleRow[] };

/**
 * Page Rédaction : un joueur autorisé par l'admin (tableau de bord → Joueurs inscrits → « Rédaction »)
 * publie des articles sans le mot de passe admin. Le serveur reconnaît son appareil (community.sql).
 */
export function WriterDesk() {
  const [state, setState] = useState<State>({ kind: "loading" });

  const load = useCallback(async () => {
    if (!socialEnabled) return setState({ kind: "off", why: "La rédaction n'est pas disponible sur cette version du site." });
    type Mine = { error?: string; pseudo?: string; articles?: ArticleRow[] };
    const r = await rpc<Mine>("writer_my_articles", { p_voter: voterId() }).catch((e: Error): Mine => ({ error: e.message }));
    if (r.error || !r.pseudo) {
      const why =
        r.error === "ACCES_REFUSE"
          ? readPlayer().pseudo
            ? "Cet espace est réservé aux rédacteurs. Demande l'accès à l'admin : il l'active sur ton pseudo depuis son tableau de bord."
            : "Crée d'abord ton profil de joueur dans Mon espace, puis demande l'accès Rédaction à l'admin."
          : (r.error ?? "Service indisponible.");
      return setState({ kind: "off", why });
    }
    setState({ kind: "ok", pseudo: r.pseudo, rows: (r.articles ?? []).map((a) => ({ ...a, author: null })) });
  }, []);

  useEffect(() => {
    void load();
    void restorePlayer(); // met à jour le raccourci de Mon espace si l'accès a changé
  }, [load]);

  if (state.kind === "loading") return <div className="glass h-64 rounded-2xl" aria-hidden />;
  if (state.kind === "off")
    return (
      <div className="glass rounded-2xl p-6 text-center">
        <Feather className="mx-auto size-8 text-muted" aria-hidden />
        <p className="mt-3 text-fg">{state.why}</p>
        <Link href="/favoris" className="mt-4 inline-block rounded-full bg-accent px-5 py-2 text-sm font-semibold text-white">
          Mon espace
        </Link>
      </div>
    );

  const publish = async (f: ArticleFields) => {
    const res = await rpc<string>("writer_publish_article", {
      p_voter: voterId(),
      p_title: f.title,
      p_category: f.category,
      p_platforms: f.platforms,
      p_score: f.score,
      p_image: f.image,
      p_body: f.body,
    });
    if (res === "ok") void load();
    return res === "ok" ? "ok" : articleError(res, ERRORS);
  };

  const remove = async (row: ArticleRow) => {
    const res = await rpc<string>("writer_delete_article", { p_voter: voterId(), p_id: row.id }).catch(() => "erreur");
    if (res !== "ok") alert(ERRORS[res] ?? "Suppression impossible.");
    void load();
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted">
        Connecté en tant que <span className="font-semibold text-heading">{state.pseudo}</span> <RoleBadge pseudo={state.pseudo} role={readPlayer().role} />. Tes articles sont signés de ton pseudo ; l&apos;admin
        est prévenu à chaque publication et peut les retirer.
      </p>
      <ArticleEditor title="Nouvel article" rows={state.rows} publish={publish} remove={remove} />
    </div>
  );
}
