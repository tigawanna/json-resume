import { createFileRoute } from "@tanstack/react-router";
import { SavedProjectsPage } from "./-components/SavedProjectsPage";

export const Route = createFileRoute("/_dashboard/saved-projects/")({
  component: SavedProjectsPage,
  ssr: false,
  head: () => ({
    meta: [{ title: "Saved Projects", description: "Manage your saved projects" }],
  }),
});
