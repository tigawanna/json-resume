import { Button } from "@/components/ui/button";
import { ListPageHeader } from "@/components/wrappers/ListPageHeader";
import { resumeListQueryOptions } from "@/data-access-layer/resume/resume-query-options";
import { deleteResume } from "@/data-access-layer/resume/resume.functions";
import { useMutation, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { ResumeCard } from "./-components/ResumeCard";
import { ResumeEmptyState } from "./-components/ResumeEmptyState";

export const Route = createFileRoute("/_dashboard/resumes/")({
  component: ResumesListPage,
  head: () => ({
    meta: [{ title: "My Resumes", description: "Manage your tailored resumes" }],
  }),
});

function ResumesListPage() {
  const { data: resumes } = useSuspenseQuery(resumeListQueryOptions);

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteResume({ data: { id } }),
    onSuccess() {
      toast.success("Resume deleted");
    },
    onError(err: unknown) {
      toast.error("Failed to delete resume", {
        description: err instanceof Error ? err.message : "Unknown error",
      });
    },
    meta: { invalidates: [["resumes"]] },
  });

  if (resumes.length === 0) {
    return (
      <div className="flex flex-col gap-6" data-test="resumes-page">
        <ListPageHeader title="My Resumes" />
        <ResumeEmptyState />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6" data-test="resumes-page">
      <ListPageHeader
        title="My Resumes"
        formTrigger={
          <Button asChild size="sm">
            <Link to="/resumes/create">
              <Plus className="mr-2 size-4" />
              New resume
            </Link>
          </Button>
        }
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {resumes.map((r) => (
          <ResumeCard key={r.id} resume={r} onDelete={deleteMutation.mutate} />
        ))}
      </div>
    </div>
  );
}
