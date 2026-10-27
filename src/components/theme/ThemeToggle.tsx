"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

type Choice = "system" | "light" | "dark";
const NEXT: Record<Choice, Choice> = { system: "light", light: "dark", dark: "system" };
const LABEL: Record<Choice, string> = { system: "Thème : automatique", light: "Thème : clair", dark: "Thème : sombre" };

/** Bouton qui alterne automatique → clair → sombre (appliqué par public/theme.js). */
export function ThemeToggle({ className = "" }: { className?: string }) {
  const [choice, setChoice] = useState<Choice>("system");

  useEffect(() => {
    setChoice((document.documentElement.getAttribute("data-theme-choice") as Choice) || "system");
  }, []);

  const change = () => {
    const next = NEXT[choice];
    try {
      localStorage.setItem("gb-theme", next);
    } catch {
      /* stockage indisponible */
    }
    setChoice(next);
    window.dispatchEvent(new Event("gb-theme-change"));
  };

  const Icon = choice === "dark" ? Moon : choice === "light" ? Sun : Monitor;
  return (
    <button
      type="button"
      onClick={change}
      aria-label={`${LABEL[choice]} (changer)`}
      title={LABEL[choice]}
      className={`flex size-11 items-center justify-center rounded-full text-muted hover:text-fg ${className}`}
    >
      <Icon className="size-5" aria-hidden />
    </button>
  );
}
