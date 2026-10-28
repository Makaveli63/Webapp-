// Thème clair / sombre : choix du visiteur (bouton dans l'en-tête), sinon réglage de l'appareil.
// Exécuté avant l'affichage pour éviter tout flash de la mauvaise couleur.
(function () {
  var root = document.documentElement;
  var media = matchMedia("(prefers-color-scheme: dark)");
  function choice() {
    try {
      return localStorage.getItem("gb-theme") || "system";
    } catch {
      return "system";
    }
  }
  // Couleur d'accent choisie dans Mes favoris → Réglages (violet par défaut).
  function accent() {
    try {
      return localStorage.getItem("gb-accent") || "violet";
    } catch {
      return "violet";
    }
  }
  // Style complet du site : « capsule » (par défaut) ou « gamingbase » (l'ancien nom « ios » est repris).
  function style() {
    try {
      var v = localStorage.getItem("gb-style");
      return v === "ios" ? "capsule" : v || "capsule"; // Capsule par défaut, sur le site comme dans les apps
    } catch {
      return "capsule";
    }
  }
  // Style Capsule : couleur (rose par défaut) et transparence (verre par défaut).
  function read(key, fallback) {
    try {
      return localStorage.getItem(key) || fallback;
    } catch {
      return fallback;
    }
  }
  function apply() {
    root.setAttribute("data-accent", accent());
    root.setAttribute("data-tint", read("gb-tint", "gamingbase"));
    root.setAttribute("data-glass", read("gb-glass", "verre"));
    var st = style();
    if (st === "capsule") root.setAttribute("data-style", "capsule");
    else root.removeAttribute("data-style");
    var c = choice();
    var dark = c === "dark" || (c === "system" && media.matches);
    root.setAttribute("data-theme", dark ? "dark" : "light");
    root.setAttribute("data-theme-choice", c);
    document.querySelectorAll('meta[name="theme-color"]').forEach(function (m) {
      m.setAttribute("content", st === "capsule" ? (dark ? "#000000" : "#f2f2f7") : dark ? "#0b0d12" : "#f6f7fb");
    });
  }
  apply();
  // Pas de zoom par pincement : Safari sur iPhone ignore « user-scalable=no », on bloque donc le geste lui-même.
  ["gesturestart", "gesturechange", "gestureend"].forEach(function (type) {
    document.addEventListener(type, function (e) {
      e.preventDefault();
    }, { passive: false });
  });
  document.addEventListener("touchmove", function (e) {
    if (e.touches && e.touches.length > 1) e.preventDefault();
  }, { passive: false });
  media.addEventListener("change", apply);
  window.addEventListener("gb-theme-change", apply);
  document.addEventListener("DOMContentLoaded", apply);
})();
