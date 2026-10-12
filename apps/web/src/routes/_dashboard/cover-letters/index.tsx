import { createFileRoute } from "@tanstack/react-router";
import { resumeFilteredListSearchSchema } from "../-utils/list-search";
import { CoverLetterList } from "./-components/CoverLetterList";

export const Route = createFileRoute("/_dashboard/cover-letters/")({
  component: RouteComponent,
  ssr: false,
  validateSearch: (search) => resumeFilteredListSearchSchema.parse(search),
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
