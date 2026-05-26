import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import type { listSkillGroups } from "@/data-access-layer/resume/skill-groups/skill-group.functions";
import { deleteSkillGroupMutationOptions } from "@/data-access-layer/resume/skill-groups/skill-group.mutation-options";
import { RouterPendingComponent } from "@/lib/tanstack/router/RouterPendingComponent";
import { useMutation } from "@tanstack/react-query";
import { Layers, Loader2, Plus } from "lucide-react";
import { useState, useTransition } from "react";
import { Route } from "..";
import { SkillGroupCreateFormDialog } from "./SkillGroupCreateForm";
import { SkillGroupListCard } from "./SkillGroupListCard";

type PageData = Awaited<ReturnType<typeof listSkillGroups>>;

interface SkillGroupListProps {
  data: PageData | undefined;
  isLoading: boolean;
}

export function SkillGroupList({ data, isLoading }: SkillGroupListProps) {
  const [createOpen, setCreateOpen] = useState(false);
  const [isCreateOpenPending, startCreateOpenTransition] = useTransition();
  const navigate = Route.useNavigate();
  const deleteMutation = useMutation(deleteSkillGroupMutationOptions);

  function openCreateDialog() {
    startCreateOpenTransition(() => {
      setCreateOpen(true);
    });
  }

  if (isLoading) {
    return (
      <div className="flex w-full flex-col gap-6" data-test="skill-group-list-page">
        <RouterPendingComponent />
      </div>
    );
  }

  if (!data || data.items.length === 0) {
    return (
      <div className="flex w-full flex-col gap-6" data-test="skill-group-list-page">
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Layers className="text-muted-foreground size-12" />
            </EmptyMedia>
            <EmptyTitle>No Skills Yet</EmptyTitle>
            <EmptyDescription>
              You haven&apos;t added any skill groups yet. Get started by adding your first skill
              group.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent className="flex-row justify-center gap-2">
            <Button
              size="sm"
              onClick={openCreateDialog}
              disabled={isCreateOpenPending}
              data-test="add-skill-group-btn"
            >
              {isCreateOpenPending ? (
                <Loader2 className="mr-1 size-4 animate-spin" />
              ) : (
                <Plus className="mr-1 size-4" />
              )}
              {isCreateOpenPending ? "Opening..." : "Create Skill Group"}
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                void navigate({
                  to: ".",
                  search: (prev) => ({ ...prev, sq: "" }),
                  replace: true,
                });
              }}
            >
              Clear filters
            </Button>
          </EmptyContent>
        </Empty>
        <SkillGroupCreateFormDialog open={createOpen} setOpen={setCreateOpen} />
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col gap-6" data-test="skill-group-list-page">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" data-test="skill-group-list">
        {data.items.map((item) => (
          <SkillGroupListCard
            key={item.id}
            skillGroup={item}
            onDelete={(id) => deleteMutation.mutate(id)}
          />
        ))}
      </div>
    </div>
  );
}
