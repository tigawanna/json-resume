import { cloneResumeMuationOptions } from "@/data-access-layer/resume/resume-mutatin-options";
import { resumesCollection } from "@/data-access-layer/resume/resumes-query-collection";
import { ilike, or, useLiveSuspenseQuery } from "@tanstack/react-db";
import { useMutation } from "@tanstack/react-query";
import { FileText } from "lucide-react";
import { Route } from "..";
import { ResumeListCard } from "./ResumeListCard";

export function ResumeListPage() {
  const { sq } = Route.useSearch();

  const { data: resumes } = useLiveSuspenseQuery(
    (q) => {
      let query = q.from({ resume: resumesCollection });
      if (sq) {
        const pattern = `%${sq}%`;
        query = query.where(({ resume }) =>
          or(
            ilike(resume.name, pattern),
            ilike(resume.fullName, pattern),
            ilike(resume.headline, pattern),
            ilike(resume.description, pattern),
          ),
        );
      }
      return query;
    },
    [sq],
  );
  const cloneMutation = useMutation(cloneResumeMuationOptions);

  return (
    <div className="flex w-full h-full flex-col gap-6" data-test="resume-list-page">
      <div className="flex-1" data-test="resume-list">
        {resumes.length === 0 ? (
          <div className="flex flex-col h-full items-center justify-center gap-4 py-16">
            <FileText className="text-muted-foreground size-12" />
            <p className="text-muted-foreground text-sm">No resumes yet. Create your first one!</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {resumes.map((resume) => (
              <ResumeListCard
                key={resume.id}
                resume={resume}
                onClone={(id) => cloneMutation.mutate(id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
