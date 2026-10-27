import type { NextConfig } from "next";

// Export statique : le site est un simple dossier `out/` hébergeable gratuitement
// (GitHub Pages, Cloudflare Pages, Netlify…). NEXT_PUBLIC_BASE_PATH sert quand
// le site est publié dans un sous-dossier, comme sur GitHub Pages (/Webapp-).
const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  basePath: process.env.NEXT_PUBLIC_BASE_PATH || undefined,
  images: { unoptimized: true },
};

export default nextConfig;
