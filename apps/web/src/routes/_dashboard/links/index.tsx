import { createFileRoute } from "@tanstack/react-router";
import { resumeFilteredListSearchSchema } from "../-utils/list-search";
import { LinkList } from "./-components/LinkList";

export const Route = createFileRoute("/_dashboard/links/")({
  component: RouteComponent,
  ssr: false,
  validateSearch: (search) => resumeFilteredListSearchSchema.parse(search),
  head: () => ({
    meta: [{ title: "Links", description: "Profile and portfolio links in your local library." }],
  }),
});

function RouteComponent() {
  return <LinkList />;
}
