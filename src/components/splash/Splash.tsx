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

      {/* Façon Switch 2 : grand écran à bords fins, Joy-Con 2 noirs, accents bleu et rouge sous les sticks, bouton C */}
      <svg className="splash-group splash-nin" viewBox="0 0 120 120">
        <defs>
          <linearGradient id="gb-splash-scr" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#3a4150" />
            <stop offset="1" stopColor="#1b1f27" />
          </linearGradient>
        </defs>
        <path d="M23 36H13A11 11 0 0 0 2 47V73A11 11 0 0 0 13 84H23Z" fill="#1b1d22" stroke="#33363e" strokeWidth="1" />
        <circle cx="12.5" cy="47" r="6.2" fill="#00b8ff" />
        <circle cx="12.5" cy="47" r="4.6" fill="#0d0f13" />
        <circle cx="12.5" cy="47" r="3" fill="#24272e" />
        {[[12.5, 58.5], [8.5, 62.5], [16.5, 62.5], [12.5, 66.5]].map(([cx, cy]) => (
          <circle key={`l${cx}-${cy}`} cx={cx} cy={cy} r="2" fill="#2c3038" />
        ))}
        <rect x="17" y="39.2" width="3.5" height="1.1" rx=".5" fill="#9aa0ab" />
        <rect x="14.6" y="73" width="3" height="3" rx=".7" fill="#2c3038" />
        <rect x="23" y="36" width="74" height="48" rx="2.5" fill="#0d0f13" />
        <rect x="25.5" y="38.5" width="69" height="43" rx="1.2" fill="url(#gb-splash-scr)" />
        <path d="M25.5 38.5H58L40 81.5H25.5Z" fill="#fff" opacity=".06" />
        <path d="M97 36H107A11 11 0 0 1 118 47V73A11 11 0 0 1 107 84H97Z" fill="#1b1d22" stroke="#33363e" strokeWidth="1" />
        {[[107.5, 43], [103.5, 47], [111.5, 47], [107.5, 51]].map(([cx, cy]) => (
          <circle key={`r${cx}-${cy}`} cx={cx} cy={cy} r="2" fill="#2c3038" />
        ))}
        <circle cx="107.5" cy="63" r="6.2" fill="#ff3c5a" />
        <circle cx="107.5" cy="63" r="4.6" fill="#0d0f13" />
        <circle cx="107.5" cy="63" r="3" fill="#24272e" />
        <path d="M100.2 39.75h3.4M101.9 38.05v3.4" stroke="#9aa0ab" strokeWidth="1.1" strokeLinecap="round" />
        <circle cx="103.5" cy="74.5" r="1.9" fill="#2c3038" stroke="#9aa0ab" strokeWidth=".6" />
        <circle cx="110.5" cy="72.5" r="1.7" fill="#2c3038" />
        <text x="110.5" y="73.6" textAnchor="middle" fontSize="2.6" fontWeight="800" fill="#9aa0ab" fontFamily="system-ui, sans-serif">
          C
        </text>
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
      </div>
    </div>
  );
}
