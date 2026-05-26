import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { queryKeyPrefixes } from "@/data-access-layer/query-keys";
import type { listExperiences } from "@/data-access-layer/resume/experiences/experience.functions";
import { reorderExperienceFn } from "@/data-access-layer/resume/experiences/experience.functions";
import { deleteExperienceMutationOptions } from "@/data-access-layer/resume/experiences/experience.mutation-options";
import { RouterPendingComponent } from "@/lib/tanstack/router/RouterPendingComponent";
import { useMutation } from "@tanstack/react-query";
import { Briefcase, Loader2, Plus } from "lucide-react";
import { useState, useTransition } from "react";
import { Route } from "..";
import { ExperienceCreateFormDialog } from "./ExperienceCreateForm";
import { ExperienceListCard } from "./ExperienceListCard";
import { getPrimaryExperience, groupExperiences } from "./experience-display-groups";

type PageData = Awaited<ReturnType<typeof listExperiences>>;

interface ExperienceListProps {
  data: PageData | undefined;
  isLoading: boolean;
}

export function ExperienceList({ data, isLoading }: ExperienceListProps) {
  const { sq, cursor, dir } = Route.useSearch();
  const [createOpen, setCreateOpen] = useState(false);
  const [isCreateOpenPending, startCreateOpenTransition] = useTransition();
  const navigate = Route.useNavigate();
  const deleteMutation = useMutation(deleteExperienceMutationOptions);

  function openCreateDialog() {
    startCreateOpenTransition(() => {
      setCreateOpen(true);
    });
  }

  const reorderMutation = useMutation({
    mutationFn: (ids: { idA: string; idB: string }) => reorderExperienceFn({ data: ids }),
    onSuccess(_, ___, ____, ctx) {
      void ctx.client.invalidateQueries({
        queryKey: [queryKeyPrefixes.experiences, "page", cursor, dir ?? "after", sq],
      });
      void ctx.client.invalidateQueries({ queryKey: [queryKeyPrefixes.resumes] });
    },
  });

  if (isLoading) {
    return (
      <div className="flex w-full flex-col gap-6" data-test="experience-list-page">
        <RouterPendingComponent />
      </div>
    );
  }

  if (!data || data.items.length === 0) {
    return (
      <div className="flex w-full flex-col gap-6" data-test="experience-list-page">
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Briefcase className="text-muted-foreground size-12" />
            </EmptyMedia>
            <EmptyTitle>No Experiences Yet</EmptyTitle>
            <EmptyDescription>
              You haven&apos;t added any work experiences yet. Get started by adding your first
              experience.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent className="flex-row justify-center gap-2">
            <Button
              size="sm"
              onClick={openCreateDialog}
              disabled={isCreateOpenPending}
              data-test="add-experience-btn"
            >
              {isCreateOpenPending ? (
                <Loader2 className="mr-1 size-4 animate-spin" />
              ) : (
                <Plus className="mr-1 size-4" />
              )}
              {isCreateOpenPending ? "Opening..." : "Create Experience"}
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
        <ExperienceCreateFormDialog open={createOpen} setOpen={setCreateOpen} />
      </div>
    );
  }

  const experienceGroups = data ? groupExperiences(data.items) : [];

  return (
    <div className="flex w-full flex-col gap-6" data-test="experience-list-page">
      <div className="grid gap-4 lg:grid-cols-2" data-test="experience-list">
        {experienceGroups.map((group, index) => (
          <ExperienceListCard
            key={group.key}
            group={group}
            onDelete={(experienceIds) => {
              for (const experienceId of experienceIds) {
                deleteMutation.mutate(experienceId);
              }
            }}
            onMoveUp={
              index > 0
                ? () =>
                    reorderMutation.mutate({
                      idA: getPrimaryExperience(group).id,
                      idB: getPrimaryExperience(experienceGroups[index - 1]).id,
                    })
                : undefined
            }
            onMoveDown={
              index < experienceGroups.length - 1
                ? () =>
                    reorderMutation.mutate({
                      idA: getPrimaryExperience(group).id,
                      idB: getPrimaryExperience(experienceGroups[index + 1]).id,
                    })
                : undefined
            }
          />
        ))}
      </div>
    </div>
  );
}
