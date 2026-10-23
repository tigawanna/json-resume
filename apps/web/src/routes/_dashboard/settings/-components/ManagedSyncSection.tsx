import { ManagedSyncControls } from "@/components/sync/ManagedSyncControls";
import { EventSourcedDbProvider } from "@/data-access-layer/event-sourced/provider";
import { RefreshCw } from "lucide-react";
import { SettingsSection } from "./SettingsSection";

export function ManagedSyncSection() {
  return (
    <SettingsSection
      id="managed-sync"
      icon={RefreshCw}
      title="Managed sync"
      description="Keep this browser as the only copy, or push the outbox to the server after you sign in."
    >
      <EventSourcedDbProvider
        fallback={<p className="text-muted-foreground text-sm">Opening the local database…</p>}
      >
        <ManagedSyncControls presentation="plain" signIn="link" />
      </EventSourcedDbProvider>
    </SettingsSection>
  );
}
