"use client";

import { useRef, useState, type KeyboardEvent, type PointerEvent } from "react";

const compact = (n: number) =>
  new Intl.NumberFormat("fr-FR", { notation: n >= 10_000 ? "compact" : "standard", maximumFractionDigits: 1 }).format(n);

const shortDay = (ymd: string) =>
  new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(`${ymd.slice(0, 10)}T12:00:00Z`));

const longDay = (ymd: string) =>
  new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" }).format(
    new Date(`${ymd.slice(0, 10)}T12:00:00Z`),
  );

/** Maximum « rond » de l'axe et ses graduations (0 / 25 / 50 / 75 / 100…). */
function niceScale(max: number): number[] {
  if (max <= 0) return [0, 1];
  const raw = max / 4;
  const pow = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * pow).find((s) => s >= raw) ?? raw;
  return Array.from({ length: Math.ceil(max / step) + 1 }, (_, i) => i * step);
}

export interface DailyPoint {
  day: string;
  views: number;
  visitors: number;
}

const SERIES = [
  { key: "views", label: "Pages vues", color: "var(--series-1)" },
  { key: "visitors", label: "Visiteurs uniques", color: "var(--series-2)" },
] as const;

/**
 * Courbes « pages vues » et « visiteurs uniques » par jour : un seul axe (même unité),
 * légende + valeurs en bout de courbe, réticule et info-bulle au survol ou au clavier.
 */
