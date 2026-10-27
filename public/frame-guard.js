// Protection anti-clickjacking : la page refuse de s'afficher dans un cadre tiers.
// (L'en-tête frame-ancestors n'est pas disponible sur GitHub Pages.)
if (window.top !== window.self) {
  document.documentElement.style.display = "none";
  try {
    window.top.location = window.self.location.href;
  } catch {
    /* le cadre parent bloque la redirection : la page reste masquée */
  }
}
