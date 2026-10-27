/** Échelle de couleurs de la note (rapportée à 100) et appréciation affichée avec elle. */
const TIERS = [
  { min: 0.85, className: "bg-emerald-500 text-black", label: "Excellent" },
  { min: 0.7, className: "bg-lime-400 text-black", label: "Très bon" },
  { min: 0.55, className: "bg-amber-400 text-black", label: "Correct" },
  { min: 0.4, className: "bg-orange-500 text-black", label: "Moyen" },
  { min: 0, className: "bg-rose-600 text-white", label: "Décevant" },
];

export function scoreTier(score: string) {
  const [value, scale] = score.replace(",", ".").split("/").map(Number);
  const ratio = scale ? value / scale : 0;
  return TIERS.find((t) => ratio >= t.min) ?? TIERS[TIERS.length - 1];
}
const tone = (score: string) => scoreTier(score).className;

/** Note d'un test, bien visible sur l'image de la carte : « 16 /20 ». */
export function ScoreBadge({ score, className = "" }: { score: string; className?: string }) {
  const [value, scale] = score.split("/");
  return (
    <span
      className={`pointer-events-none inline-flex flex-col items-center rounded-xl px-2.5 py-1.5 leading-none shadow-lg ring-2 ring-black/20 ${tone(score)} ${className}`}
      aria-label={`Note du test : ${score} (${scoreTier(score).label.toLowerCase()})`}
    >
      <span className="text-[10px] font-bold uppercase tracking-wide opacity-80">Note</span>
      <span className="mt-0.5 text-xl font-black tabular-nums sm:text-2xl">
        {value}
        <span className="text-xs font-bold opacity-80">/{scale}</span>
      </span>
    </span>
  );
}
