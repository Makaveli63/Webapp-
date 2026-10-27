/**
 * Logo GamingBase : tuile en dégradé violet → cyan, manette blanche dont le pavé tactile, la croix,
 * les boutons et les joysticks sont découpés (masque SVG). Même dessin que public/icon.svg.
 */
export function LogoMark({ className = "size-7", id = "gb" }: { className?: string; id?: string }) {
  return (
    <svg viewBox="0 0 512 512" className={className} aria-hidden="true">
      <defs>
        <linearGradient id={`${id}-bg`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#8b5cf6" />
          <stop offset=".55" stopColor="#6246ea" />
          <stop offset="1" stopColor="#22d3ee" />
        </linearGradient>
        <radialGradient id={`${id}-shine`} cx=".25" cy=".15" r=".7">
          <stop offset="0" stopColor="#ffffff" stopOpacity=".35" />
          <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
        </radialGradient>
        <mask id={`${id}-pad`}>
          <rect width="512" height="512" fill="#000" />
          <path
            fill="#fff"
            d="M162 146H350C390 146 416 166 426 202L456 322C466 362 440 394 404 394C384 394 368 384 356 366L330 330H182L156 366C144 384 128 394 108 394C72 394 46 362 56 322L86 202C96 166 122 146 162 146Z"
          />
          {/* Pavé tactile, croix, 4 boutons et deux joysticks (inspiration DualSense, dessin original) */}
          <rect x="212" y="160" width="88" height="56" rx="12" fill="none" stroke="#000" strokeWidth="7" />
          <rect x="138" y="182" width="20" height="64" rx="5" fill="#000" />
          <rect x="116" y="204" width="64" height="20" rx="5" fill="#000" />
          <circle cx="366" cy="188" r="11" fill="#000" />
          <circle cx="392" cy="214" r="11" fill="#000" />
          <circle cx="366" cy="240" r="11" fill="#000" />
          <circle cx="340" cy="214" r="11" fill="#000" />
          <circle cx="212" cy="282" r="27" fill="#000" />
          <circle cx="212" cy="282" r="17" fill="#fff" />
          <circle cx="300" cy="282" r="27" fill="#000" />
          <circle cx="300" cy="282" r="17" fill="#fff" />
        </mask>
      </defs>
      <rect width="512" height="512" rx="120" fill={`url(#${id}-bg)`} />
      <rect width="512" height="512" rx="120" fill={`url(#${id}-shine)`} />
      <rect width="512" height="512" fill="#ffffff" mask={`url(#${id}-pad)`} />
      <ellipse cx="256" cy="420" rx="140" ry="13" fill="#0b0d12" opacity=".22" />
    </svg>
  );
}

/** Logo complet : pictogramme + « Gaming » + « Base » en dégradé. */
export function Logo({ className = "", markClassName = "size-7", id }: { className?: string; markClassName?: string; id?: string }) {
  return (
    <span className={`flex items-center gap-2 font-extrabold tracking-tight ${className}`}>
      <LogoMark className={markClassName} id={id} />
      <span className="text-heading">
        Gaming<span className="logo-gradient">Base</span>
      </span>
    </span>
  );
}
