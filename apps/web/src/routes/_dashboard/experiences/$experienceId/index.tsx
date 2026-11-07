import { createFileRoute } from "@tanstack/react-router";
import { ExperienceDetailPage } from "./-components/ExperienceDetailPage";

export const Route = createFileRoute("/_dashboard/experiences/$experienceId/")({
  component: RouteComponent,
  ssr: false,
  head: () => ({
    meta: [
      {
        title: "Experience",
        description: "View all titles and bullets for this company and period.",
      },
    ],
  }),
});

function RouteComponent() {
  const { experienceId } = Route.useParams();
  return <ExperienceDetailPage key={experienceId} experienceId={experienceId} />;
}
