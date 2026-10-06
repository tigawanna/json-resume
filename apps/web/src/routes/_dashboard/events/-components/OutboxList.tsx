import { ADMIN_LIST_PER_PAGE } from "@/components/pagination/constants";
import { usePageSearchQuery } from "@/components/search/use-page-search-query";
import { useEventSourcedDb } from "@/data-access-layer/event-sourced/provider";
import { RouterPendingComponent } from "@/lib/tanstack/router/RouterPendingComponent";
import { unwrapUnknownError } from "@/utils/errors";
import { count, eq, useLiveQuery } from "@tanstack/react-db";
import { Inbox } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { LibraryEmpty } from "../../-components/LibraryEmpty";
import { ResponsiveEntityTable } from "../../-components/ResponsiveEntityTable";
import {
  listOffset,
  listOrderByRef,
  listSortDirection,
  orIlike,
  totalPagesFromCount,
} from "../../-utils/list-query";
import { Route } from "..";
import { EventPayloadDialog } from "./EventPayloadDialog";
import { EventQueueRowActions, eventQueueColumns } from "./event-queue-table";
import { toEventView, type SyncEventView } from "./event-view";

const ROUTE_ID = "/_dashboard/events/" as const;

type OutboxListProps = {
  onTotalPages: (totalPages: number) => void;
};

export function OutboxList({ onTotalPages }: OutboxListProps) {
  const db = useEventSourcedDb();
  const { page = 1, q = "", sortBy, sortDirection } = Route.useSearch();
  const { clearSearch } = usePageSearchQuery(ROUTE_ID);
  const [inspecting, setInspecting] = useState<SyncEventView | null>(null);

  const keyword = q.trim();
  const offset = listOffset(page);
  const sortDir = listSortDirection(sortDirection);

  const { data: items, isLoading } = useLiveQuery(
    (query) => {
      const waiting = query
        .from({ row: db.collections.outbox })
        .where(({ row }) => eq(row.sync, false));
      const filtered = keyword
        ? waiting.where(({ row }) => orIlike(keyword, row.collectionId, row.type, row.eventId))
        : waiting;
      return filtered
        .orderBy(({ row }) => listOrderByRef(row, sortBy, "localSeq"), sortDir)
        .limit(ADMIN_LIST_PER_PAGE)
        .offset(offset);
    },
    [keyword, offset, sortBy, sortDir],
  );

  const { data: totals } = useLiveQuery(
    (query) => {
      const waiting = query
        .from({ row: db.collections.outbox })
        .where(({ row }) => eq(row.sync, false));
      const filtered = keyword
        ? waiting.where(({ row }) => orIlike(keyword, row.collectionId, row.type, row.eventId))
        : waiting;
      return filtered.select(({ row }) => ({ total: count(row.eventId) }));
    },
    [keyword],
  );

  const rows = (items ?? []).map(toEventView);
  const totalPages = totalPagesFromCount(totals?.[0]?.total ?? 0);

  useEffect(() => {
    onTotalPages(totalPages);
  }, [onTotalPages, totalPages]);

  async function handleDelete(eventId: string) {
    await db.collections.outbox.delete(eventId).isPersisted.promise;
  }

  if (isLoading) return <RouterPendingComponent />;

  if (rows.length === 0) {
    return (
      <LibraryEmpty
        icon={Inbox}
        title="Outbox is empty"
        description="Local mutations waiting to be pushed to the server will appear here."
        hasSearch={keyword.length > 0}
        onClearSearch={clearSearch}
        dataTest="outbox-empty"
      />
    );
  }

  return (
    <>
      <ResponsiveEntityTable
        rows={rows}
        columns={eventQueueColumns("Pushed", "Pending", "localSeq")}
        mobileTitle={(row) => row.collectionId}
        mobileSubtitle={(row) => row.type}
        dataTest="outbox-table"
        defaultSortBy="localSeq"
        actions={(row) => (
          <EventQueueRowActions
            onInspect={() => setInspecting(row)}
            onDelete={() => {
              void handleDelete(row.eventId).catch((err: unknown) => {
                toast.error("Failed to delete event", {
                  description: unwrapUnknownError(err).message,
                });
              });
            }}
          />
        )}
      />
      {inspecting ? (
        <EventPayloadDialog
          event={inspecting}
          syncedLabel="Pushed"
          pendingLabel="Pending"
          open
          onOpenChange={(open) => {
            if (!open) setInspecting(null);
          }}
          onDelete={handleDelete}
        />
      ) : null}
    </>
  );
}
