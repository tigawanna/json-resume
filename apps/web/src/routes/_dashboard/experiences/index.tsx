import { createFileRoute } from "@tanstack/react-router";
import { resumeFilteredListSearchSchema } from "../-utils/list-search";
import { ExperienceList } from "./-components/ExperienceList";

export const Route = createFileRoute("/_dashboard/experiences/")({
  component: RouteComponent,
  ssr: false,
  validateSearch: (search) => resumeFilteredListSearchSchema.parse(search),
  head: () => ({
    meta: [{ title: "Experiences", description: "Work experiences in your local library." }],
  }),
});

function RouteComponent() {
  return <ExperienceList />;
}
