import type { Metadata } from "next";
import { AppNotificationsToggle } from "@/components/app/AppNotificationsToggle";
import { LiveActivityToggle } from "@/components/app/LiveActivityToggle";
import { AccentPicker } from "@/components/settings/AccentPicker";
import { ThemePicker } from "@/components/settings/ThemePicker";
import { SyncPanel } from "@/components/sync/SyncPanel";

export const metadata: Metadata = { title: "Réglages" };

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-extrabold text-heading sm:text-3xl">Réglages</h1>
        <p className="mt-2 text-muted">Notifications, synchronisation entre tes appareils, thème et couleur du site.</p>
      </header>
      <AppNotificationsToggle />
      <LiveActivityToggle />
      <SyncPanel />
      <ThemePicker />
      <AccentPicker />
    </div>
  );
}
