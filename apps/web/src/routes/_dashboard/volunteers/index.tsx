import { createFileRoute } from "@tanstack/react-router";
import { resumeFilteredListSearchSchema } from "../-utils/list-search";
import { VolunteerList } from "./-components/VolunteerList";

export const Route = createFileRoute("/_dashboard/volunteers/")({
  component: RouteComponent,
  ssr: false,
  validateSearch: (search) => resumeFilteredListSearchSchema.parse(search),
  head: () => ({
    meta: [{ title: "Volunteers", description: "Volunteer roles in your local library." }],
  }),
});

function RouteComponent() {
  return <VolunteerList />;
}
