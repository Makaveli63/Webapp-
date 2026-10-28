import type { ReactNode } from "react";
import type { Scene, Theme } from "@/lib/themes";

/**
 * Visuel d'illustration dessiné en SVG selon le thème (franchise ou plateforme).
 * Création originale du site : aucune image de presse ni d'éditeur n'est reproduite.
 * Les couleurs passent par des attributs SVG (compatibles avec la CSP, qui interdit les styles en ligne).
 */

type Colors = Theme["colors"];
type Rand = () => number;

/** Générateur pseudo-aléatoire déterministe : un même article garde toujours le même décor. */
function seeded(seed: string): Rand {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  return () => {
    h = Math.imul(h ^ (h >>> 15), h | 1);
    h ^= h + Math.imul(h ^ (h >>> 7), h | 61);
    return ((h ^ (h >>> 14)) >>> 0) / 4294967296;
  };
}

const range = (n: number) => Array.from({ length: n }, (_, i) => i);

function Forest({ c, r, uid }: { c: Colors; r: Rand; uid: string }) {
  const trees = range(9).map(() => ({ x: r() * 400, h: 18 + r() * 22 }));
  return (
    <>
      <circle cx="95" cy="58" r="70" fill="#fff6d5" opacity=".25" />
      <circle cx="95" cy="58" r="30" fill="#fff6d5" opacity=".95" />
      {range(4).map((i) => (
        <polygon key={i} points={`95,58 ${i * 120 + 40},200 ${i * 120 + 90},200`} fill="#fff6d5" opacity=".08" />
      ))}
      <path d="M0 128 Q 70 92 150 122 T 300 108 T 400 118 V200 H0Z" fill={c[4]} opacity=".75" />
      <path d="M0 145 Q 90 112 190 138 T 400 132 V200 H0Z" fill={c[3]} />
      {trees.map((t, i) => (
        <polygon key={i} points={`${t.x},${142 - t.h} ${t.x - t.h / 3},${146} ${t.x + t.h / 3},${146}`} fill={c[2]} />
      ))}
      {/* Épée plantée dans la colline, à droite pour laisser la place au titre */}
      <circle cx="318" cy="80" r="5" fill={c[5]} />
      <rect x="315" y="84" width="6" height="15" rx="2" fill="#5b3a1e" />
      <rect x="300" y="98" width="36" height="6" rx="3" fill={c[5]} />
      <polygon points="314,104 322,104 322,148 318,155 314,148" fill="#e3ebf3" />
      <path d="M0 160 Q 110 138 205 152 T 400 150 V200 H0Z" fill={c[2]} />
      <rect width="400" height="200" fill={`url(#${uid}-shade)`} />
    </>
  );
}

function City({ c, r }: { c: Colors; r: Rand }) {
  let x = 0;
  const towers: { x: number; w: number; h: number }[] = [];
  while (x < 400) {
    const w = 14 + r() * 26;
    towers.push({ x, w, h: 30 + r() * 70 });
    x += w + 2;
  }
  const palm = (px: number, flip: number) => (
    <g fill={c[4]}>
      <path d={`M${px} 200 Q ${px + 8 * flip} 160 ${px + 2 * flip} 118 L ${px + 7 * flip} 118 Q ${px + 14 * flip} 160 ${px + 9 * flip} 200 Z`} />
      {range(6).map((i) => {
        const a = (i / 6) * Math.PI * 2;
        return (
          <path
            key={i}
            d={`M${px + 4 * flip} 118 Q ${px + 4 * flip + Math.cos(a) * 30} ${110 + Math.sin(a) * 14} ${px + 4 * flip + Math.cos(a) * 46} ${124 + Math.sin(a) * 18}`}
            stroke={c[4]}
            strokeWidth="7"
            strokeLinecap="round"
            fill="none"
          />
        );
      })}
    </g>
  );
  return (
    <>
      <circle cx="200" cy="118" r="62" fill={c[2]} />
      {range(5).map((i) => (
        <rect key={i} x="130" y={122 + i * 11} width="140" height={2 + i * 1.6} fill={c[1]} />
      ))}
      {towers.map((t, i) => (
        <rect key={i} x={t.x} y={170 - t.h} width={t.w} height={t.h} fill={c[3]} />
      ))}
      <rect y="168" width="400" height="32" fill={c[4]} />
      {range(10).map((i) => (
        <rect key={i} x={120 + r() * 160} y={176 + i * 2.4} width={20 + r() * 50} height="1.2" fill={c[2]} opacity=".5" />
      ))}
      {palm(48, 1)}
      {palm(352, -1)}
    </>
  );
}

