import { createFileRoute } from "@tanstack/react-router";
import { eventSourcedListSearchSchema } from "../-utils/list-search";
import { CoverLetterList } from "./-components/CoverLetterList";

export const Route = createFileRoute("/_dashboard/cover-letters/")({
  component: RouteComponent,
  ssr: false,
  validateSearch: (search) => eventSourcedListSearchSchema.parse(search),
  head: () => ({
    meta: [
      {
        title: "Cover letters",
        description: "Cover letters written with the résumé assistant or by hand.",
      },
    ],
  }),
});

function RouteComponent() {
  return <CoverLetterList />;
}
