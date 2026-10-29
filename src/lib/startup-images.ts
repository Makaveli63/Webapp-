/**
 * Écrans de démarrage d'iOS (site ajouté à l'écran d'accueil). Sans eux, iOS affiche un écran blanc
 * pendant l'ouverture. Images générées par scripts/startup-images.mjs.
 * [largeur, hauteur, densité] des écrans d'iPhone et d'iPad, en portrait.
 */
const DEVICES: [number, number, number][] = [
  [440, 956, 3], [402, 874, 3], [420, 912, 3], [430, 932, 3], [393, 852, 3], [428, 926, 3], [390, 844, 3],
  [375, 812, 3], [414, 896, 3], [414, 896, 2], [414, 736, 3], [375, 667, 2], [320, 568, 2],
  [1032, 1376, 2], [1024, 1366, 2], [834, 1210, 2], [834, 1194, 2], [820, 1180, 2], [834, 1112, 2], [810, 1080, 2], [768, 1024, 2], [744, 1133, 2],
];

export function startupImages(base: string) {
  return DEVICES.flatMap(([w, h, dpr]) =>
    (["light", "dark"] as const).map((theme) => ({
      url: `${base}/splash/${w}x${h}@${dpr}-${theme}.jpg`,
      media: `(device-width: ${w}px) and (device-height: ${h}px) and (-webkit-device-pixel-ratio: ${dpr}) and (orientation: portrait) and (prefers-color-scheme: ${theme})`,
    })),
  );
}
