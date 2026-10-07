import { createFileRoute } from "@tanstack/react-router";
import { AdminOverview } from "./-components/AdminOverview";

export const Route = createFileRoute("/_dashboard/admin/")({
  component: AdminOverview,
  head: () => ({
    meta: [{ title: "Admin", description: "Remote database tables and event log tools." }],
  }),
});
