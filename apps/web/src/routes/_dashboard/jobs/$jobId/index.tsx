import { createFileRoute } from "@tanstack/react-router";
import { JobDetailPage } from "./-components/JobDetailPage";

export const Route = createFileRoute("/_dashboard/jobs/$jobId/")({
  component: RouteComponent,
  ssr: false,
  head: () => ({
    meta: [{ title: "Job", description: "View and edit a saved job posting." }],
  }),
});

function RouteComponent() {
  const { jobId } = Route.useParams();
  return <JobDetailPage key={jobId} jobId={jobId} />;
}
