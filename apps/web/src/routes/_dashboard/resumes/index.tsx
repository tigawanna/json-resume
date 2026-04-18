import { Button } from "@/components/ui/button";
import { resumeDetailToDocument } from "@/data-access-layer/resume/resume-converters";
import { resumeListQueryOptions } from "@/data-access-layer/resume/resume-query-options";
import { createResume, getResume } from "@/data-access-layer/resume/resume.functions";
import { createDefaultResume } from "@/features/resume/resume-schema";
import { unwrapUnknownError } from "@/utils/errors";
import { useMutation, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { FileText, Plus } from "lucide-react";
import { toast } from "sonner";
import { ResumeListCard } from "./-components/ResumeListCard";

export const Route = createFileRoute("/_dashboard/resumes/")({
  component: ResumeListPage,
  loader: ({ context }) => context.queryClient.ensureQueryData(resumeListQueryOptions),
  head: () => ({
    meta: [{ title: "Resumes", description: "Manage your resumes" }],
  }),
});

function ResumeListPage() {
  const { data: resumes } = useSuspenseQuery(resumeListQueryOptions);
  const navigate = useNavigate();

  const createMutation = useMutation({
    mutationFn: async () => {
      const doc = createDefaultResume();
      return createResume({
        data: {
          name: "Untitled Resume",
          description: "",
          jobDescription: "",
          doc,
        },
      });
    },
    onSuccess(result) {
      toast.success("Resume created");
      navigate({ to: "/resumes/$resumeId", params: { resumeId: result.id } });
    },
    onError(err: unknown) {
      toast.error("Failed to create resume", {
        description: unwrapUnknownError(err).message,
      });
    },
    meta: { invalidates: [["resumes"]] },
  });

  const cloneMutation = useMutation({
    mutationFn: async (sourceId: string) => {
      const source = await getResume({ data: { id: sourceId } });
      if (!source) throw new Error("Source resume not found");
      const doc = resumeDetailToDocument(source);
      return createResume({
        data: {
          name: `${source.name} (copy)`,
          description: source.description,
          jobDescription: source.jobDescription,
          doc,
        },
      });
    },
    onSuccess(result) {
      toast.success("Resume cloned");
      navigate({ to: "/resumes/$resumeId", params: { resumeId: result.id } });
    },
    onError(err: unknown) {
      toast.error("Failed to clone resume", {
        description: unwrapUnknownError(err).message,
      });
    },
    meta: { invalidates: [["resumes"]] },
  });

  return (
    <div className="flex w-full min-h-screen flex-col gap-6" data-test="resume-list-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Resumes</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Create, edit and tailor your resumes for different roles.
          </p>
        </div>
        <Button onClick={() => createMutation.mutate()} disabled={createMutation.isPending}>
          <Plus className="mr-2 size-4" />
          New Resume
        </Button>
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
