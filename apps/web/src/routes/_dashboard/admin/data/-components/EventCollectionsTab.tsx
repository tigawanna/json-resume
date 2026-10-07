import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { adminEventsByCollectionQueryOptions } from "@/data-access-layer/admin/admin-query-options";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { ArrowRight } from "lucide-react";
import type { AdminDataSearch } from "../-utils/admin-data-search";
import { EventFilterBar } from "./EventFilterBar";

type EventCollectionsTabProps = {
  search: AdminDataSearch;
  setSearch: (next: Partial<AdminDataSearch>) => void;
};

export function EventCollectionsTab({ search, setSearch }: EventCollectionsTabProps) {
  const query = useQuery({
    ...adminEventsByCollectionQueryOptions({
      userId: search.userId,
      q: search.q,
      type: search.type,
      applied: search.applied,
    }),
    placeholderData: keepPreviousData,
  });
  const rows = query.data ?? [];
  const waiting = rows.reduce((sum, row) => sum + row.unprojected, 0);

  return (
    <div className="flex flex-col gap-4" data-test="admin-collections-tab">
      <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
        <EventFilterBar
          key={search.q ?? ""}
          search={search}
          setSearch={setSearch}
          showCollection={false}
        />
        <p className="text-sm text-base-content/70">
          {waiting === 0
            ? "Every event has been applied to the tables."
            : `${waiting.toLocaleString()} events are waiting to be applied.`}
        </p>
      </div>

      {query.error ? <p className="text-sm text-error">{query.error.message}</p> : null}

      <div className="overflow-x-auto rounded-lg border border-base-300">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Collection</TableHead>
              <TableHead className="text-right">Events</TableHead>
              <TableHead className="text-right">Waiting</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow
                key={row.collectionId}
                className="cursor-pointer"
                onClick={() =>
                  setSearch({ tab: "events", collectionId: row.collectionId, page: 0 })
                }
                data-test="admin-collection-row"
              >
                <TableCell className="font-mono text-xs">{row.collectionId}</TableCell>
                <TableCell className="text-right tabular-nums">
                  {row.total.toLocaleString()}
                </TableCell>
                <TableCell
                  className={`text-right tabular-nums ${row.unprojected > 0 ? "text-warning" : "text-base-content/50"}`}
                >
                  {row.unprojected.toLocaleString()}
                </TableCell>
                <TableCell className="text-right">
                  <ArrowRight className="ml-auto size-4 text-base-content/50" />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
