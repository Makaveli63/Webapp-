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
  const start = useRef<{ x: number; moved: boolean } | null>(null);
  const handled = useRef(false);
  const [dragX, setDragX] = useState<number | null>(null);
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
    const left = Math.max(0, Math.min(width - slot, center - slot / 2));
    el.style.setProperty("width", `${slot}px`);
    el.style.setProperty("transform", `translateX(${left}px) scale(${dragX !== null ? 1.14 : 1})`);
    el.style.setProperty("opacity", target >= 0 || dragX !== null ? "1" : "0");
  }, [dragX, target, slot, width]);

  const relX = (e: PointerEvent) => e.clientX - (list.current?.getBoundingClientRect().left ?? 0);

  const down = (e: PointerEvent<HTMLUListElement>) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    start.current = { x: e.clientX, moved: false };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const move = (e: PointerEvent<HTMLUListElement>) => {
    if (!start.current) return;
    // La bulle ne suit le doigt que s'il glisse vraiment (un simple toucher ne la fait pas sauter).
    if (!start.current.moved && Math.abs(e.clientX - start.current.x) < 8) return;
    start.current.moved = true;
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
        <span ref={lens} aria-hidden className={`tab-lens ${dragX !== null ? "tab-lens-drag" : ""}`} />
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
                <Icon className={`size-5 transition-transform ${dragX !== null && hover === i ? "scale-110" : ""}`} aria-hidden />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
