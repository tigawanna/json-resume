import { replaceResumeDoc } from "@/data-access-layer/resume/resume.functions";
import { resumeCollection } from "@/data-access-layer/resume/resumes-query-collection";
import { ResumeDocumentV1 } from "@/features/resume/resume-schema";
import { unwrapUnknownError } from "@/utils/errors";
import { eq, useLiveSuspenseQuery } from "@tanstack/react-db";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import { toast } from "sonner";
import { PromptCopySection } from "./PromptCopySection";

export function PromptTab({ resumeId, doc }: { resumeId: string; doc: ResumeDocumentV1 }) {
  const router = useRouter();
  const { data: resume } = useLiveSuspenseQuery((q) =>
    q
      .from({ resume: resumeCollection })
      .where(({ resume }) => eq(resume.id, resumeId))
      .findOne(),
  );

  const applyMutation = useMutation({
    mutationFn: async (newDoc: ResumeDocumentV1) => {
      await replaceResumeDoc({ data: { id: resumeId, doc: newDoc } });
    },
    onSuccess() {
      void resumeCollection.utils.refetch();
      toast.success("Resume updated — switching to editor");
      void router.navigate({
        to: ".",
        search: (prev) => ({ ...prev, tab: "edit" }),
        replace: true,
      });
    },
    onError(err: unknown) {
      toast.error("Failed to apply result", {
        description: unwrapUnknownError(err).message,
      });
    },
    meta: { invalidates: [["resumes"]] },
  });

  return (
    <div className="mx-auto max-w-3xl">
      <PromptCopySection
        doc={doc}
        jobDescription={resume?.jobDescription ?? ""}
        onApplyResult={(newDoc) => applyMutation.mutateAsync(newDoc)}
        isApplying={applyMutation.isPending}
      />
    </div>
  );
}
