import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { Footer } from "@/components/layout/Footer";
import { MobileTabBar } from "@/components/layout/MobileTabBar";
import { Navbar } from "@/components/layout/Navbar";
import { ReleaseBanner } from "@/components/releases/ReleaseBanner";
import { PageTransition } from "@/components/layout/PageTransition";
import { NativeTabsBridge } from "@/components/app/NativeTabsBridge";
import { NotifBridge } from "@/components/app/NotifBridge";
import { StaleBuildGuard } from "@/components/app/ErrorScreen";
import { ListenPlayer } from "@/components/layout/ListenPlayer";
import { AppleTransitions } from "@/components/layout/AppleTransitions";
import { Splash } from "@/components/splash/Splash";
import { DynamicBackground } from "@/components/theme/DynamicBackground";
import { Tracker } from "@/components/analytics/Tracker";
import { PullToRefresh } from "@/components/layout/PullToRefresh";
import { AutoSync } from "@/components/sync/AutoSync";
import { OfflineSupport } from "@/components/offline/OfflineSupport";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jetbrains" });

const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export const metadata: Metadata = {
  title: { default: "GamingBase", template: "%s · GamingBase" },
  description: "L'actualité du jeu vidéo et de l'anime en français : news, tests, sorties et épisodes, mis à jour toutes les 2 heures.",
  manifest: `${BASE_PATH}/manifest.webmanifest`,
  // « ?v= » : oblige les navigateurs à recharger l'icône de l'onglet (ils la gardent longtemps en mémoire).
  icons: {
    icon: [
      { url: `${BASE_PATH}/icon.svg?v=4`, type: "image/svg+xml" },
      { url: `${BASE_PATH}/favicon.ico?v=4`, sizes: "48x48" },
    ],
    apple: `${BASE_PATH}/apple-touch-icon.png?v=4`,
  },
  appleWebApp: { capable: true, title: "GamingBase", statusBarStyle: "default" },
  authors: [{ name: "Makaveli63" }],
  creator: "Makaveli63",
  referrer: "strict-origin-when-cross-origin",
  formatDetection: { email: false, address: false, telephone: false },
  metadataBase: new URL(`https://makaveli63.github.io${BASE_PATH}/`),
  openGraph: {
    siteName: "GamingBase",
    locale: "fr_FR",
    type: "website",
    images: [`${BASE_PATH}/icon-512.png`],
  },
};

// Couleur de la barre du navigateur assortie au mode clair / sombre du téléphone.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // Pas de zoom, comme une app (Safari sur iPhone ignore cette consigne : voir aussi public/theme.js).
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  colorScheme: "light dark",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f6f7fb" },
    { media: "(prefers-color-scheme: dark)", color: "#0b0d12" },
  ],
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    // suppressHydrationWarning : public/theme.js et splash.js ajoutent data-theme / data-splash avant l'hydratation.
    <html lang="fr" className={`${inter.variable} ${mono.variable}`} suppressHydrationWarning>
      <head>
        {/* Chargé en premier, de façon bloquante, pour masquer la page si elle est encadrée. */}
        {/* eslint-disable-next-line @next/next/no-sync-scripts */}
        <script src={`${BASE_PATH}/frame-guard.js`} />
        {/* eslint-disable-next-line @next/next/no-sync-scripts */}
        <script src={`${BASE_PATH}/theme.js`} />
        {/* eslint-disable-next-line @next/next/no-sync-scripts */}
        <script src={`${BASE_PATH}/splash.js`} />
      </head>
      <body className="flex min-h-dvh flex-col font-sans antialiased">
        <Splash />
        <DynamicBackground />
        <Navbar />
        <ReleaseBanner />
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:py-8">
          <PageTransition>{children}</PageTransition>
        </main>
        <Footer />
        <ListenPlayer />
        <MobileTabBar />
        <NativeTabsBridge />
        <NotifBridge />
        <StaleBuildGuard />
        <AppleTransitions />
        <Tracker />
        <PullToRefresh />
        <AutoSync />
        <OfflineSupport />
      </body>
    </html>
  );
}
