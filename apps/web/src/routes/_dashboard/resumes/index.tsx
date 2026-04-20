import { cloneResumeMuationOptions } from "@/data-access-layer/resume/resume-mutatin-options";
import { resumeListQueryOptions } from "@/data-access-layer/resume/resume-query-options";
import { useMutation, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { FileText } from "lucide-react";
import { NewResumeButton } from "./-components/NewResumeButton";
import { ResumeListCard } from "./-components/ResumeListCard";

export const Route = createFileRoute("/_dashboard/resumes/")({
  component: ResumeListPage,
  loader: ({ context }) => context.queryClient.ensureQueryData(resumeListQueryOptions),
  head: () => ({
    meta: [{ title: "Resumes", description: "Manage your resumes" }],
  }),
  ssr: false,
});

function ResumeListPage() {
  const { data: resumes } = useSuspenseQuery(resumeListQueryOptions);
  const cloneMutation = useMutation(cloneResumeMuationOptions);

  return (
    <div className="flex w-full min-h-screen flex-col gap-6" data-test="resume-list-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Resumes</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Create, edit and tailor your resumes for different roles.
          </p>
        </div>
        <NewResumeButton />
      </div>
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
