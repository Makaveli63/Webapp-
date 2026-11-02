import type { Metadata } from "next";
import { AppErrorReport } from "@/components/app/AppErrorReport";
import { AppNotificationsToggle } from "@/components/app/AppNotificationsToggle";
import { LiveActivityToggle } from "@/components/app/LiveActivityToggle";
import { OpenLinksSetting } from "@/components/app/OpenLinksSetting";
import { ConsolesSetting } from "@/components/settings/ConsolesSetting";
import { FeedbackSetting } from "@/components/settings/FeedbackSetting";
import { SpoilerToggle } from "@/components/settings/SpoilerToggle";
import { MutedList } from "@/components/settings/MutedList";
import { VoiceSettings } from "@/components/settings/VoiceSettings";
import { WebPushToggle } from "@/components/settings/WebPushToggle";
import { ThemePicker } from "@/components/settings/ThemePicker";
import { SuggestShortcut } from "@/components/suggestions/SuggestShortcut";
import { SyncPanel } from "@/components/sync/SyncPanel";

export const metadata: Metadata = { title: "Réglages" };

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-extrabold text-heading sm:text-3xl">Réglages</h1>
        <p className="mt-2 text-muted">Notifications, synchronisation entre tes appareils, thème et couleur du site.</p>
      </header>
      <AppErrorReport />
      <SuggestShortcut />
      <AppNotificationsToggle />
      <WebPushToggle />
      <LiveActivityToggle />
      <OpenLinksSetting />
      <ConsolesSetting />
      <SpoilerToggle />
      <MutedList />
      <FeedbackSetting />
      <VoiceSettings />
      <SyncPanel />
      <ThemePicker />
    </div>
  );
}
