import { createFileRoute } from "@tanstack/react-router";
import { resumeFilteredListSearchSchema } from "../-utils/list-search";
import { TalkList } from "./-components/TalkList";

export const Route = createFileRoute("/_dashboard/talks/")({
  component: RouteComponent,
  ssr: false,
  validateSearch: (search) => resumeFilteredListSearchSchema.parse(search),
  head: () => ({
    meta: [{ title: "Talks", description: "Talks and presentations in your local library." }],
  }),
});

function RouteComponent() {
  return <TalkList />;
}
