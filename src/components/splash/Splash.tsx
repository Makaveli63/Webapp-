/**
 * Animation d'ouverture (≈ 2 s, CSS uniquement) : des éléments évoquant chaque plateforme
 * convergent vers le logo. Formes dessinées pour le site, aucun logo de marque.
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

      {/* Façon Nintendo : deux manettes détachables rouge et bleue */}
      <svg className="splash-group splash-nin" viewBox="0 0 120 120">
        <rect x="18" y="14" width="36" height="92" rx="18" fill="#00b8d9" />
        <rect x="66" y="14" width="36" height="92" rx="18" fill="#ff4b55" />
        <circle cx="36" cy="44" r="8" fill="#0b0d12" opacity=".55" />
        <circle cx="84" cy="72" r="8" fill="#0b0d12" opacity=".55" />
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

      <div className="splash-logo">
        <svg viewBox="0 0 512 512" className="splash-logo-icon">
          <rect width="512" height="512" rx="112" fill="#0b0d12" />
          <path
            fill="none"
            stroke="#7c5cff"
            strokeWidth="32"
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M176 216h64M208 184v64M320 208h.5M352 240h.5M354 136H158a64 64 0 0 0-63.4 55.2L80 296a64 64 0 0 0 109.6 52.8L216 320h80l26.4 28.8A64 64 0 0 0 432 296l-14.6-104.8A64 64 0 0 0 354 136z"
          />
        </svg>
        <p className="splash-title">
          Gaming<span>Base</span>
        </p>
        <p className="splash-tagline">Toutes les plateformes, un seul endroit</p>
      </div>
    </div>
  );
}
