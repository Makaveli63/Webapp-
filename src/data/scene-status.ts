import type {
  ConsoleSummary,
  ExploitStatus,
  FirmwareStatus,
  VulnerabilityKind,
} from "@/types";

/**
 * DONNÉES D'EXEMPLE.
 * Ces entrées servent à illustrer l'interface ; elles ne reflètent pas
 * l'état réel de la scène. Remplacez-les par des informations vérifiées
 * et sourcées avant toute mise en production.
 */
export const consoleSummaries: ConsoleSummary[] = [
  {
    console: "PS5",
    latestFirmware: "X.XX (exemple)",
    headline:
      "Exemple : anciennes versions documentées par la recherche publique, firmwares récents non concernés.",
    status: "homebrew",
    updatedAt: "2026-10-20",
  },
  {
    console: "Switch 2",
    latestFirmware: "X.X.X (exemple)",
    headline:
      "Exemple : recherches en cours, aucune publication exploitable annoncée.",
    status: "recherche",
    updatedAt: "2026-10-22",
  },
];

export const firmwareMatrix: FirmwareStatus[] = [
  {
    id: "ps5-a",
    console: "PS5",
    firmwareRange: "≤ A.AA (exemple)",
    vulnerability: { kind: "webkit", label: "Point d'entrée navigateur (exemple)" },
    status: "homebrew",
    tooling: "Environnement homebrew documenté publiquement",
    guideSlug: "comprendre-chaine-exploitation",
    updatedAt: "2026-09-12",
  },
  {
    id: "ps5-b",
    console: "PS5",
    firmwareRange: "B.BB – C.CC (exemple)",
    vulnerability: { kind: "kernel", label: "Faille noyau (exemple)" },
    status: "poc",
    tooling: "Preuve de concept de chercheurs",
    guideSlug: "comprendre-chaine-exploitation",
    updatedAt: "2026-10-01",
  },
  {
    id: "ps5-c",
    console: "PS5",
    firmwareRange: "≥ D.DD (exemple)",
    vulnerability: { kind: "inconnu", label: "Aucune vulnérabilité publique" },
    status: "aucun",
    tooling: "—",
    updatedAt: "2026-10-20",
    notes: "Restez sur le firmware officiel si vous n'avez pas de projet de recherche.",
  },
  {
    id: "sw2-a",
    console: "Switch 2",
    firmwareRange: "Toutes versions (exemple)",
    vulnerability: { kind: "materiel", label: "Analyse matérielle en cours" },
    status: "recherche",
    tooling: "Aucun outil public",
    guideSlug: "securite-materielle-fuses",
    updatedAt: "2026-10-22",
  },
  {
    id: "sw2-b",
    console: "Switch 2",
    firmwareRange: "≥ E.E.E (exemple)",
    vulnerability: { kind: "inconnu", label: "Aucune vulnérabilité publique" },
    status: "aucun",
    tooling: "—",
    updatedAt: "2026-10-22",
  },
];

export const STATUS_META: Record<
  ExploitStatus,
  { label: string; className: string; description: string }
> = {
  aucun: {
    label: "Aucun",
    className: "bg-zinc-500/15 text-zinc-300 ring-zinc-500/30",
    description: "Aucune vulnérabilité publique connue.",
  },
  recherche: {
    label: "Recherche",
    className: "bg-amber-500/15 text-amber-300 ring-amber-500/30",
    description: "Travaux annoncés, rien de publié.",
  },
  poc: {
    label: "Preuve de concept",
    className: "bg-sky-500/15 text-sky-300 ring-sky-500/30",
    description: "Démonstration technique publiée, non destinée au grand public.",
  },
  homebrew: {
    label: "Homebrew",
    className: "bg-emerald-500/15 text-emerald-300 ring-emerald-500/30",
    description: "Environnement homebrew public et documenté.",
  },
};

export const VULN_LABEL: Record<VulnerabilityKind, string> = {
  webkit: "WebKit",
  kernel: "Noyau",
  hyperviseur: "Hyperviseur",
  bootrom: "Bootrom",
  materiel: "Matériel",
  inconnu: "—",
};
