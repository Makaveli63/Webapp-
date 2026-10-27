import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { Footer } from "@/components/layout/Footer";
import { Navbar } from "@/components/layout/Navbar";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jetbrains" });

export const metadata: Metadata = {
  title: { default: "Pixel Underground", template: "%s · Pixel Underground" },
  description:
    "Actualité du jeu vidéo et suivi pédagogique de la scène homebrew PS5 et Switch 2, en français.",
  referrer: "strict-origin-when-cross-origin",
  formatDetection: { email: false, address: false, telephone: false },
};

const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr" className={`${inter.variable} ${mono.variable}`}>
      <head>
        {/* Chargé en premier, de façon bloquante, pour masquer la page si elle est encadrée. */}
        {/* eslint-disable-next-line @next/next/no-sync-scripts */}
        <script src={`${BASE_PATH}/frame-guard.js`} />
      </head>
      <body className="flex min-h-dvh flex-col font-sans antialiased">
        <Navbar />
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
