import { getAdminOverview, getAdminTablePage } from "@/modules/admin/admin.functions";
import { queryOptions } from "@tanstack/react-query";

export const adminOverviewQueryOptions = queryOptions({
  queryKey: ["admin", "overview"],
  queryFn: () => getAdminOverview(),
});

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
