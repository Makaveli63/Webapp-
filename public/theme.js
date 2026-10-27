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
  // Style complet du site : « gamingbase » (par défaut) ou « ios » (inspiré d'Apple Music sur iOS).
  function style() {
    try {
      return localStorage.getItem("gb-style") || "gamingbase";
    } catch {
      return "gamingbase";
    }
  }
  function apply() {
    root.setAttribute("data-accent", accent());
    var st = style();
    if (st === "ios") root.setAttribute("data-style", "ios");
    else root.removeAttribute("data-style");
    var c = choice();
    var dark = c === "dark" || (c === "system" && media.matches);
    root.setAttribute("data-theme", dark ? "dark" : "light");
    root.setAttribute("data-theme-choice", c);
    document.querySelectorAll('meta[name="theme-color"]').forEach(function (m) {
      m.setAttribute("content", st === "ios" ? (dark ? "#000000" : "#f2f2f7") : dark ? "#0b0d12" : "#f6f7fb");
    });
  }
  apply();
  media.addEventListener("change", apply);
  window.addEventListener("gb-theme-change", apply);
  document.addEventListener("DOMContentLoaded", apply);
})();
