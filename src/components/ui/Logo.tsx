/**
 * Logo GamingBase : tuile en dégradé violet → cyan, manette blanche dont la croix
 * directionnelle et les boutons sont découpés (masque SVG). Même dessin que public/icon.svg.
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
            d="M150 153h212a70 70 0 0 1 68 54l26 112a46 46 0 0 1-78 40l-44-46H178l-44 46a46 46 0 0 1-78-40l26-112a70 70 0 0 1 68-54z"
          />
          <rect x="167" y="190" width="24" height="76" rx="6" fill="#000" />
          <rect x="141" y="216" width="76" height="24" rx="6" fill="#000" />
          <circle cx="330" cy="208" r="15" fill="#000" />
          <circle cx="370" cy="244" r="15" fill="#000" />
        </mask>
      </defs>
      <rect width="512" height="512" rx="120" fill={`url(#${id}-bg)`} />
      <rect width="512" height="512" rx="120" fill={`url(#${id}-shine)`} />
      <rect width="512" height="512" fill="#ffffff" mask={`url(#${id}-pad)`} />
      <ellipse cx="256" cy="398" rx="128" ry="14" fill="#0b0d12" opacity=".22" />
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
