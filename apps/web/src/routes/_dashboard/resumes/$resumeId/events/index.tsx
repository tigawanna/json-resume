import { createFileRoute } from "@tanstack/react-router";
import { ResumeEventsView } from "./-components/ResumeEventsView";

export const Route = createFileRoute("/_dashboard/resumes/$resumeId/events/")({
  component: RouteComponent,
  ssr: false,
  head: () => ({
    meta: [
      {
        title: "Résumé history",
        description: "Squash and restore the recorded changes behind a résumé.",
      },
    ],
  }),
});

function RouteComponent() {
  const { resumeId } = Route.useParams();
  return <ResumeEventsView key={resumeId} resumeId={resumeId} />;
}
