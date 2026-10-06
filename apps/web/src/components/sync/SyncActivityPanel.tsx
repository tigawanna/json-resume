import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useEventSourcedDb } from "@/data-access-layer/event-sourced/provider";
import { cn } from "@/lib/utils";
import type { EventQueueTab } from "@/routes/_dashboard/-utils/list-search";
import { count, useLiveQuery } from "@tanstack/react-db";
import { Link } from "@tanstack/react-router";
import type { MutationType } from "event-sourced-collection";
import { Activity, useState } from "react";

const PREVIEW_LIMIT = 10;

const HINTS: Record<EventQueueTab, string> = {
  outbox: "Local changes waiting to be pushed.",
  inbox: "Changes pulled from the server. Applied rows are already on this device.",
  deadletter: "Rejected events. Open the full queue to retry or discard them.",
};

const TYPE_CLASS: Record<MutationType, string> = {
  insert: "text-primary",
  update: "text-warning",
  delete: "text-error",
};

type SyncActivityPanelProps = {
  preferredTab: EventQueueTab;
  active: boolean;
  onOpenEvents: () => void;
};

export function SyncActivityPanel({ preferredTab, active, onOpenEvents }: SyncActivityPanelProps) {
  const [tab, setTab] = useState<EventQueueTab>(preferredTab);
  const [wasActive, setWasActive] = useState(active);
  if (active !== wasActive) {
    setWasActive(active);
    if (active) setTab(preferredTab);
  }
  const outboxCount = useOutboxCount();
  const inboxCount = useInboxCount();
  const deadLetterCount = useDeadLetterCount();
  const activeCount =
    tab === "outbox" ? outboxCount : tab === "inbox" ? inboxCount : deadLetterCount;

  return (
    <section
      className="border-border/70 flex flex-col gap-3 border-t pt-6"
      data-test="sync-activity-panel"
    >
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-sm font-medium">Activity</h2>
        <Link
          to="/events"
          search={{ tab: tab === "outbox" ? undefined : tab }}
          className="text-primary text-xs font-medium underline-offset-4 hover:underline"
          data-test="dashboard-sync-events-link"
          onClick={onOpenEvents}
        >
          All events
        </Link>
      </div>

      <Tabs value={tab} onValueChange={(value) => setTab(value as EventQueueTab)}>
        <TabsList className="w-full" data-test="sync-activity-tabs">
          <TabsTrigger value="outbox">
            Outbox
            <CountMark value={outboxCount} />
          </TabsTrigger>
          <TabsTrigger value="inbox">
            Inbox
            <CountMark value={inboxCount} />
          </TabsTrigger>
          <TabsTrigger value="deadletter">
            Failed
            <CountMark value={deadLetterCount} />
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <p className="text-muted-foreground text-xs leading-relaxed">{HINTS[tab]}</p>

      <Activity mode={tab === "outbox" ? "visible" : "hidden"} name="sync-activity-outbox">
        <OutboxPreview />
      </Activity>
      <Activity mode={tab === "inbox" ? "visible" : "hidden"} name="sync-activity-inbox">
        <InboxPreview />
      </Activity>
      <Activity mode={tab === "deadletter" ? "visible" : "hidden"} name="sync-activity-deadletter">
        <DeadLetterPreview />
      </Activity>

      {activeCount != null && activeCount > PREVIEW_LIMIT ? (
        <p className="text-muted-foreground text-xs">
          Latest {PREVIEW_LIMIT} of {activeCount}
        </p>
      ) : null}
    </section>
  );
}

function CountMark({ value }: { value: number | null }) {
  if (value == null || value <= 0) return null;
  return <span className="text-muted-foreground tabular-nums">{value > 99 ? "99+" : value}</span>;
}

function useOutboxCount() {
  const db = useEventSourcedDb();
  const { data } = useLiveQuery(
    (query) =>
      query
        .from({ row: db.collections.outbox })
        .select(({ row }) => ({ total: count(row.eventId) })),
    [],
  );
  return data?.[0] ? Number(data[0].total) : null;
}

function useInboxCount() {
  const db = useEventSourcedDb();
  const { data } = useLiveQuery(
    (query) =>
      query
        .from({ row: db.collections.inbox })
        .select(({ row }) => ({ total: count(row.eventId) })),
    [],
  );
  return data?.[0] ? Number(data[0].total) : null;
}

