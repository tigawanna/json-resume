import { adminStatsQueryOptions } from "@/data-access-layer/admin/admin-query-options";
import { createFileRoute } from "@tanstack/react-router";
import { AdminHome } from "./-components/AdminHome";

export const Route = createFileRoute("/_dashboard/admin/")({
  loader: ({ context }) => context.queryClient.ensureQueryData(adminStatsQueryOptions),
  component: AdminHome,
  head: () => ({
    meta: [{ title: "Admin", description: "Remote database stats and admin tools." }],
  }),
});
