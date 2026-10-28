"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useLayoutEffect, useRef, useState, type PointerEvent } from "react";
import { activeHref, NAV_LINKS } from "./nav-links";

const ITEMS = NAV_LINKS.filter((l) => l.mobile);

/**
 * Barre d'onglets fixe en bas d'écran, à portée de pouce (mobile uniquement).
 * On peut glisser le doigt dessus : une bulle de verre suit le doigt et l'onglet est ouvert au lâcher.
 */
export function MobileTabBar() {
  const router = useRouter();
  const path = activeHref(usePathname());
  // Les actus n'ont plus d'onglet : elles font partie de l'accueil.
  const active = path === "/actualites" ? "/" : path;
  const activeIndex = ITEMS.findIndex((i) => i.href === active);

  const list = useRef<HTMLUListElement>(null);
  const lens = useRef<HTMLSpanElement>(null);
  const start = useRef<{ x: number; moved: boolean; lastX: number; lastT: number } | null>(null);
  const handled = useRef(false);
  const stretch = useRef(1); // étirement de la bulle selon la vitesse du doigt
  const [dragX, setDragX] = useState<number | null>(null);
  // Doigt posé sur la barre : la sélection devient une bulle de verre (comme l'app Musique).
  const [pressed, setPressed] = useState(false);
  // Onglet choisi dont la page n'est pas encore affichée : la bulle y va tout de suite.
  const [pending, setPending] = useState<number | null>(null);
  const [width, setWidth] = useState(0);

  // Les pages des onglets sont préchargées : elles s'ouvrent sans attendre le réseau.
  useEffect(() => {
    ITEMS.forEach((i) => router.prefetch(i.href));
  }, [router]);
  // La page demandée est affichée : plus rien en attente.
  useEffect(() => setPending(null), [activeIndex]);

  // Largeur de la barre (rotation de l'écran, clavier…).
  useEffect(() => {
    const el = list.current;
    if (!el) return;
    const update = () => setWidth(el.clientWidth);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const slot = width / ITEMS.length;
  const indexAt = (x: number) => Math.max(0, Math.min(ITEMS.length - 1, Math.floor(x / Math.max(slot, 1))));
  const target = pending ?? activeIndex;
  const hover = dragX !== null ? indexAt(dragX) : target;

  // Position de la bulle (CSSOM : pas de style en ligne avec la CSP) : sous le doigt, sinon sur l'onglet actif.
  useLayoutEffect(() => {
    const el = lens.current;
    if (!el || !slot) return;
    const center = dragX ?? (target + 0.5) * slot;
    const lensWidth = pressed ? slot * 1.18 : slot;
    const left = Math.max(-slot * 0.12, Math.min(width - lensWidth + slot * 0.12, center - lensWidth / 2));
    const sx = pressed ? stretch.current : 1;
    const sy = pressed ? 1.22 / Math.sqrt(sx) : 1; // plus large quand le doigt file, un peu moins haute
    el.style.setProperty("width", `${lensWidth}px`);
    el.style.setProperty("transform", `translateX(${left}px) scale(${sx}, ${sy})`);
    el.style.setProperty("opacity", target >= 0 || pressed ? "1" : "0");
  }, [dragX, target, slot, width, pressed]);

  const relX = (e: PointerEvent) => e.clientX - (list.current?.getBoundingClientRect().left ?? 0);

  const down = (e: PointerEvent<HTMLUListElement>) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    start.current = { x: e.clientX, moved: false, lastX: e.clientX, lastT: e.timeStamp };
    stretch.current = 1;
    e.currentTarget.setPointerCapture(e.pointerId);
    setPressed(true);
  };
  const move = (e: PointerEvent<HTMLUListElement>) => {
    if (!start.current) return;
    // La bulle ne suit le doigt que s'il glisse vraiment (un simple toucher ne la fait pas sauter).
    if (!start.current.moved && Math.abs(e.clientX - start.current.x) < 8) return;
    start.current.moved = true;
    const dt = Math.max(e.timeStamp - start.current.lastT, 1);
    const speed = Math.abs(e.clientX - start.current.lastX) / dt; // px par ms
    stretch.current = 1 + Math.min(speed * 0.18, 0.3);
    start.current.lastX = e.clientX;
    start.current.lastT = e.timeStamp;
    const x = relX(e);
    if (dragX !== null && indexAt(x) !== indexAt(dragX)) navigator.vibrate?.(6); // petit retour haptique (Android)
    setDragX(x);
  };
  const up = (e: PointerEvent<HTMLUListElement>) => {
    if (!start.current) return;
    const index = indexAt(relX(e));
    const item = ITEMS[index];
    start.current = null;
    setDragX(null);
    setPressed(false);
    // Le doigt a été capturé par la barre : c'est elle qui ouvre l'onglet (le clic du lien est ignoré).
    handled.current = true;
    window.setTimeout(() => (handled.current = false), 400);
    if (item && item.href !== active) {
      setPending(index);
      router.push(item.href);
    }
  };
  const cancel = () => {
    start.current = null;
    setDragX(null);
    setPressed(false);
  };

  return (
    <nav
      aria-label="Navigation principale"
      className="tabbar fixed inset-x-0 bottom-0 z-40 glass-bar border-t pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      <ul
        ref={list}
        className="relative grid touch-none select-none grid-cols-5"
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={cancel}
      >
        <span ref={lens} aria-hidden className={`tab-lens ${pressed ? "tab-lens-drag" : ""}`} />
        {ITEMS.map(({ href, label, icon: Icon }, i) => {
          const current = active === href;
          return (
            <li key={href} className="relative z-10">
              <Link
                href={href}
                aria-current={current ? "page" : undefined}
                onClick={(e) => handled.current && e.preventDefault()}
                draggable={false}
                className={`flex h-14 flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition-colors ${
                  hover === i ? "text-accent" : "text-muted"
                }`}
              >
                <Icon className={`size-5 transition-transform duration-200 ${pressed && hover === i ? "scale-125" : ""}`} aria-hidden />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
