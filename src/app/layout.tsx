import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { Footer } from "@/components/layout/Footer";
import { MobileTabBar } from "@/components/layout/MobileTabBar";
import { Navbar } from "@/components/layout/Navbar";
import { ReleaseBanner } from "@/components/releases/ReleaseBanner";
import { Splash } from "@/components/splash/Splash";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jetbrains" });

const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export const metadata: Metadata = {
  title: { default: "Pixel Underground", template: "%s · Pixel Underground" },
  description: "L'actualité du jeu vidéo en français : news, tests et nouvelles consoles, mis à jour toutes les 2 heures.",
  manifest: `${BASE_PATH}/manifest.webmanifest`,
  icons: { icon: `${BASE_PATH}/icon.svg`, apple: `${BASE_PATH}/apple-touch-icon.png` },
  appleWebApp: { capable: true, title: "Pixel Underground", statusBarStyle: "default" },
  authors: [{ name: "Makaveli63" }],
  creator: "Makaveli63",
  referrer: "strict-origin-when-cross-origin",
  formatDetection: { email: false, address: false, telephone: false },
};

// Couleur de la barre du navigateur assortie au mode clair / sombre du téléphone.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  colorScheme: "light dark",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f6f7fb" },
    { media: "(prefers-color-scheme: dark)", color: "#0b0d12" },
  ],
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    // suppressHydrationWarning : public/splash.js peut ajouter data-splash avant l'hydratation.
    <html lang="fr" className={`${inter.variable} ${mono.variable}`} suppressHydrationWarning>
      <head>
        {/* Chargé en premier, de façon bloquante, pour masquer la page si elle est encadrée. */}
        {/* eslint-disable-next-line @next/next/no-sync-scripts */}
        <script src={`${BASE_PATH}/frame-guard.js`} />
        {/* eslint-disable-next-line @next/next/no-sync-scripts */}
        <script src={`${BASE_PATH}/splash.js`} />
      </head>
      <body className="flex min-h-dvh flex-col font-sans antialiased">
        <Splash />
        <Navbar />
        <ReleaseBanner />
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:py-8">{children}</main>
        <Footer />
        <MobileTabBar />
      </body>
    </html>
  );
}