function Industrial({ c, r }: { c: Colors; r: Rand }) {
  const towers = range(16).map((i) => ({ x: 30 + i * 22 + r() * 6, w: 10 + r() * 12, h: 30 + r() * 70 }));
  return (
    <>
      <ellipse cx="200" cy="150" rx="210" ry="70" fill={c[2]} opacity=".22" />
      {range(8).map((i) => (
        <rect key={i} x={40 + i * 45} y="150" width="6" height="50" fill={c[3]} />
      ))}
      <ellipse cx="200" cy="148" rx="175" ry="16" fill={c[3]} />
      {towers.map((t, i) => (
        <g key={i}>
          <rect x={t.x} y={145 - t.h} width={t.w} height={t.h} fill={c[3]} />
          {range(4).map((j) => (
            <rect key={j} x={t.x + 2} y={150 - t.h + j * 9 + r() * 4} width="2.5" height="2.5" fill={c[4]} opacity={0.4 + r() * 0.6} />
          ))}
        </g>
      ))}
      {range(8).map((i) => (
        <circle key={i} cx={40 + i * 45 + 3} cy="146" r="4" fill={c[2]} />
      ))}
      <rect x="196" y="20" width="8" height="90" fill={c[2]} opacity=".35" />
    </>
  );
}

function Spy({ c }: { c: Colors }) {
  return (
    <>
      {range(7).map((i) => (
        <circle key={i} cx="285" cy="100" r={18 + i * 17} fill="none" stroke={c[2]} strokeWidth="3" opacity={0.85 - i * 0.11} />
      ))}
      <circle cx="285" cy="100" r="12" fill={c[2]} />
      <polygon points="0,200 120,0 170,0 60,200" fill={c[4]} opacity=".05" />
      <rect x="0" y="176" width="400" height="2" fill={c[2]} opacity=".6" />
      <rect x="0" y="182" width="260" height="1" fill={c[3]} opacity=".6" />
    </>
  );
}

function Space({ c, r }: { c: Colors; r: Rand }) {
  return (
    <>
      <ellipse cx="90" cy="70" rx="120" ry="50" fill={c[5]} opacity=".12" />
      {range(70).map((i) => (
        <circle key={i} cx={r() * 400} cy={r() * 200} r={0.4 + r() * 1.3} fill={c[4]} opacity={0.3 + r() * 0.7} />
      ))}
      <circle cx="290" cy="118" r="56" fill={c[2]} />
      <circle cx="275" cy="105" r="56" fill={c[0]} opacity=".35" />
      <ellipse cx="290" cy="118" rx="98" ry="17" fill="none" stroke={c[3]} strokeWidth="4" transform="rotate(-14 290 118)" />
      <circle cx="120" cy="150" r="12" fill={c[3]} opacity=".9" />
      <polygon points="60,60 84,68 60,76 66,68" fill={c[4]} />
    </>
  );
}

function Racing({ c, r }: { c: Colors; r: Rand }) {
  return (
    <>
      <circle cx="200" cy="108" r="40" fill={c[4]} opacity=".85" />
      <rect y="104" width="400" height="96" fill={c[5]} />
      <polygon points="185,106 215,106 420,200 -20,200" fill={c[2]} />
      {range(6).map((i) => {
        const t = i / 6;
        const y = 108 + t * t * 92;
        const w = 1.5 + t * 8;
        return <rect key={i} x={200 - w / 2} y={y} width={w} height={2 + t * 12} fill={c[3]} />;
      })}
      <polygon points="185,106 188,106 -8,200 -20,200" fill={c[4]} />
      <polygon points="212,106 215,106 420,200 408,200" fill={c[4]} />
      {range(14).map((i) => (
        <rect key={i} x={r() < 0.5 ? r() * 120 : 280 + r() * 120} y={20 + r() * 80} width={30 + r() * 60} height="1.6" fill="#ffffff" opacity=".35" />
      ))}
    </>
  );
}