export function DailyChart({ data }: { data: DailyPoint[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const W = 640;
  const H = 220;
  const pad = { l: 40, r: 44, t: 12, b: 26 };
  const ticks = niceScale(Math.max(1, ...data.map((d) => d.views)));
  const yMax = ticks[ticks.length - 1];
  const x = (i: number) => pad.l + (data.length <= 1 ? 0 : (i * (W - pad.l - pad.r)) / (data.length - 1));
  const y = (v: number) => pad.t + (1 - v / yMax) * (H - pad.t - pad.b);
  const last = data.length - 1;

  const pick = (e: PointerEvent<SVGSVGElement>) => {
    const box = svgRef.current?.getBoundingClientRect();
    if (!box || !data.length) return;
    const px = ((e.clientX - box.left) / box.width) * W;
    const i = Math.round(((px - pad.l) / (W - pad.l - pad.r)) * last);
    setHover(Math.min(last, Math.max(0, i)));
  };
  const onKey = (e: KeyboardEvent) => {
    if (e.key === "ArrowLeft") setHover((h) => Math.max(0, (h ?? last) - 1));
    if (e.key === "ArrowRight") setHover((h) => Math.min(last, (h ?? -1) + 1));
  };

  const xLabels = data.length > 2 ? [0, Math.floor(last / 2), last] : data.map((_, i) => i);
  const point = hover !== null ? data[hover] : null;

  return (
    <div className="viz-root relative">
      <div className="mb-2 flex flex-wrap gap-4 text-xs text-muted">
        {SERIES.map((s) => (
          <span key={s.key} className="inline-flex items-center gap-1.5">
            <svg width="16" height="4" aria-hidden>
              <line x1="0" y1="2" x2="16" y2="2" stroke={s.color} strokeWidth="2" strokeLinecap="round" />
            </svg>
            {s.label}
          </span>
        ))}
      </div>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        className="h-auto w-full touch-none select-none outline-none focus-visible:ring-2 focus-visible:ring-accent"
        role="img"
        aria-label="Pages vues et visiteurs uniques par jour (flèches gauche/droite pour parcourir)"
        tabIndex={0}
        onPointerMove={pick}
        onPointerDown={pick}
        onPointerLeave={() => setHover(null)}
        onKeyDown={onKey}
        onBlur={() => setHover(null)}
      >
        {ticks.map((t) => (
          <g key={t}>
            <line x1={pad.l} x2={W - pad.r} y1={y(t)} y2={y(t)} stroke="var(--grid)" strokeWidth="1" />
            <text x={pad.l - 8} y={y(t) + 4} textAnchor="end" fontSize="11" fill="var(--muted)" className="tabular-nums">
              {compact(t)}
            </text>
          </g>
        ))}
        {xLabels.map((i) => (
          <text key={i} x={x(i)} y={H - 6} textAnchor={i === 0 ? "start" : i === last ? "end" : "middle"} fontSize="11" fill="var(--muted)">
            {shortDay(data[i].day)}
          </text>
        ))}
        {point && <line x1={x(hover!)} x2={x(hover!)} y1={pad.t} y2={H - pad.b} stroke="var(--muted)" strokeWidth="1" />}
        {SERIES.map((s) => (
          <g key={s.key}>
            <polyline
              points={data.map((d, i) => `${x(i)},${y(d[s.key])}`).join(" ")}
              fill="none"
              stroke={s.color}
              strokeWidth="2"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
            {data.length > 0 && (
              <>
                <circle cx={x(last)} cy={y(data[last][s.key])} r="4" fill={s.color} stroke="var(--surface)" strokeWidth="2" />
                <text x={x(last) + 8} y={y(data[last][s.key]) + 4} fontSize="11" fill="var(--fg)" className="tabular-nums">
                  {compact(data[last][s.key])}
                </text>
              </>
            )}
            {point && <circle cx={x(hover!)} cy={y(point[s.key])} r="4" fill={s.color} stroke="var(--surface)" strokeWidth="2" />}
          </g>
        ))}
      </svg>
      {point && (
        <div
          className="pointer-events-none absolute top-8 z-10 min-w-40 rounded-lg border border-border bg-surface px-3 py-2 text-xs shadow-lg"
          // Positionné par React via CSSOM (autorisé par la CSP, contrairement aux styles écrits dans le HTML) ;
          // à gauche du réticule sur la moitié droite du graphique, à droite sinon.
          style={
            hover! > last / 2
              ? { right: `${100 - (x(hover!) / W) * 100 + 2}%` }
              : { left: `${(x(hover!) / W) * 100 + 2}%` }
          }
        >
          <p className="mb-1 font-medium text-muted">{longDay(point.day)}</p>
          {SERIES.map((s) => (
            <p key={s.key} className="flex items-center gap-2">
              <svg width="12" height="4" aria-hidden>
                <line x1="0" y1="2" x2="12" y2="2" stroke={s.color} strokeWidth="2" strokeLinecap="round" />
              </svg>
              <span className="font-semibold tabular-nums text-heading">{point[s.key]}</span>
              <span className="text-muted">{s.label}</span>
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

/** Barres horizontales (une seule série) : libellé, barre, valeur en bout de barre ; détail au survol. */
export function BarList({ rows, unit = "", percent = false }: { rows: { label: string; value: number }[]; unit?: string; percent?: boolean }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  const total = rows.reduce((s, r) => s + r.value, 0) || 1;
  if (!rows.length) return <p className="text-sm text-muted">Pas encore de données.</p>;
  return (
    <ul className="viz-root space-y-2">
      {rows.map((r) => {
        const shown = percent ? `${Math.round((r.value / total) * 100)} %` : `${r.value}${unit}`;
        return (
          <li key={r.label} className="group text-sm" title={`${r.label} : ${r.value}${unit}${percent ? ` (${shown})` : ""}`}>
            <div className="flex items-baseline justify-between gap-3">
              <span className="truncate text-fg">{r.label}</span>
              <span className="shrink-0 font-semibold tabular-nums text-heading">{shown}</span>
            </div>
            <svg className="mt-1 block h-2 w-full" viewBox="0 0 100 8" preserveAspectRatio="none" aria-hidden>
              <rect x="0" y="0" width={(r.value / max) * 100} height="8" rx="2" fill="var(--series-1)" className="transition-opacity group-hover:opacity-80" />
            </svg>
          </li>
        );
      })}
    </ul>
  );
}
