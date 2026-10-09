import { PromptCopySection } from "@/components/resume/PromptCopySection";
import { useResumeImport } from "@/components/resume/resume-import/use-resume-import";
import { useResumeWorkspace } from "@/components/resume/resume-workspace/ResumeWorkspaceContext";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import type { ResumeDocumentV1 } from "@/features/resume/resume-schema";
import { Info } from "lucide-react";

interface ResumePromptTabProps {
  doc: ResumeDocumentV1;
  jobDescription: string;
  onImported: () => void;
}

/** Copy a tailoring prompt for any external LLM, then paste its JSON back to reconcile it. */
export function ResumePromptTab({ doc, jobDescription, onImported }: ResumePromptTabProps) {
  const workspace = useResumeWorkspace();
  const { importDocument, isImporting, reviewDialog } = useResumeImport(workspace, {
    onApplied: onImported,
  });

  return (
    <div className="flex flex-col gap-4" data-test="resume-prompt-tab">
      {jobDescription.trim() ? null : (
        <Alert>
          <Info className="size-4" />
          <AlertTitle>No target job yet</AlertTitle>
          <AlertDescription>
            Link or paste a job in the Edit tab&apos;s Target job section to get a prompt tailored
            to it. You can still copy the prompt and add the job description yourself.
          </AlertDescription>
        </Alert>
      )}
      <PromptCopySection
        doc={doc}
        jobDescription={jobDescription}
        onApplyResult={importDocument}
        isApplying={isImporting}
      />
      {reviewDialog}
    </div>
  );
}
