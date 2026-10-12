import { createFileRoute } from "@tanstack/react-router";
import { resumeFilteredListSearchSchema } from "../-utils/list-search";
import { ProjectList } from "./-components/ProjectList";

export const Route = createFileRoute("/_dashboard/resume-projects/")({
  component: RouteComponent,
  ssr: false,
  validateSearch: (search) => resumeFilteredListSearchSchema.parse(search),
  head: () => ({
    meta: [{ title: "Projects", description: "Projects in your local library." }],
  }),
});

function RouteComponent() {
  return <ProjectList />;
}
