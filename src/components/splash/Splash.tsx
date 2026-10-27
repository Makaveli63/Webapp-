import { LogoMark } from "@/components/ui/Logo";

/**
 * Animation d'ouverture (≈ 2 s, CSS uniquement) : des éléments évoquant chaque plateforme
 * et l'anime convergent vers le logo. Formes dessinées pour le site, aucun logo de marque.
 * Masquée après la première page vue (public/splash.js) et si l'animation est réduite.
 */
export function Splash() {
  return (
    <div className="splash" aria-hidden="true">
      {/* Façon PlayStation : triangle, rond, croix, carré */}
      <svg className="splash-group splash-ps" viewBox="0 0 120 120" fill="none" strokeWidth="9" strokeLinecap="round" strokeLinejoin="round">
        <path d="M60 10 L80 42 H40 Z" stroke="#2fd3a7" />
        <circle cx="96" cy="60" r="15" stroke="#ff5a6e" />
        <path d="M47 82 L73 108 M73 82 L47 108" stroke="#6aa8ff" />
        <rect x="10" y="46" width="28" height="28" rx="3" stroke="#ff7ad9" />
      </svg>

      {/* Façon Xbox : boutons A B X Y */}
      <svg className="splash-group splash-xbox" viewBox="0 0 120 120">
        {(
          [
            [60, 22, "#3fbf4a", "Y"],
            [98, 60, "#e8433f", "B"],
            [60, 98, "#3fbf4a", "A"],
            [22, 60, "#3b7cf0", "X"],
          ] as const
        ).map(([cx, cy, color, letter]) => (
          <g key={letter}>
            <circle cx={cx} cy={cy} r="18" fill={color} />
            <text x={cx} y={cy + 7} textAnchor="middle" fontSize="20" fontWeight="800" fill="#fff" fontFamily="system-ui, sans-serif">
              {letter}
            </text>
          </g>
        ))}
      </svg>

      {/* Façon Switch 2 : console noire, manettes aux reflets bleu et rouge côté écran */}
      <svg className="splash-group splash-nin" viewBox="0 0 120 120">
        <rect x="2" y="34" width="22" height="52" rx="11" fill="#1d2027" stroke="#3a3f4b" strokeWidth="1.5" />
        <rect x="96" y="34" width="22" height="52" rx="11" fill="#1d2027" stroke="#3a3f4b" strokeWidth="1.5" />
        <rect x="21" y="38" width="3" height="44" rx="1.5" fill="#00b8ff" />
        <rect x="96" y="38" width="3" height="44" rx="1.5" fill="#ff3c5a" />
        <rect x="25" y="34" width="70" height="52" rx="5" fill="#111318" stroke="#3a3f4b" strokeWidth="1.5" />
        <rect x="30" y="39" width="60" height="42" rx="2" fill="#2a2f3a" />
        <circle cx="13" cy="48" r="5.5" fill="#0b0d12" stroke="#4a505d" strokeWidth="1.5" />
        <circle cx="107" cy="70" r="5.5" fill="#0b0d12" stroke="#4a505d" strokeWidth="1.5" />
        <circle cx="107" cy="49" r="2.2" fill="#c9ced8" />
        <circle cx="13" cy="70" r="2.2" fill="#c9ced8" />
      </svg>

      {/* PC : touches W A S D */}
      <svg className="splash-group splash-pc" viewBox="0 0 120 120">
        {(
          [
            [42, 14, "W"],
            [6, 56, "A"],
            [42, 56, "S"],
            [78, 56, "D"],
          ] as const
        ).map(([x, y, key]) => (
          <g key={key}>
            <rect x={x} y={y} width="34" height="34" rx="7" fill="#1a1e29" stroke="#8b91a1" strokeWidth="3" />
            <text x={x + 17} y={y + 24} textAnchor="middle" fontSize="18" fontWeight="800" fill="#e6e8ee" fontFamily="system-ui, sans-serif">
              {key}
            </text>
          </g>
        ))}
      </svg>

      {/* Anime : fleur de cerisier et étincelle, façon manga */}
      <svg className="splash-group splash-anime" viewBox="0 0 120 120">
        <g transform="translate(60 64)">
          {[0, 72, 144, 216, 288].map((r) => (
            <path key={r} transform={`rotate(${r})`} d="M0 0 C -16 -12 -14 -36 -5 -42 L 0 -36 L 5 -42 C 14 -36 16 -12 0 0 Z" fill="#ff9ec7" stroke="#ff6fae" strokeWidth="2" />
          ))}
          <circle r="7" fill="#ffd166" />
        </g>
        <path d="M100 10 L104 22 L116 26 L104 30 L100 42 L96 30 L84 26 L96 22 Z" fill="#ffe27a" />
      </svg>

      <div className="splash-logo">
        <LogoMark id="gb-splash" className="splash-logo-icon" />
        <p className="splash-title">
          Gaming<span className="logo-gradient">Base</span>
        </p>
        <p className="splash-tagline">Jeux vidéo et anime, un seul endroit</p>
      </div>
    </div>
  );
}
