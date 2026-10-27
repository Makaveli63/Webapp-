import Link from "next/link";

export default function NotFound() {
  return (
    <div className="py-20 text-center">
      <p className="font-mono text-6xl font-bold text-accent">404</p>
      <h1 className="mt-4 text-2xl font-bold text-white">Page introuvable</h1>
      <Link href="/" className="mt-6 inline-block text-accent-2 underline underline-offset-2">Retour à l&apos;accueil</Link>
    </div>
  );
}
