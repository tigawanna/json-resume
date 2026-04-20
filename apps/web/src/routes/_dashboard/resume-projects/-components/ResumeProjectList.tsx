import { resumeProjectsCollection } from "@/data-access-layer/resume/resume-projects/resume-project.collection";
import { deleteResumeProjectMutationOptions } from "@/data-access-layer/resume/resume-projects/resume-project.mutation-options";
import { ilike, or, useLiveSuspenseQuery } from "@tanstack/react-db";
import { useMutation } from "@tanstack/react-query";
import { FolderKanban } from "lucide-react";
import { Route } from "..";
import { ResumeProjectListCard } from "./ResumeProjectListCard";

export function ResumeProjectList() {
  const { sq } = Route.useSearch();

  const { data: projects } = useLiveSuspenseQuery(
    (q) => {
      let query = q.from({ project: resumeProjectsCollection });
      if (sq) {
        const pattern = `%${sq}%`;
        query = query.where(({ project }) =>
          or(
            ilike(project.name, pattern),
            ilike(project.description, pattern),
            ilike(project.tech, pattern),
          ),
        );
      }
      return query;
    },
    [sq],
  );

  const deleteMutation = useMutation(deleteResumeProjectMutationOptions);

  return (
    <div className="flex w-full h-full flex-col gap-6" data-test="resume-project-list-page">
      <div className="flex-1" data-test="resume-project-list">
        {projects.length === 0 ? (
          <div className="flex flex-col h-full items-center justify-center gap-4 py-16">
            <FolderKanban className="text-muted-foreground size-12" />
            <p className="text-muted-foreground text-sm">
              No projects found. Add projects to your resumes first.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => (
              <ResumeProjectListCard
                key={project.id}
                project={project}
                onDelete={(id) => {
                  resumeProjectsCollection.utils.writeDelete(id);
                  deleteMutation.mutate(id);
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