function Sport({ c }: { c: Colors }) {
  return (
    <>
      {range(8).map((i) => (
        <rect key={i} x={i * 50} width="50" height="200" fill={i % 2 ? c[0] : c[1]} />
      ))}
      <g fill="none" stroke={c[2]} strokeWidth="2.5" opacity=".9">
        <rect x="14" y="14" width="372" height="172" />
        <line x1="200" y1="14" x2="200" y2="186" />
        <circle cx="200" cy="100" r="34" />
        <rect x="14" y="58" width="50" height="84" />
        <rect x="336" y="58" width="50" height="84" />
      </g>
      <circle cx="230" cy="122" r="9" fill="#ffffff" />
      <circle cx="230" cy="122" r="3.5" fill={c[5]} />
      <ellipse cx="20" cy="0" rx="90" ry="40" fill={c[4]} opacity=".25" />
      <ellipse cx="380" cy="0" rx="90" ry="40" fill={c[4]} opacity=".25" />
    </>
  );
}

function Blocks({ c, r }: { c: Colors; r: Rand }) {
  const cols = range(20).map(() => 2 + Math.floor(r() * 4));
  return (
    <>
      {range(3).map((i) => {
        const x = 40 + i * 130 + r() * 30;
        const y = 25 + r() * 35;
        return (
          <g key={i} fill={c[5]} opacity=".9">
            <rect x={x} y={y} width="50" height="12" />
            <rect x={x + 12} y={y - 10} width="26" height="10" />
          </g>
        );
      })}
      {cols.map((h, i) =>
        range(h).map((j) => {
          const y = 200 - (j + 1) * 20;
          const fill = j === h - 1 ? c[2] : j === 0 ? c[4] : c[3];
          return <rect key={`${i}-${j}`} x={i * 20} y={y} width="20" height="20" fill={fill} stroke="#000000" strokeOpacity=".18" />;
        }),
      )}
    </>
  );
}

function Horror({ c, r }: { c: Colors; r: Rand }) {
  return (
    <>
      <circle cx="300" cy="58" r="60" fill={c[2]} opacity=".12" />
      <circle cx="300" cy="58" r="26" fill={c[2]} />
      <g stroke={c[4]} strokeLinecap="round" fill="none">
        <path d="M95 200 Q 100 140 90 100" strokeWidth="9" />
        <path d="M93 130 Q 60 110 40 80" strokeWidth="5" />
        <path d="M92 112 Q 120 90 140 60" strokeWidth="4" />
        <path d="M60 104 Q 50 90 52 70" strokeWidth="3" />
        <path d="M125 80 Q 140 78 155 70" strokeWidth="3" />
      </g>
      {range(6).map((i) => (
        <ellipse key={i} cx={r() * 400} cy={150 + r() * 40} rx={90 + r() * 80} ry={10 + r() * 10} fill={c[3]} opacity=".16" />
      ))}
      <path d="M0 178 Q 120 166 220 176 T 400 170 V200 H0Z" fill={c[4]} />
      <circle cx="252" cy="160" r="2.2" fill={c[5]} />
      <circle cx="261" cy="160" r="2.2" fill={c[5]} />
    </>
  );
}

function Shooter({ c, r }: { c: Colors; r: Rand }) {
  const ruins = range(21)
    .map((i) => `${i * 20},${150 - r() * 50}`)
    .join(" ");
  return (
    <>
      {range(9).map((i) => (
        <circle key={i} cx={r() * 400} cy={60 + r() * 80} r={20 + r() * 40} fill={c[2]} opacity=".22" />
      ))}
      <polygon points={`0,200 ${ruins} 400,200`} fill={c[3]} />
      <g stroke={c[4]} strokeWidth="2.5" fill="none">
        <circle cx="262" cy="92" r="26" />
        <line x1="262" y1="56" x2="262" y2="76" />
        <line x1="262" y1="108" x2="262" y2="128" />
        <line x1="226" y1="92" x2="246" y2="92" />
        <line x1="278" y1="92" x2="298" y2="92" />
      </g>
      <circle cx="262" cy="92" r="2.5" fill={c[4]} />
    </>
  );
}

