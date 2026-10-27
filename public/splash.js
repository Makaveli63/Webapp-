// Animation d'ouverture : une seule fois par visite (onglet), jamais si l'appareil demande moins d'animations.
try {
  var root = document.documentElement;
  if (sessionStorage.getItem("pu-splash") || matchMedia("(prefers-reduced-motion: reduce)").matches) {
    root.setAttribute("data-splash", "off");
  } else {
    sessionStorage.setItem("pu-splash", "1");
  }
} catch {
  /* stockage indisponible : l'animation se joue, sans conséquence */
}
