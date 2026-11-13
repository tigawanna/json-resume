import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { useEventSourcedDb } from "@/data-access-layer/event-sourced/provider";
import { ensureBuiltinAssistantSkills } from "@/data-access-layer/event-sourced/rows/assistant-skill-rows";
import { RouterPendingComponent } from "@/lib/tanstack/router/RouterPendingComponent";
import { eq, useLiveQuery } from "@tanstack/react-db";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, BookOpen } from "lucide-react";
import { useEffect } from "react";
import { AssistantSkillEditor } from "../-components/AssistantSkillEditor";

export const Route = createFileRoute("/_dashboard/assistant-skills/$skillId/")({
  component: RouteComponent,
  ssr: false,
  head: () => ({
    meta: [
      {
        title: "Assistant skill",
        description: "Edit a long assistant skill on its own page.",
      },
    ],
  }),
});

function RouteComponent() {
  const { skillId } = Route.useParams();
  return <AssistantSkillFullPage key={skillId} skillId={skillId} />;
}

function AssistantSkillFullPage({ skillId }: { skillId: string }) {
  const db = useEventSourcedDb();
  const navigate = useNavigate();

  useEffect(() => {
    ensureBuiltinAssistantSkills(db);
  }, [db]);

  const { data, isLoading } = useLiveQuery(
    (query) =>
      query
        .from({ skill: db.collections.assistantSkill })
        .where(({ skill }) => eq(skill.id, skillId)),
    [db, skillId],
  );
  const skill = data?.[0];

  if (isLoading) return <RouterPendingComponent />;

  if (!skill) {
    return (
      <Empty className="min-h-[50vh]">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <BookOpen />
          </EmptyMedia>
          <EmptyTitle>Skill not found</EmptyTitle>
          <EmptyDescription>It may have been deleted on this device.</EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button asChild variant="outline" size="sm">
            <Link to="/assistant-skills">
              <ArrowLeft className="size-4" />
              Back to skills
            </Link>
          </Button>
        </EmptyContent>
      </Empty>
    );
  }

  return (
    <div
      className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-4 py-6 md:px-6"
      data-test="assistant-skill-page"
    >
      <div className="flex flex-col gap-2">
        <Link
          to="/assistant-skills"
          className="text-muted-foreground inline-flex w-fit items-center gap-1 text-sm hover:text-base-content"
        >
          <ArrowLeft className="size-4" />
          All skills
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">{skill.name}</h1>
      </div>
      <AssistantSkillEditor
        skill={skill}
        layout="page"
        onClose={() => {
          void navigate({ to: "/assistant-skills" });
        }}
      />
    </div>
  );
}