function useDeadLetterCount() {
  const db = useEventSourcedDb();
  const { data } = useLiveQuery(
    (query) =>
      query
        .from({ row: db.collections.deadletter })
        .select(({ row }) => ({ total: count(row.eventId) })),
    [],
  );
  return data?.[0] ? Number(data[0].total) : null;
}

function OutboxPreview() {
  const db = useEventSourcedDb();
  const { data, isLoading } = useLiveQuery(
    (query) =>
      query
        .from({ row: db.collections.outbox })
        .orderBy(({ row }) => row.timestamp, "desc")
        .limit(PREVIEW_LIMIT),
    [],
  );

  return (
    <ActivityList
      loading={isLoading}
      empty="Nothing waiting to push."
      rows={(data ?? []).map((row) => ({
        id: row.eventId,
        type: row.type,
        title: row.collectionId,
        detail: String(row.key),
        status: row.sync ? "Pushed" : "Outgoing",
        statusClass: row.sync ? "text-primary" : "text-warning",
        time: row.timestamp,
      }))}
    />
  );
}

function InboxPreview() {
  const db = useEventSourcedDb();
  const { data, isLoading } = useLiveQuery(
    (query) =>
      query
        .from({ row: db.collections.inbox })
        .orderBy(({ row }) => row.timestamp, "desc")
        .limit(PREVIEW_LIMIT),
    [],
  );

  return (
    <ActivityList
      loading={isLoading}
      empty="No changes pulled in yet."
      rows={(data ?? []).map((row) => ({
        id: row.eventId,
        type: row.type,
        title: row.collectionId,
        detail: String(row.key),
        status: row.sync ? "Applied" : "Incoming",
        statusClass: row.sync ? "text-primary" : "text-warning",
        time: row.timestamp,
      }))}
    />
  );
}

function DeadLetterPreview() {
  const db = useEventSourcedDb();
  const { data, isLoading } = useLiveQuery(
    (query) =>
      query
        .from({ row: db.collections.deadletter })
        .orderBy(({ row }) => row.failedAt, "desc")
        .limit(PREVIEW_LIMIT),
    [],
  );

  return (
    <ActivityList
      loading={isLoading}
      empty="No rejected events."
      rows={(data ?? []).map((row) => ({
        id: row.eventId,
        type: row.type,
        title: row.collectionId,
        detail: row.message || String(row.key),
        status: row.reason,
        statusClass: "text-error",
        time: row.failedAt,
      }))}
    />
  );
}

type PreviewRow = {
  id: string;
  type: MutationType;
  title: string;
  detail: string;
  status: string;
  statusClass: string;
  time: number;
};

function ActivityList({
  rows,
  loading,
  empty,
}: {
  rows: PreviewRow[];
  loading: boolean;
  empty: string;
}) {
  if (loading && rows.length === 0) {
    return (
      <p className="text-muted-foreground py-6 text-center text-sm" aria-busy="true">
        Loading activity…
      </p>
    );
  }

  if (rows.length === 0) {
    return (
      <p className="text-muted-foreground py-6 text-center text-sm" data-test="sync-activity-empty">
        {empty}
      </p>
    );
  }

  return (
    <ul className="flex flex-col" data-test="sync-activity-list" aria-live="polite">
      {rows.map((row) => (
        <li
          key={row.id}
          className="flex items-center gap-3 border-b border-border/60 py-2.5 last:border-b-0"
        >
          <span
            className={cn(
              "w-14 shrink-0 text-[11px] font-medium tracking-wide uppercase",
              TYPE_CLASS[row.type],
            )}
          >
            {row.type}
          </span>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-medium">{row.title}</div>
            <div className="text-muted-foreground truncate font-mono text-[11px]">{row.detail}</div>
          </div>
          <div className="shrink-0 text-right">
            <div className={cn("text-xs font-medium", row.statusClass)}>{row.status}</div>
            <div className="text-muted-foreground text-[11px] tabular-nums">
              {formatCompactTime(row.time)}
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}

function formatCompactTime(value: number) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  const now = new Date();
  const sameDay = date.toDateString() === now.toDateString();
  return new Intl.DateTimeFormat(
    undefined,
    sameDay ? { hour: "numeric", minute: "2-digit" } : { month: "short", day: "numeric" },
  ).format(date);
}
