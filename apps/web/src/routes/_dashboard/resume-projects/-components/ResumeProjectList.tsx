import Nprogress from "@/components/navigation/nprogress/Nprogress";
import { queryKeyPrefixes } from "@/data-access-layer/query-keys";
import { listResumeProjects } from "@/data-access-layer/resume/resume-projects/resume-project.functions";
import { deleteResumeProjectMutationOptions } from "@/data-access-layer/resume/resume-projects/resume-project.mutation-options";
import { RouterPendingComponent } from "@/lib/tanstack/router/RouterPendingComponent";
import { useMutation, useQuery } from "@tanstack/react-query";
import { FolderKanban } from "lucide-react";
import { Route } from "..";
import { ResumeProjectListCard } from "./ResumeProjectListCard";

export function ResumeProjectList() {
  const { sq, cursor, dir } = Route.useSearch();
  const { data, isLoading, isRefetching } = useQuery({
    queryKey: [queryKeyPrefixes.resumeProjects, "page", cursor, dir ?? "after", sq],
    queryFn: () => listResumeProjects({ data: { cursor, direction: dir, keyword: sq } }),
    placeholderData: (prevData) => prevData,
  });
  const deleteMutation = useMutation(deleteResumeProjectMutationOptions);

  if (isLoading) {
    return (
      <div className="flex w-full h-full flex-col gap-6" data-test="resume-project-list-page">
        <RouterPendingComponent />
      </div>
    );
  }

  if (!data || data.items.length === 0) {
    return (
      <div className="flex w-full h-full flex-col gap-6" data-test="resume-project-list-page">
        <div className="flex flex-col h-full items-center justify-center gap-4 py-16">
          <FolderKanban className="text-muted-foreground size-12" />
          <p className="text-muted-foreground text-sm">
            No projects found. Add projects to your resumes first.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex w-full h-full flex-col gap-6" data-test="resume-project-list-page">
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
