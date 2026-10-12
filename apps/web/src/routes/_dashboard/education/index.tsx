import { createFileRoute } from "@tanstack/react-router";
import { resumeFilteredListSearchSchema } from "../-utils/list-search";
import { EducationList } from "./-components/EducationList";

export const Route = createFileRoute("/_dashboard/education/")({
  component: RouteComponent,
  ssr: false,
  validateSearch: (search) => resumeFilteredListSearchSchema.parse(search),
  head: () => ({
    meta: [{ title: "Education", description: "Education entries in your local library." }],
  }),
});

function RouteComponent() {
  return <EducationList />;
}