function DarkFantasy({ c, r }: { c: Colors; r: Rand }) {
  return (
    <>
      {range(25).map((i) => (
        <circle key={i} cx={r() * 400} cy={r() * 90} r={0.5 + r()} fill="#ffffff" opacity={0.3 + r() * 0.6} />
      ))}
      <circle cx="90" cy="55" r="48" fill={c[2]} opacity=".14" />
      <circle cx="90" cy="55" r="22" fill={c[2]} />
      <polygon points="0,200 0,140 60,95 110,135 170,70 230,130 290,90 340,120 400,85 400,200" fill={c[3]} />
      <polygon points="0,200 0,165 80,140 150,160 230,138 320,158 400,140 400,200" fill={c[4]} />
      {/* Château sur le pic */}
      <g fill={c[4]}>
        <rect x="158" y="52" width="24" height="30" />
        <rect x="150" y="40" width="9" height="42" />
        <rect x="181" y="34" width="9" height="48" />
        <polygon points="150,40 154.5,28 159,40" />
        <polygon points="181,34 185.5,20 190,34" />
      </g>
      <rect x="168" y="62" width="3" height="5" fill={c[5]} />
      <rect x="184" y="44" width="2" height="4" fill={c[5]} />
    </>
  );
}

function Waves({ c, r }: { c: Colors; r: Rand }) {
  const shapes = range(10).map(() => ({ x: r() * 380 + 10, y: r() * 170 + 15, s: 6 + r() * 8, k: Math.floor(r() * 4) }));
  return (
    <>
      {range(5).map((i) => (
        <path
          key={i}
          d={`M0 ${120 + i * 14} Q 100 ${90 + i * 14} 200 ${120 + i * 14} T 400 ${115 + i * 14}`}
          fill="none"
          stroke={i % 2 ? c[3] : c[2]}
          strokeWidth="3"
          opacity={0.75 - i * 0.12}
        />
      ))}
      <g fill="none" stroke={c[4]} strokeWidth="2" opacity=".35">
        {shapes.map((s, i) =>
          s.k === 0 ? (
            <circle key={i} cx={s.x} cy={s.y} r={s.s} />
          ) : s.k === 1 ? (
            <rect key={i} x={s.x - s.s} y={s.y - s.s} width={s.s * 2} height={s.s * 2} />
          ) : s.k === 2 ? (
            <polygon key={i} points={`${s.x},${s.y - s.s} ${s.x + s.s},${s.y + s.s} ${s.x - s.s},${s.y + s.s}`} />
          ) : (
            <path key={i} d={`M${s.x - s.s} ${s.y - s.s} L${s.x + s.s} ${s.y + s.s} M${s.x + s.s} ${s.y - s.s} L${s.x - s.s} ${s.y + s.s}`} />
          ),
        )}
      </g>
    </>
  );
}

function Rings({ c, r }: { c: Colors; r: Rand }) {
  return (
    <>
      {range(6).map((i) => (
        <circle key={i} cx="200" cy="100" r={22 + i * 22} fill="none" stroke={c[2]} strokeWidth={3 - i * 0.35} opacity={0.9 - i * 0.14} />
      ))}
      <circle cx="200" cy="100" r="14" fill={c[3]} />
      {range(30).map((i) => (
        <circle key={i} cx={r() * 400} cy={r() * 200} r={0.6 + r()} fill={c[3]} opacity={0.2 + r() * 0.5} />
      ))}
    </>
  );
}

/** Façon Switch 2 : console noire, reflets bleu et rouge des manettes côté écran. */
function Split({ c }: { c: Colors }) {
  return (
    <>
      <ellipse cx="110" cy="100" rx="150" ry="90" fill={c[2]} opacity=".18" />
      <ellipse cx="290" cy="100" rx="150" ry="90" fill={c[3]} opacity=".18" />
      <g transform="translate(70 52)">
        <rect x="0" y="0" width="42" height="96" rx="21" fill="#1d2027" stroke="#3a3f4b" strokeWidth="2" />
        <rect x="218" y="0" width="42" height="96" rx="21" fill="#1d2027" stroke="#3a3f4b" strokeWidth="2" />
        <rect x="38" y="8" width="5" height="80" rx="2.5" fill={c[2]} />
        <rect x="217" y="8" width="5" height="80" rx="2.5" fill={c[3]} />
        <rect x="44" y="0" width="172" height="96" rx="8" fill="#111318" stroke="#3a3f4b" strokeWidth="2" />
        <rect x="53" y="9" width="154" height="78" rx="3" fill={c[1]} />
        <rect x="53" y="9" width="154" height="78" rx="3" fill={c[2]} opacity=".08" />
        <circle cx="21" cy="28" r="10" fill="#0b0d12" stroke="#4a505d" strokeWidth="2.5" />
        <circle cx="239" cy="62" r="10" fill="#0b0d12" stroke="#4a505d" strokeWidth="2.5" />
        {[
          [239, 22],
          [231, 30],
          [247, 30],
          [239, 38],
        ].map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r="3.5" fill="#c9ced8" />
        ))}
        {[
          [21, 58],
          [13, 66],
          [29, 66],
          [21, 74],
        ].map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r="3.5" fill="#c9ced8" />
        ))}
      </g>
    </>
  );
}

