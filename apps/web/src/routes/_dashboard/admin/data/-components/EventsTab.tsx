import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { adminEventsQueryOptions } from "@/data-access-layer/admin/admin-query-options";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import type { AdminEventSortColumn } from "@/modules/admin/admin-event-filters";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import type { AdminDataSearch } from "../-utils/admin-data-search";
import { EventFilterBar } from "./EventFilterBar";

const PAGE_SIZE = 50;

type EventsTabProps = {
  search: AdminDataSearch;
  setSearch: (next: Partial<AdminDataSearch>) => void;
};

export function EventsTab({ search, setSearch }: EventsTabProps) {
  const query = useQuery({
    ...adminEventsQueryOptions({
      userId: search.userId,
      q: search.q,
      type: search.type,
      applied: search.applied,
      collectionId: search.collectionId,
      sort: search.sort,
      page: search.page,
      pageSize: PAGE_SIZE,
    }),
    placeholderData: keepPreviousData,
  });
  const data = query.data;
  const pageCount = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;

  return (
    <div className="flex flex-col gap-4" data-test="admin-events-tab">
      <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
        <EventFilterBar key={search.q ?? ""} search={search} setSearch={setSearch} />
        {data ? (
          <p className="text-sm text-base-content/70">
            {data.total.toLocaleString()} events
            {data.unprojected > 0 ? (
              <span className="text-warning">
                {" "}
                · {data.unprojected.toLocaleString()} waiting to be applied
              </span>
            ) : null}
          </p>
        ) : null}
      </div>

      {query.error ? <p className="text-sm text-error">{query.error.message}</p> : null}

      <div className="overflow-x-auto rounded-lg border border-base-300">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>
                <SortHeader
                  label="Seq"
                  column="seq"
                  sort={search.sort}
                  onSort={(sort) => setSearch({ sort, page: 0 })}
                />
              </TableHead>
              {(
                [
                  ["When", "when"],
                  ["User", "user"],
                  ["Collection", "collection"],
                  ["Type", "type"],
                ] as const
              ).map(([label, column]) => (
                <TableHead key={column}>
                  <SortHeader
                    label={label}
                    column={column}
                    sort={search.sort}
                    onSort={(sort) => setSearch({ sort, page: 0 })}
                  />
                </TableHead>
              ))}
              <TableHead>Key</TableHead>
              <TableHead>
                <SortHeader
                  label="Applied at"
                  column="applied"
                  sort={search.sort}
                  onSort={(sort) => setSearch({ sort, page: 0 })}
                />
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data?.events.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-base-content/60">
                  No events match.
                </TableCell>
              </TableRow>
            ) : null}
            {data?.events.map((event) => (
              <TableRow key={event.globalSeq} data-test="admin-event-row">
                <TableCell className="tabular-nums">{event.globalSeq}</TableCell>
                <TableCell className="whitespace-nowrap text-xs">
                  {new Date(event.serverTimestamp).toLocaleString()}
                </TableCell>
                <TableCell className="max-w-48 truncate text-xs">
                  <button
                    type="button"
                    className="hover:underline"
                    onClick={() => setSearch({ userId: event.userId, page: 0 })}
                    data-test="admin-event-user"
                  >
                    {event.userEmail ?? event.userId}
                  </button>
                </TableCell>
                <TableCell className="font-mono text-xs">
                  <button
                    type="button"
                    className="hover:underline"
                    onClick={() => setSearch({ collectionId: event.collectionId, page: 0 })}
                    data-test="admin-event-collection"
                  >
                    {event.collectionId}
                  </button>
                </TableCell>
                <TableCell>
                  <button
                    type="button"
                    onClick={() => setSearch({ type: event.type, page: 0 })}
                    data-test="admin-event-type"
                  >
                    <Badge variant={event.type === "delete" ? "destructive" : "secondary"}>
                      {event.type}
                    </Badge>
                  </button>
                </TableCell>
                <TableCell className="max-w-48 truncate font-mono text-xs" title={event.key}>
                  {event.key}
                </TableCell>
                <TableCell className="whitespace-nowrap text-xs">
                  {event.projectedAt == null ? (
                    <span className="text-warning">waiting</span>
                  ) : (
                    <span className="text-base-content/60">
                      {new Date(event.projectedAt).toLocaleString()}
                    </span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-end gap-2 text-sm">
        <button
          className="btn btn-ghost btn-sm"
          disabled={search.page === 0}
          onClick={() => setSearch({ page: search.page - 1 })}
          data-test="admin-events-prev"
        >
          Previous
        </button>
        <span>
          Page {search.page + 1} of {pageCount}
        </span>
        <button
          className="btn btn-ghost btn-sm"
          disabled={search.page + 1 >= pageCount}
          onClick={() => setSearch({ page: search.page + 1 })}
          data-test="admin-events-next"
        >
          Next
        </button>
      </div>
    </div>
  );
}

type SortHeaderProps = {
  label: string;
  column: AdminEventSortColumn;
  sort: AdminDataSearch["sort"];
  onSort: (sort: AdminDataSearch["sort"]) => void;
};

const TEXT_SORT_COLUMNS: ReadonlySet<AdminEventSortColumn> = new Set([
  "user",
  "collection",
  "type",
]);

function SortHeader({ label, column, sort, onSort }: SortHeaderProps) {
  const active = sort.startsWith(`${column}-`);
  const descending = sort.endsWith("-desc");
  const Icon = !active ? ArrowUpDown : descending ? ArrowDown : ArrowUp;
  const firstSort: AdminDataSearch["sort"] = TEXT_SORT_COLUMNS.has(column)
    ? `${column}-asc`
    : `${column}-desc`;

  return (
    <button
      type="button"
      className={`inline-flex items-center gap-1 ${active ? "text-base-content" : ""}`}
      onClick={() => onSort(!active ? firstSort : descending ? `${column}-asc` : `${column}-desc`)}
      data-test={`admin-events-sort-${column}`}
    >
      {label}
      <Icon className="size-3" />
    </button>
  );
}
