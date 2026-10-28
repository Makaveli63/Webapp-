/**
 * Fleur de cerisier de l'écran de démarrage, dessinée comme les icônes de l'appli (trait, couleur du texte) :
 * symbole de l'anime dans les onglets et les menus.
 */
export function FlowerIcon({ className = "", ...rest }: { className?: string; "aria-hidden"?: boolean | "true" | "false" }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.35} strokeLinejoin="round" className={className} {...rest}>
      <g transform="translate(12 12.7) scale(.245)">
        {[0, 72, 144, 216, 288].map((r) => (
          <path key={r} transform={`rotate(${r})`} d="M0 0 C -16 -12 -14 -36 -5 -42 L 0 -36 L 5 -42 C 14 -36 16 -12 0 0 Z" vectorEffect="non-scaling-stroke" />
        ))}
        <circle r="7" vectorEffect="non-scaling-stroke" />
      </g>
    </svg>
  );
}
