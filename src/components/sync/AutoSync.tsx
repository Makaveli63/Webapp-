"use client";

import { useEffect } from "react";
import { startAutoSync } from "@/lib/sync";
import { socialEnabled } from "@/lib/social";

/** Synchronisation en arrière-plan si cet appareil est relié à un code (rien sinon). */
export function AutoSync() {
  useEffect(() => (socialEnabled ? startAutoSync() : undefined), []);
  return null;
}
