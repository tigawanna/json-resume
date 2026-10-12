import { createFileRoute } from "@tanstack/react-router";
import { resumeFilteredListSearchSchema } from "../-utils/list-search";
import { SummaryList } from "./-components/SummaryList";

export const Route = createFileRoute("/_dashboard/summaries/")({
  component: RouteComponent,
  ssr: false,
  validateSearch: (search) => resumeFilteredListSearchSchema.parse(search),
  head: () => ({
    meta: [{ title: "Summaries", description: "Professional summaries in your local library." }],
  }),
});

function RouteComponent() {
  return <SummaryList />;
}
