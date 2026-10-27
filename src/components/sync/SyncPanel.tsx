"use client";

import { Check, Copy, Link2, RefreshCw, Smartphone, Unlink } from "lucide-react";
import { useEffect, useState } from "react";
import { formatCode, linkDevice, newCode, parseCode, savedCode, syncNow, unlinkDevice } from "@/lib/sync";
import { socialEnabled } from "@/lib/social";

/** Relier ses appareils (iPhone, Android, ordinateur) avec un code secret, sans compte ni email. */
export function SyncPanel() {
  const [code, setCode] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => setCode(savedCode()), []);
  if (!socialEnabled) return null;

  const run = async (fn: () => Promise<void>, ok: string) => {
    setBusy(true);
    setMessage("");
    try {
      await fn();
      setCode(savedCode());
      setMessage(ok);
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const copy = async () => {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(formatCode(code));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      /* presse-papiers indisponible : le code reste affiché */
    }
  };

  return (
    <section aria-labelledby="sync-title" className="glass rounded-xl p-4 sm:p-5">
      <h2 id="sync-title" className="flex items-center gap-2 font-semibold text-heading">
        <Smartphone className="size-5 text-accent" aria-hidden /> Synchroniser mes appareils
      </h2>
      <p className="mt-1 text-sm text-muted">
        Retrouve tes favoris, tes jeux épinglés et ta collection sur ton iPhone, ton Android et ton ordinateur. Sans compte ni email :
        un code secret relie tes appareils.
      </p>

      {code ? (
        <div className="mt-4 space-y-3">
          <p className="text-sm text-fg">Cet appareil est relié. Sur ton autre appareil, ouvre Réglages (roue dentée) et saisis ce code :</p>
          <div className="flex flex-wrap items-center gap-2">
            <code className="glass-pill rounded-lg px-3 py-2 font-mono text-base font-bold tracking-wider text-heading">{formatCode(code)}</code>
            <button type="button" onClick={copy} className="inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-sm text-muted ring-1 ring-inset ring-border hover:text-fg">
              {copied ? <Check className="size-4" aria-hidden /> : <Copy className="size-4" aria-hidden />} {copied ? "Copié" : "Copier"}
            </button>
          </div>
          <p className="text-xs text-muted">Garde ce code pour toi : il donne accès à ces listes (rien d&apos;autre).</p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => run(() => syncNow(), "Synchronisé ✅")}
              className="inline-flex items-center gap-1.5 rounded-full bg-accent px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              <RefreshCw className={`size-4 ${busy ? "animate-spin" : ""}`} aria-hidden /> Synchroniser maintenant
            </button>
            <button
              type="button"
              onClick={() => {
                if (!confirm("Délier cet appareil ? Tes listes restent ici, mais ne se synchroniseront plus.")) return;
                unlinkDevice();
                setCode(null);
                setMessage("");
              }}
              className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm text-muted ring-1 ring-inset ring-border hover:text-fg"
            >
              <Unlink className="size-4" aria-hidden /> Délier cet appareil
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-4 space-y-4">
          <button
            type="button"
            disabled={busy}
            onClick={() => run(() => linkDevice(newCode()), "Code créé : saisis-le sur ton autre appareil.")}
            className="inline-flex items-center gap-1.5 rounded-full bg-accent px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            <Link2 className="size-4" aria-hidden /> Créer mon code
          </button>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const c = parseCode(input);
              run(() => linkDevice(c), "Appareil relié : tes listes ont été réunies ✅");
            }}
            className="flex flex-wrap items-center gap-2"
          >
            <label htmlFor="sync-code" className="w-full text-sm text-fg">
              Tu as déjà un code (créé sur un autre appareil) ?
            </label>
            <input
              id="sync-code"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="ABCD-EFGH-JKLM-NPQR"
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              className="min-w-0 flex-1 rounded-lg border border-border bg-bg px-3 py-2 font-mono text-base uppercase tracking-wider focus:border-accent focus:outline-none"
            />
            <button
              type="submit"
              disabled={busy || parseCode(input).length !== 16}
              className="rounded-full px-4 py-2 text-sm font-semibold text-heading ring-1 ring-inset ring-border hover:ring-accent disabled:opacity-50"
            >
              Relier
            </button>
          </form>
        </div>
      )}
      {message && <p className="mt-3 text-sm text-fg">{message}</p>}
    </section>
  );
}
