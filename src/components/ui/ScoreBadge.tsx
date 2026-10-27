/** Couleur selon la note rapportée à 100 : vert (très bon), ambre (correct), rouge (décevant). */
function tone(score: string) {
  const [value, scale] = score.replace(",", ".").split("/").map(Number);
  const ratio = scale ? value / scale : 0;
  if (ratio >= 0.75) return "bg-emerald-400 text-black";
  if (ratio >= 0.5) return "bg-amber-400 text-black";
  return "bg-rose-500 text-white";
}

/** Note d'un test, bien visible sur l'image de la carte : « 16 /20 ». */
export function ScoreBadge({ score, className = "" }: { score: string; className?: string }) {
  const [value, scale] = score.split("/");
  return (
    <span
      className={`pointer-events-none inline-flex flex-col items-center rounded-xl px-2.5 py-1.5 leading-none shadow-lg ring-2 ring-black/20 ${tone(score)} ${className}`}
      aria-label={`Note du test : ${score}`}
    >
      <span className="text-[10px] font-bold uppercase tracking-wide opacity-80">Note</span>
      <span className="mt-0.5 text-xl font-black tabular-nums sm:text-2xl">
        {value}
        <span className="text-xs font-bold opacity-80">/{scale}</span>
      </span>
    </span>
  );
}
