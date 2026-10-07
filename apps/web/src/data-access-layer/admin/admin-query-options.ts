import {
  getAdminEvents,
  getAdminEventsByCollection,
  getAdminEventUsers,
  getAdminRow,
  getAdminStats,
  getAdminTablePage,
  getAdminTables,
  getAdminTruncatePreview,
  getAdminUsers,
} from "@/modules/admin/admin.functions";
import type {
  adminEventFilterSchema,
  adminEventListSchema,
} from "@/modules/admin/admin-event-filters";
import { queryOptions } from "@tanstack/react-query";
import type { z } from "zod";

export const adminStatsQueryOptions = queryOptions({
  queryKey: ["admin", "stats"],
  queryFn: () => getAdminStats(),
});

export const adminTablesQueryOptions = queryOptions({
  queryKey: ["admin", "tables"],
  queryFn: () => getAdminTables(),
});

export const adminUsersQueryOptions = queryOptions({
  queryKey: ["admin", "users"],
  queryFn: () => getAdminUsers(),
});

type AdminEventFilter = z.infer<typeof adminEventFilterSchema>;

export function adminEventsQueryOptions(input: z.infer<typeof adminEventListSchema>) {
  return queryOptions({
    queryKey: ["admin", "events", "list", input],
    queryFn: () => getAdminEvents({ data: input }),
  });
}

export function adminEventsByCollectionQueryOptions(filter: AdminEventFilter) {
  return queryOptions({
    queryKey: ["admin", "events", "by-collection", filter],
    queryFn: () => getAdminEventsByCollection({ data: filter }),
  });
}

export const adminEventUsersQueryOptions = queryOptions({
  queryKey: ["admin", "events", "users"],
  queryFn: () => getAdminEventUsers(),
});

export function adminRowQueryOptions(input: { table: string; rowid: number }) {
  return queryOptions({
    queryKey: ["admin", "row", input],
    queryFn: () => getAdminRow({ data: input }),
  });
}

export function adminTruncatePreviewQueryOptions(input: {
  table: string;
  cutoff?: { column: string; before: number };
}) {
  return queryOptions({
    queryKey: ["admin", "truncate-preview", input],
    queryFn: () => getAdminTruncatePreview({ data: input }),
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
    queryFn: () => getAdminTablePage({ data: input }),
  });
}
