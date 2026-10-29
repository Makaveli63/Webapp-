export default function SuggestionsPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="text-3xl font-bold text-heading">Suggestions</h1>
      <p className="mt-4 text-muted">Avez-vous des suggestions pour améliorer le site ? N&apos;hésitez pas à nous en faire part !</p>
      <form className="mt-8 flex flex-col gap-4">
        <textarea
          className="w-full rounded-lg border border-border bg-surface p-4 text-fg focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
          rows={6}
          placeholder="Vos suggestions..."
        />
        <button
          type="button"
          className="rounded-lg bg-accent px-6 py-3 font-semibold text-white transition-colors hover:bg-accent/90"
        >
          Envoyer
        </button>
      </form>
    </div>
  );
}
