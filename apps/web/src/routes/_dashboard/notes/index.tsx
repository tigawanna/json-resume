import { createFileRoute } from "@tanstack/react-router";
import { resumeFilteredListSearchSchema } from "../-utils/list-search";
import { NoteList } from "./-components/NoteList";

export const Route = createFileRoute("/_dashboard/notes/")({
  component: RouteComponent,
  ssr: false,
  validateSearch: (search) => resumeFilteredListSearchSchema.parse(search),
  head: () => ({
    meta: [
      {
        title: "Notes",
        description: "Footer notes and condensed cover letters in your local library.",
      },
    ],
  }),
});

function RouteComponent() {
  return <NoteList />;
}
