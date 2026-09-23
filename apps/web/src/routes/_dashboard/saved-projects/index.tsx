import { createFileRoute } from "@tanstack/react-router";
import { eventSourcedListSearchSchema } from "../-utils/list-search";
import { SavedProjectsPage } from "./-components/SavedProjectsPage";

export const Route = createFileRoute("/_dashboard/saved-projects/")({
  component: SavedProjectsPage,
  ssr: false,
  validateSearch: (search) => eventSourcedListSearchSchema.parse(search),
  head: () => ({
    meta: [{ title: "Saved Projects", description: "Manage your saved projects" }],
  }),
});
