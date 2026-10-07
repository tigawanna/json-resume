import { adminUsersQueryOptions } from "@/data-access-layer/admin/admin-query-options";
import { createFileRoute } from "@tanstack/react-router";
import { AdminUsersView } from "./-components/AdminUsersView";

export const Route = createFileRoute("/_dashboard/admin/users/")({
  loader: ({ context }) => context.queryClient.ensureQueryData(adminUsersQueryOptions),
  component: AdminUsersView,
  head: () => ({ meta: [{ title: "Admin · Users" }] }),
});
