import { ManagedSyncControls } from "@/components/sync/ManagedSyncControls";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EventSourcedDbProvider } from "@/data-access-layer/event-sourced/provider";

export function ManagedSyncSection() {
  return (
    <div id="managed-sync">
      <EventSourcedDbProvider
        fallback={
          <Card>
            <CardHeader>
              <CardTitle>Managed sync</CardTitle>
              <CardDescription>Opening the local database…</CardDescription>
            </CardHeader>
          </Card>
        }
      >
        <ManagedSyncControls />
      </EventSourcedDbProvider>
    </div>
  );
}
