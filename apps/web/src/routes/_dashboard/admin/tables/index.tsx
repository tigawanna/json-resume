import { adminTablesQueryOptions } from "@/data-access-layer/admin/admin-query-options";
import { ADMIN_TABLE_GROUPS } from "@/modules/admin/admin-table-groups";
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { AdminTablesView } from "./-components/AdminTablesView";

const groupIds = ["all", ...ADMIN_TABLE_GROUPS.map((group) => group.id)] as const;

const tablesSearchSchema = z.object({
  group: z.enum(groupIds).catch("all"),
});

export const Route = createFileRoute("/_dashboard/admin/tables/")({
  validateSearch: (search) => tablesSearchSchema.parse(search),
  loader: ({ context }) => context.queryClient.ensureQueryData(adminTablesQueryOptions),
  component: RouteComponent,
  head: () => ({ meta: [{ title: "Admin · Tables" }] }),
});

function RouteComponent() {
  const { group } = Route.useSearch();
  return <AdminTablesView group={group} />;
}
