import {
  adminEventLogControllerListBackups,
  adminEventLogControllerSquash,
  adminEventsControllerByCollection,
  adminEventsControllerList,
  adminEventsControllerUsers,
  adminStatsControllerRead,
  adminTablesControllerList,
  adminTablesControllerPreviewTruncate,
  adminTablesControllerReadRow,
  adminTablesControllerTablePage,
  adminUsersControllerFindAll,
} from "@/services/nest/client";
import type {
  adminEventFilterSchema,
  adminEventListSchema,
} from "@/modules/admin/admin-event-filters";
import { queryOptions } from "@tanstack/react-query";
import type { z } from "zod";

export const adminStatsQueryOptions = queryOptions({
  queryKey: ["admin", "stats"],
  queryFn: () => adminStatsControllerRead(),
});

export const adminTablesQueryOptions = queryOptions({
  queryKey: ["admin", "tables"],
  queryFn: () => adminTablesControllerList(),
});

export const adminUsersQueryOptions = queryOptions({
  queryKey: ["admin", "users"],
  queryFn: () => adminUsersControllerFindAll(),
});

type AdminEventFilter = z.infer<typeof adminEventFilterSchema>;

export function adminEventsQueryOptions(input: z.infer<typeof adminEventListSchema>) {
  return queryOptions({
    queryKey: ["admin", "events", "list", input],
    queryFn: () => adminEventsControllerList({ query: input }),
  });
}

export function adminEventsByCollectionQueryOptions(filter: AdminEventFilter) {
  return queryOptions({
    queryKey: ["admin", "events", "by-collection", filter],
    queryFn: () => adminEventsControllerByCollection({ query: filter }),
  });
}

export const adminEventUsersQueryOptions = queryOptions({
  queryKey: ["admin", "events", "users"],
  queryFn: () => adminEventsControllerUsers(),
});

export function adminRowQueryOptions(input: { table: string; rowKey: string }) {
  return queryOptions({
    queryKey: ["admin", "row", input],
    queryFn: () => adminTablesControllerReadRow({ path: input }),
  });
}

export function adminTruncatePreviewQueryOptions(input: {
  table: string;
  cutoff?: { column: string; before: number };
}) {
  return queryOptions({
    queryKey: ["admin", "truncate-preview", input],
    queryFn: () =>
      adminTablesControllerPreviewTruncate({
        path: { table: input.table },
        query: input.cutoff,
      }),
  });
}

export const adminEventLogBackupsQueryOptions = queryOptions({
  queryKey: ["admin", "event-log-backups"],
  queryFn: () => adminEventLogControllerListBackups(),
});

export function adminSquashPreviewQueryOptions(input: { userId?: string; retentionMs: number }) {
  return queryOptions({
    queryKey: ["admin", "squash-preview", input],
    queryFn: () =>
      adminEventLogControllerSquash({
        body: { ...input, dryRun: true },
      }),
  });
}

export function adminTablePageQueryOptions(input: {
  table: string;
  page: number;
  pageSize: number;
  q?: string;
}) {
  return queryOptions({
    queryKey: ["admin", "table", input],
    queryFn: () =>
      adminTablesControllerTablePage({
        path: { table: input.table },
        query: { page: input.page, pageSize: input.pageSize, q: input.q },
      }),
  });
}
