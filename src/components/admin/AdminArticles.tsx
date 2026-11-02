"use client";

import { useCallback, useEffect, useState } from "react";
import { ADMIN_ERRORS, rpc } from "@/lib/social";
import { articleError, ArticleEditor, type ArticleFields, type ArticleRow } from "./ArticleEditor";

/** Écrire ses propres articles ; la liste montre aussi ceux des rédacteurs (supprimables ici). */
export function AdminArticles({ password }: { password: string }) {
  const [rows, setRows] = useState<ArticleRow[]>([]);

  const load = useCallback(() => {
    rpc<ArticleRow[]>("get_published_articles", {})
      .then((r) => setRows(Array.isArray(r) ? r : []))
      .catch(() => setRows([]));
  }, []);
  useEffect(load, [load]);

  const publish = async (f: ArticleFields) => {
    const res = await rpc<string>("admin_publish_article", {
      p_password: password,
      p_title: f.title,
      p_category: f.category,
      p_platforms: f.platforms,
      p_score: f.score,
      p_image: f.image,
      p_body: f.body,
    });
    if (res === "ok") load();
    return res === "ok" ? "ok" : articleError(res, ADMIN_ERRORS);
  };

  const remove = async (row: ArticleRow) => {
    const res = await rpc<string>("admin_delete_article", { p_password: password, p_id: row.id }).catch(() => "erreur");
    if (res !== "ok") alert(ADMIN_ERRORS[res] ?? "Suppression impossible.");
    load();
  };

  return <ArticleEditor rows={rows} publish={publish} remove={remove} />;
}