function Grid({ c, uid }: { c: Colors; uid: string }) {
  return (
    <>
      <rect y="98" width="400" height="4" fill={`url(#${uid}-rgb)`} />
      <rect y="70" width="400" height="30" fill={`url(#${uid}-rgb)`} opacity=".18" />
      <g stroke={c[5]} strokeWidth="1.2" opacity=".55">
        {range(9).map((i) => (
          <line key={`h${i}`} x1="0" x2="400" y1={102 + (i * i * 98) / 64} y2={102 + (i * i * 98) / 64} />
        ))}
        {range(17).map((i) => (
          <line key={`v${i}`} x1={200 + (i - 8) * 8} y1="102" x2={200 + (i - 8) * 70} y2="200" />
        ))}
      </g>
    </>
  );
}

function Abstract({ c, uid }: { c: Colors; uid: string }) {
  return (
    <g filter={`url(#${uid}-blur)`}>
      <circle cx="90" cy="60" r="70" fill={c[2]} opacity=".55" />
      <circle cx="300" cy="140" r="80" fill={c[3]} opacity=".5" />
      <circle cx="230" cy="40" r="45" fill={c[4]} opacity=".45" />
    </g>
  );
}

const SCENES: Record<Scene, (p: { c: Colors; r: Rand; uid: string }) => ReactNode> = {
  forest: Forest,
  city: City,
  industrial: Industrial,
  spy: Spy,
  space: Space,
  racing: Racing,
  sport: Sport,
  blocks: Blocks,
  horror: Horror,
  shooter: Shooter,
  darkfantasy: DarkFantasy,
  waves: Waves,
  rings: Rings,
  split: Split,
  grid: Grid,
  abstract: Abstract,
};

interface Props {
  theme: Theme;
  /** Graine du décor (ex. slug) : même sujet → même image */
  seed: string;
  className?: string;
  /** Contenu superposé (titre…), lisible grâce à un dégradé sombre en bas */
  children?: ReactNode;
}

export function Cover({ theme, seed, className = "", children }: Props) {
  const c = theme.colors;
  const uid = `cv-${theme.id}-${seed.replace(/[^a-z0-9]/gi, "").slice(0, 24)}`;
  return (
    <div className={`relative overflow-hidden ${className}`}>
      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 400 200" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        <defs>
          <linearGradient id={`${uid}-sky`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={c[0]} />
            <stop offset={theme.scene === "city" ? ".55" : "1"} stopColor={c[1]} />
            {theme.scene === "city" && <stop offset="1" stopColor={c[5]} />}
          </linearGradient>
          <linearGradient id={`${uid}-shade`} x1="0" y1="0" x2="0" y2="1">
            <stop offset=".6" stopColor="#000000" stopOpacity="0" />
            <stop offset="1" stopColor="#000000" stopOpacity=".25" />
          </linearGradient>
          <linearGradient id={`${uid}-rgb`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor={c[2]} />
            <stop offset=".5" stopColor={c[3]} />
            <stop offset="1" stopColor={c[4]} />
          </linearGradient>
          <filter id={`${uid}-blur`}>
            <feGaussianBlur stdDeviation="18" />
          </filter>
        </defs>
        <rect width="400" height="200" fill={`url(#${uid}-sky)`} />
        {/* Appel direct (pas un composant) : le tirage repart du début à chaque rendu, sinon un rendu
            rejoué par React continue la série et le décor diffère du HTML du build (erreur d'hydratation). */}
        {SCENES[theme.scene]({ c, r: seeded(seed), uid })}
      </svg>
      {children && (
        <div className="relative flex h-full flex-col justify-end bg-gradient-to-t from-black/70 via-black/20 to-transparent p-4">
          {children}
        </div>
      )}
    </div>
  );
}
