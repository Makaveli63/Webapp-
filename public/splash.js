// Animation d'ouverture : une seule fois par visite (onglet), jamais si l'appareil demande moins d'animations.
try {
  var root = document.documentElement;
  if (sessionStorage.getItem("gb-splash") || matchMedia("(prefers-reduced-motion: reduce)").matches) {
    root.setAttribute("data-splash", "off");
  } else {
    sessionStorage.setItem("gb-splash", "1");
    // Toucher l'écran pendant l'animation la passe (et la barre d'onglets apparaît tout de suite).
    var skip = function () {
      root.setAttribute("data-splash", "off");
      window.dispatchEvent(new Event("gb-splash-skip"));
    };
    document.addEventListener("pointerdown", skip, { once: true, capture: true });
    setTimeout(function () { document.removeEventListener("pointerdown", skip, { capture: true }); }, 3600);
  }
} catch {
  /* stockage indisponible : l'animation se joue, sans conséquence */
}
