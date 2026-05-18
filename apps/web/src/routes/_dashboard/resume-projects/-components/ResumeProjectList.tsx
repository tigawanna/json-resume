import Nprogress from "@/components/navigation/nprogress/Nprogress";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import type { listResumeProjects } from "@/data-access-layer/resume/resume-projects/resume-project.functions";
import { deleteResumeProjectMutationOptions } from "@/data-access-layer/resume/resume-projects/resume-project.mutation-options";
import { RouterPendingComponent } from "@/lib/tanstack/router/RouterPendingComponent";
import { useMutation } from "@tanstack/react-query";
import { FolderKanban, Loader2, Plus } from "lucide-react";
import { useState, useTransition } from "react";
import { Route } from "..";
import { ProjectCreateFormDialog } from "./ProjectCreateForm";
import { ResumeProjectListCard } from "./ResumeProjectListCard";

type PageData = Awaited<ReturnType<typeof listResumeProjects>>;

interface ResumeProjectListProps {
  data: PageData | undefined;
  isLoading: boolean;
  isRefetching: boolean;
}

export function ResumeProjectList({ data, isLoading, isRefetching }: ResumeProjectListProps) {
  const [createOpen, setCreateOpen] = useState(false);
  const [isCreateOpenPending, startCreateOpenTransition] = useTransition();
  const navigate = Route.useNavigate();
  const deleteMutation = useMutation(deleteResumeProjectMutationOptions);

  function openCreateDialog() {
    startCreateOpenTransition(() => {
      setCreateOpen(true);
    });
  }

  if (isLoading) {
    return (
      <div className="flex w-full flex-col gap-6" data-test="resume-project-list-page">
        <RouterPendingComponent />
      </div>
    );
  }

  if (!data || data.items.length === 0) {
    return (
      <div className="flex w-full flex-col gap-6" data-test="resume-project-list-page">
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <FolderKanban className="text-muted-foreground size-12" />
            </EmptyMedia>
            <EmptyTitle>No Projects Yet</EmptyTitle>
            <EmptyDescription>
              You haven&apos;t added any projects yet. Get started by adding your first project.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent className="flex-row justify-center gap-2">
            <Button
              size="sm"
              onClick={openCreateDialog}
              disabled={isCreateOpenPending}
              data-test="add-project-btn"
            >
              {isCreateOpenPending ? (
                <Loader2 className="mr-1 size-4 animate-spin" />
              ) : (
                <Plus className="mr-1 size-4" />
              )}
              {isCreateOpenPending ? "Opening..." : "Create Project"}
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
        <ProjectCreateFormDialog open={createOpen} setOpen={setCreateOpen} />
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col gap-6" data-test="resume-project-list-page">
      <Nprogress isAnimating={isRefetching} />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" data-test="resume-project-list">
        {data.items.map((project) => (
          <ResumeProjectListCard
            key={project.id}
            project={project}
            onDelete={(id) => deleteMutation.mutate(id)}
          />
        ))}
      </div>
    </div>
  );
}
