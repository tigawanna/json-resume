import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useEventSourcedDb } from "@/data-access-layer/event-sourced/provider";
import { useEventSourcedSyncStatus } from "@/data-access-layer/event-sourced/sync/use-sync-status";
import { createSortableColumns } from "@/lib/tanstack/db/sortable-columns";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { EventSourcedListScaffold } from "../../-components/EventSourcedListScaffold";
import { EventSourcedSortToolbar } from "../../-components/EventSourcedSortToolbar";
import type { EventQueueTab } from "../../-utils/list-search";
import { Route } from "..";
import { DeadLetterList, DeadLetterRetryAllButton } from "./DeadLetterList";
import { InboxList } from "./InboxList";
import { OutboxList } from "./OutboxList";

const ROUTE_ID = "/_dashboard/events/" as const;

const EVENT_TAB_HINTS: Record<EventQueueTab, string> = {
  outbox: "Local changes waiting to be pushed to the server.",
  inbox: "Remote changes received from the server to be applied locally.",
  deadletter: "Permanently rejected events. Retry to requeue, or discard to drop them.",
};

export function EventsView() {
  const db = useEventSourcedDb();
  const { isSyncing, pendingCount } = useEventSourcedSyncStatus();
  const navigate = Route.useNavigate();
  const { tab: tabParam } = Route.useSearch();
  const tab: EventQueueTab = tabParam ?? "outbox";
  const [totalPages, setTotalPages] = useState(0);

  const syncActions = (
    <div
      className="text-muted-foreground flex items-center gap-2 text-sm"
      data-test="events-sync-status"
      aria-live="polite"
    >
      {isSyncing ? (
        <>
          <Loader2 className="size-4 animate-spin" />
          Syncing…
        </>
      ) : (
        <span>{pendingCount} pending</span>
      )}
    </div>
  );

  const filters =
    tab === "outbox" ? (
      <EventSourcedSortToolbar
        collection={db.collections.outbox}
        sortableColumns={createSortableColumns(db.collections.outbox, [
          { value: "type", label: "Type" },
          { value: "collectionId", label: "Collection" },
          { value: "localSeq", label: "Seq" },
          { value: "sync", label: "Status" },
          { value: "timestamp", label: "Time" },
        ])}
        defaultSortBy="localSeq"
      />
    ) : tab === "inbox" ? (
      <EventSourcedSortToolbar
        collection={db.collections.inbox}
        sortableColumns={createSortableColumns(db.collections.inbox, [
          { value: "type", label: "Type" },
          { value: "collectionId", label: "Collection" },
          { value: "globalSeq", label: "Seq" },
          { value: "sync", label: "Status" },
          { value: "timestamp", label: "Time" },
        ])}
        defaultSortBy="globalSeq"
      />
    ) : (
      <EventSourcedSortToolbar
        collection={db.collections.deadletter}
        sortableColumns={createSortableColumns(db.collections.deadletter, [
          { value: "collectionId", label: "Collection" },
          { value: "type", label: "Type" },
          { value: "reason", label: "Reason" },
          { value: "failedAt", label: "Failed" },
        ])}
        defaultSortBy="failedAt"
      />
    );

  function setTab(next: string) {
    const nextTab = next as EventQueueTab;
    void navigate({
      search: (prev) => ({
        ...prev,
        tab: nextTab === "outbox" ? undefined : nextTab,
        page: undefined,
        sortBy: undefined,
        sortDirection: undefined,
      }),
      replace: true,
    });
    setTotalPages(0);
  }

  return (
    <EventSourcedListScaffold
      routeID={ROUTE_ID}
      title="Events"
      description={EVENT_TAB_HINTS[tab]}
      searchPlaceholder="Search events…"
      totalPages={totalPages}
      dataTest="events-page"
      filters={filters}
      actions={
        <>
          {syncActions}
          {tab === "deadletter" ? <DeadLetterRetryAllButton /> : null}
        </>
      }
    >
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList data-test="events-tabs">
          <TabsTrigger value="outbox">Outbox</TabsTrigger>
          <TabsTrigger value="inbox">Inbox</TabsTrigger>
          <TabsTrigger value="deadletter">Dead letter</TabsTrigger>
        </TabsList>
      </Tabs>

      {tab === "outbox" ? <OutboxList onTotalPages={setTotalPages} /> : null}
      {tab === "inbox" ? <InboxList onTotalPages={setTotalPages} /> : null}
      {tab === "deadletter" ? <DeadLetterList onTotalPages={setTotalPages} /> : null}
    </EventSourcedListScaffold>
  );
}
