import { createFileRoute } from "@tanstack/react-router";
import { resumeFilteredListSearchSchema } from "../-utils/list-search";
import { SkillGroupList } from "./-components/SkillGroupList";

export const Route = createFileRoute("/_dashboard/skill-groups/")({
  component: RouteComponent,
  ssr: false,
  validateSearch: (search) => resumeFilteredListSearchSchema.parse(search),
  head: () => ({
    meta: [{ title: "Skills", description: "Skill groups in your local library." }],
  }),
});

function RouteComponent() {
  return <SkillGroupList />;
}
