/** Échelle de couleurs de la note (rapportée à 100) et appréciation affichée avec elle. */
const TIERS = [
  { min: 0.85, className: "score-glass score-excellent", label: "Excellent" },
  { min: 0.7, className: "score-glass score-tres-bon", label: "Très bon" },
  { min: 0.55, className: "score-glass score-correct", label: "Correct" },
  { min: 0.4, className: "score-glass score-moyen", label: "Moyen" },
  { min: 0, className: "score-glass score-decevant", label: "Décevant" },
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
      className={`pointer-events-none inline-flex flex-col items-center rounded-2xl px-2.5 py-1.5 leading-none ${tone(score)} ${className}`}
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
