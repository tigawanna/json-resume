import { createFileRoute } from "@tanstack/react-router";
import { AdminDataView } from "./-components/AdminDataView";
import { adminDataSearchSchema } from "./-utils/admin-data-search";

export const Route = createFileRoute("/_dashboard/admin/data/")({
  validateSearch: (search) => adminDataSearchSchema.parse(search),
  component: RouteComponent,
  head: () => ({ meta: [{ title: "Admin · Data management" }] }),
});

function RouteComponent() {
  const search = Route.useSearch();
  return <AdminDataView search={search} />;
}
