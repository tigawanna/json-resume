import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { AdminTableView } from "../-components/AdminTableView";

const tableSearchSchema = z.object({
  page: z.number().int().min(0).catch(0),
  q: z.string().optional().catch(undefined),
});

export const Route = createFileRoute("/_dashboard/admin/tables/$table/")({
  validateSearch: (search) => tableSearchSchema.parse(search),
  component: RouteComponent,
  head: ({ params }) => ({ meta: [{ title: `Admin · ${params.table}` }] }),
});

function RouteComponent() {
  const { table } = Route.useParams();
  const { page, q } = Route.useSearch();
  return <AdminTableView table={table} page={page} q={q} />;
}
