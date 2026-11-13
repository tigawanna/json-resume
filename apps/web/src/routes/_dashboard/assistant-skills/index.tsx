import { createFileRoute } from "@tanstack/react-router";
import { AssistantSkillPage } from "./-components/AssistantSkillPage";

export const Route = createFileRoute("/_dashboard/assistant-skills/")({
  component: RouteComponent,
  ssr: false,
  head: () => ({
    meta: [
      {
        title: "Assistant skills",
        description: "Instructions the résumé assistants follow when they rewrite and tailor.",
      },
    ],
  }),
});

function RouteComponent() {
  return <AssistantSkillPage />;
}
