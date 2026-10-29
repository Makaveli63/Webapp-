"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useLayoutEffect, useRef, useState, type PointerEvent } from "react";
import { activeHref, NAV_LINKS } from "./nav-links";

const ITEMS = NAV_LINKS.filter((l) => l.mobile);

// Carte de déplacement de la loupe : rouge = décalage horizontal, vert = vertical, gris neutre au centre.
// Les bords dévient la lumière (réfraction), le centre reste net, comme le verre liquide.
const svg = (body: string) => `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" preserveAspectRatio="none">${body}</svg>`)}`;
const MAP_X = svg('<defs><linearGradient id="a"><stop offset="0" stop-color="#f00"/><stop offset="1" stop-color="#000"/></linearGradient></defs><rect width="100" height="100" fill="url(#a)"/>');
const MAP_Y = svg('<defs><linearGradient id="a" x2="0" y2="1"><stop offset="0" stop-color="#0f0"/><stop offset="1" stop-color="#000"/></linearGradient></defs><rect width="100" height="100" fill="url(#a)"/>');
const MAP_CENTER = svg('<defs><filter id="b"><feGaussianBlur stdDeviation="7"/></filter></defs><rect x="16" y="20" width="68" height="60" rx="26" fill="#808080" filter="url(#b)"/>');

/** Filtre SVG de réfraction utilisé par la bulle (navigateurs Chrome / Android, qui savent l'appliquer). */
function LensFilter() {
  return (
    <svg width="0" height="0" aria-hidden className="pointer-events-none absolute">
      <filter id="gb-lens" x="0" y="0" width="100%" height="100%" colorInterpolationFilters="sRGB">
        <feImage href={MAP_X} preserveAspectRatio="none" result="rx" />
        <feImage href={MAP_Y} preserveAspectRatio="none" result="gy" />
        <feComposite in="rx" in2="gy" operator="arithmetic" k2="1" k3="1" result="map0" />
        <feImage href={MAP_CENTER} preserveAspectRatio="none" result="center" />
        <feComposite in="center" in2="map0" operator="over" result="map" />
        <feDisplacementMap in="SourceGraphic" in2="map" scale="26" xChannelSelector="R" yChannelSelector="G" />
      </filter>
    </svg>
  );
}

/**
 * Barre d'onglets fixe en bas d'écran, à portée de pouce (mobile uniquement).
 * On peut glisser le doigt dessus : une bulle de verre suit le doigt et l'onglet est ouvert au lâcher.
 * Comme sur iOS 26 : en faisant défiler vers le bas, elle se rétracte en bulle (onglet actif seul) ;
 * elle revient quand on remonte ou qu'on la touche.
 */
export function MobileTabBar() {
  const router = useRouter();
  const pathname = usePathname();
  const path = activeHref(pathname);
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
  const [collapsed, setCollapsed] = useState(false);
  const nav = useRef<HTMLElement>(null);

  // Défilement vers le bas : la barre se rétracte ; vers le haut (ou en haut de page) : elle revient.
  useEffect(() => {
    let lastY = window.scrollY;
    let run = 0; // distance parcourue dans le même sens
    const onScroll = () => {
      const y = window.scrollY;
      const d = y - lastY;
      lastY = y;
      if (y < 80) {
        run = 0;
        return setCollapsed(false);
      }
      run = Math.sign(d) === Math.sign(run) ? run + d : d;
      if (run > 30) setCollapsed(true);
      else if (run < -30) setCollapsed(false);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  useEffect(() => setCollapsed(false), [pathname]);
  // Pendant le passage barre ↔ bulle, le contenu est coupé aux bords de la barre.
  const firstMorph = useRef(true);
  useEffect(() => {
    const el = nav.current;
    if (!el || firstMorph.current) return void (firstMorph.current = false);
    el.dataset.morph = "";
    const t = window.setTimeout(() => delete el.dataset.morph, 550);
    return () => window.clearTimeout(t);
  }, [collapsed]);

  // Réfraction réelle seulement là où le navigateur l'applique au fond (Chrome, Android) ; Safari garde le flou.
  useEffect(() => {
    const ua = navigator.userAgent;
    if (/Chrome\//.test(ua) && !/iPhone|iPad|Edg\//.test(ua)) document.documentElement.setAttribute("data-refract", "1");
  }, []);

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
  // Page hors onglets (Réglages, fiche, article…) : la bulle rétractée garde le dernier onglet visité, comme sur iOS.
  const lastTab = useRef(0);
  if (target >= 0) lastTab.current = target;
  const bubbleTab = target >= 0 ? target : lastTab.current;
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

  // Onglet gardé dans la bulle rétractée (CSSOM, compatible avec la CSP).
  useLayoutEffect(() => {
    nav.current?.style.setProperty("--tb-i", String(bubbleTab));
  }, [bubbleTab]);

  const relX = (e: PointerEvent) => e.clientX - (list.current?.getBoundingClientRect().left ?? 0);

  const down = (e: PointerEvent<HTMLUListElement>) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    // Bulle rétractée : le toucher la redéploie, sans changer d'onglet.
    if (collapsed) {
      setCollapsed(false);
      handled.current = true;
      window.setTimeout(() => (handled.current = false), 400);
      return;
    }
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
    if (!item) return;
    if (item.href !== active) {
      setPending(index);
      router.push(item.href);
    } else if ((pathname.replace(/\/+$/, "") || "/") !== item.href) {
      // Onglet déjà actif depuis une page de cette rubrique (un article depuis l'accueil…) : retour à l'onglet, comme sur iOS.
      router.push(item.href);
    } else {
      // Déjà sur l'onglet : retour en haut de la page.
      window.scrollTo({ top: 0, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
    }
  };
  const cancel = () => {
    start.current = null;
    setDragX(null);
    setPressed(false);
  };

  return (
    <nav
      ref={nav}
      data-collapsed={collapsed ? "" : undefined}
      aria-label="Navigation principale"
      className="tabbar fixed inset-x-0 bottom-0 z-40 glass-bar border-t pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      <LensFilter />
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
            <li key={href} data-current={i === target ? "" : undefined} data-bubble={i === bubbleTab ? "" : undefined} className="relative z-10">
              <Link
                href={href}
                aria-current={current ? "page" : undefined}
                onClick={(e) => handled.current && e.preventDefault()}
                draggable={false}
                className={`flex h-14 flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition-colors ${
                  hover === i ? "text-accent" : "text-muted"
                }`}
              >
                <Icon className={`tab-icon size-5 transition-transform duration-200 ${pressed && hover === i ? "scale-125" : ""}`} aria-hidden />
                <span className="tab-label">{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
